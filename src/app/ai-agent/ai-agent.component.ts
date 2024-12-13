import { DatePipe } from '@angular/common';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonAvatar, IonButton, IonButtons, IonCheckbox, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonMenuButton, IonProgressBar, IonSelect, IonSelectOption, IonText, IonTextarea, IonTitle, IonToolbar, ModalController } from '@ionic/angular/standalone';
import { AIModel, AIResponse, AIService, DeviceResponse, FileItem, FileService, prompts, sendExtBackgroundMessage, UserRoleText } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, checkmark, checkmarkDoneCircle, clipboardOutline, close, cloudDoneOutline, colorWandOutline, createOutline, documentOutline, folderOutline, send, settingsOutline } from 'ionicons/icons';
import { AiProcessingService, ProcessingStrategy } from './ai-processing.service';

@Component({
	selector: 'ai-agent-component',
	templateUrl: 'ai-agent.component.html',
	styleUrls: ['ai-agent.component.scss'],
	standalone: true,
	providers: [AIService, FileService, AiProcessingService],
	imports: [
		FormsModule, IonHeader, IonCheckbox, IonProgressBar, IonToolbar, IonButtons, DatePipe, IonInput, IonChip,
		IonMenuButton, IonTitle, IonButton, IonIcon, IonContent, IonFooter, IonAvatar, IonText,
		IonList, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption
	],
})
export class AIAgentComponent implements OnInit {
	private readonly aiservice = inject(AIService);
	private readonly fileService = inject(FileService);
	private readonly alertController = inject(AlertController);
	private readonly modalController = inject(ModalController);
	private readonly aiProcessingService = inject(AiProcessingService);
	private readonly contentRef = viewChild<IonContent>('myContent');
	private readonly dropZoneRef = viewChild<ElementRef>('dropZone');
	prompts = signal(prompts);
	selectedPrompt = signal(prompts.find(p => p.name === 'all') || prompts[0]);
	models = signal<AIModel[]>([]);
	selectedModel = signal<AIModel>({} as AIModel);
	allFileHandles = signal<FileItem[]>([]);
	fileList = computed(() => this.fileService.updateFileList(this.selectedPrompt().name, this.allFileHandles()));
	isProcessing = signal(false);

	message = signal('');
	messages = signal<UserRoleText[]>([]);
	toggleChat = signal(false);

	processingStrategies = Object.values(ProcessingStrategy);
	selectedStrategy = signal<ProcessingStrategy>(ProcessingStrategy.Individual);
	multiSelectMode = computed(() => this.selectedStrategy() === ProcessingStrategy.Combined);

	constructor() {
		addIcons({ checkmark, checkmarkDoneCircle, close, colorWandOutline, createOutline, settingsOutline, cloudDoneOutline, documentOutline, folderOutline, send, chatbubblesOutline, clipboardOutline });
	}

	ngOnInit(): void {
		this.initializeModels();
	}

	private initializeModels(): void {
		const loadedModels = this.aiservice.loadModels();
		this.models.set(loadedModels);
		this.selectedModel.set(loadedModels.find(m => !m.disabled) || loadedModels[0]);
	}

	private async showAuthenticationAlert(response: DeviceResponse): Promise<boolean> {
		const { user_code, verification_uri, expires_in } = response;
		const expirationTime = new Date(Date.now() + expires_in * 1000).toLocaleString();
		const message = `Please visit ${verification_uri} and enter code ${user_code} to authenticate. Code expires at ${expirationTime}.`;

		const alert = await this.alertController.create({
			header: 'Authentication',
			message,
			buttons: [
				{ text: `Copy (${user_code}) & Authenticate`, handler: () => { navigator.clipboard.writeText(user_code).then(() => window.open(verification_uri, '_blank')); return false; } },
				{ text: 'Cancel', role: 'cancel' },
				{ text: 'Completed', role: 'ok' },
			]
		});
		await alert.present();
		const { role } = await alert.onDidDismiss();
		return role === 'ok';
	}

	onStrategyChange(event: CustomEvent): void {
		this.selectedStrategy.set(event.detail.value);
		this.aiProcessingService.setProcessingStrategy(this.selectedStrategy());
	}

	async processFiles(): Promise<void> {
		this.isProcessing.set(true);
		try {
			const fileItemsToProcess = this.selectedStrategy() === ProcessingStrategy.Combined
				? this.fileList().filter(item => item.selected)
				: this.fileList();

			if (fileItemsToProcess.length === 0) {
				this.addUserMessage('No files selected');
				return;
			}

			await this.aiProcessingService.processFiles(
				fileItemsToProcess,
				this.selectedPrompt().prompt,
				this.selectedModel(),
				this.showAuthenticationAlert.bind(this),
				this.updateFileItemObject.bind(this),
				this.processResponse.bind(this)
			);
		} finally {
			this.isProcessing.set(false);
		}
	}

	selectAll() {
		this.allFileHandles.update((items) => items.map(item => ({ ...item, selected: true })));
	}

	private processResponse(response: AIResponse): void {
		if (response.retryAfter) {
			const model = this.models().find(m => m.name === this.selectedModel().name);
			if (model) {
				model.retryAfter = response.retryAfter.retryAfter;
				model.retryAfterCreatedAt = new Date().toISOString();
				localStorage.setItem('models', JSON.stringify(this.models()));
				this.initializeModels();
			}
			throw new Error('Rate limit exceeded. Please try again later.');
		}
		if (response.chat) {
			this.messages.set(response.chat);
		}
		if (response.message) {
			this.addUserMessage(response.message);
		}
	}

	handleDrag(event: DragEvent, action: 'add' | 'remove'): void {
		event.preventDefault();
		this.dropZoneRef()?.nativeElement.classList[action]('drag-over');
	}

	async onDrop(event: DragEvent): Promise<void> {
		event.preventDefault();
		this.handleDrag(event, 'remove');
		this.allFileHandles.set(await this.fileService.handleDrop(event));
	}

	async selectFolder(): Promise<void> {
		this.allFileHandles.set(await this.fileService.selectFolder());
	}

	async selectFiles(): Promise<void> {
		this.allFileHandles.set(await this.fileService.selectFiles());
	}

	async sendMessage(): Promise<void> {
		try {
			this.addUserMessage(this.message());
			this.isProcessing.set(true);

			const response = await this.aiservice.chat(
				this.messages(),
				this.selectedModel(),
				this.showAuthenticationAlert.bind(this)
			);

			this.processResponse(response);
			this.message.set('');
			this.contentRef()?.scrollToBottom(400)
		} catch (error) {
			console.error(error);
			this.addUserMessage((error as Error).message);
		} finally {
			this.isProcessing.set(false);
		}
	}
	async summarizeActivePage(): Promise<void> {
		const getActiveTabs = await sendExtBackgroundMessage('ChromeTabHelper', 'getAllTabs', {});
		const tabs = getActiveTabs.output?.map((tab: any) => ({
			name: tab.id,
			value: { id: tab.id, url: tab.url, title: tab.title },
			label: tab.title,
			type: 'radio',
			checked: false,
		}));

		if (tabs.length === 1) {
			await this.processTab(tabs[0].value);
		} else if (tabs.length > 1) {
			const alert = await this.alertController.create({
				header: 'Select Tab',
				inputs: tabs,
				buttons: [
					{ text: 'Cancel', role: 'cancel' },
					{
						text: 'Ok',
						handler: selectedVal => {
							this.processTab(selectedVal);
						},
					},
				],
			});
			await alert.present();
		} else {
			this.addUserMessage('No active tabs');
		}
	}

	async processTab(selectedVal: any): Promise<void> {
		this.messages.set([]);
		const tabContent = await sendExtBackgroundMessage('ChromeTabHelper', 'getTabContent', { tabId: selectedVal.id })
		const content = `Analyze the text below and provide:

A detailed summary of the main ideas and supporting points.
A clear timeline of events, if applicable, in chronological order. The timeline should be presented as simple numbered or indented lines for readability, compatible with plain text formatting in Notepad.
Key highlights or important takeaways in a concise manner, using simple formatting like dashes or colons to separate items, avoiding Markdown or rich text styles.
Ensure the response uses plain text formatting compatible with Notepad for clear readability without advanced styling.
Text:${tabContent.output?.replace(/\n/g, ' ')}`;
		this.message.set(content);
		setTimeout(() => {
			this.message.set('');
			this.messages.set([{ role: 'user', text: 'Summarize active page', date: new Date() }]);
		});
		await this.sendMessage();
		// only keep last message
		this.messages.set([this.messages()[this.messages().length - 1]]);
	}

	clearMessages(): void {
		this.messages.set([]);
	}

	private addUserMessage(text: string): void {
		this.messages.set([...this.messages(), { role: 'user', text, date: new Date() }]);
	}

	private updateFileItemObject(fileItem: FileItem, status: 'inprogress' | 'done' | 'error', res: string): void {
		this.allFileHandles.update((items) => items.map(item => item.path === fileItem.path ? { ...item, status, res } : item));
	}
}
