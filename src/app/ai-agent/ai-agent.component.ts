import { DatePipe } from '@angular/common';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonAvatar, IonButton, IonButtons, IonCheckbox, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonMenuButton, IonProgressBar, IonSelect, IonSelectOption, IonText, IonTextarea, IonTitle, IonToolbar, ModalController } from '@ionic/angular/standalone';
import { AIModel, AIResponse, AIService, DeviceResponse, FileItem, FileService, prompts, sendExtBackgroundMessage, UserRoleText } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, checkmark, checkmarkDoneCircle, clipboardOutline, close, cloudDoneOutline, colorWandOutline, createOutline, documentOutline, folderOutline, send, settingsOutline } from 'ionicons/icons';
import { SettingsComponent } from './settings/settings/settings.component';
@Component({
	selector: 'ai-agent-component',
	templateUrl: 'ai-agent.component.html',
	styleUrls: ['ai-agent.component.scss'],
	standalone: true,
	providers: [AIService, FileService],
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
	private readonly contentRef = viewChild<IonContent>('myContent');
	private readonly dropZoneRef = viewChild<ElementRef>('dropZone');
	prompts = signal(prompts);
	selectedPrompt = signal(prompts.find(p => p.name === 'all') || prompts[0]);
	models = signal<AIModel[]>([]);
	selectedModel = signal<AIModel>({} as AIModel);
	allFileHandles = signal<FileItem[]>([]);
	fileList = computed(() => this.fileService.updateFileList(this.selectedPrompt().name, this.allFileHandles()));
	isProcessing = signal(false);
	multiSelectMode = signal(false);

	message = signal('');
	messages = signal<UserRoleText[]>([]);
	toggleChat = signal(false);

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

	async processFiles(): Promise<void> {
		this.isProcessing.set(true);
		try {

			if (this.multiSelectMode()) {
				this.processMultipleFiles();
			} else {
				for (const fileItem of this.fileList()) {
					await this.handleFileProcessing(fileItem);
				}
			}
		} finally {
			this.isProcessing.set(false);
		}
	}

	private async processMultipleFiles(): Promise<void> {
		const fileItems = this.fileList().filter(item => item.selected);
		if (fileItems.length === 0) {
			this.addUserMessage('No files selected');
		} else {
			try {
				let filesText = '';
				for await (const fileItem of fileItems) {
					const file = await fileItem.handle.getFile();
					const content = await file.text();
					filesText += `#FILE:${fileItem.path}
\`\`\`
${content}
\`\`\`
#END_FILE\n\n`;
					this.updateFileItemObject(fileItem, 'inprogress', '');
				}
				const prompt = prompts.find(p => p.name === 'all');
				if (!prompt) {
					throw new Error('Prompt not found');
				}
				this.selectedPrompt.set(prompt);
				const finalPrompt = `${prompt.prompt}\n\n${filesText}`;
				const response = await this.aiservice.message(
					finalPrompt,
					this.selectedModel(),
					this.showAuthenticationAlert.bind(this)
				);
				this.processResponse(response);
				const message = response.message;

				const fileRegex = /#FILE:(.+?)\n([\s\S]*?)#END_FILE/g;
				let match;

				while ((match = fileRegex.exec(message)) !== null) {
					const filename = match[1].trim();
					const content = match[2].trim();
					const fileItem = fileItems.find(item => item.path === filename);
					if (fileItem) {
						fileItem.res = this.fileService.extractCode(content);
						this.updateFileItemObject(fileItem, 'done', fileItem.res);
						this.fileService.writeToFile(fileItem);
					} else {
						// create the file
						const directory = filename.split('/').slice(0, -1).join('/');
						const directoryHandle = fileItems.find(item => item.path.includes(directory))?.directoryHandle;
						if (directoryHandle) {
							const newFileHandle = await directoryHandle.getFileHandle(filename.split('/').pop()!, { create: true });
							const writable = await newFileHandle.createWritable();
							await writable.write(content);
							await writable.close();
							console.log(`File created for ${filename}`);
						} else {
							console.error(`Directory not found for ${filename}`);
						}
					}
				}
				console.log(message);
			}
			catch (error) {
				console.error(error);
				this.updateFileItemObject(fileItems[0], 'error', (error as Error).message);
			}
		}
	}

	private async handleFileProcessing(fileItem: FileItem): Promise<void> {
		try {
			const file = await fileItem.handle.getFile();
			const content = await file.text();
			const fileExt = fileItem.path.split('.').pop()!;
			const prompt = prompts.find(p => p.name === fileExt) || prompts[0];
			this.selectedPrompt.set(prompt);
			const finalPrompt = `${prompt.prompt}\n\nCode for ${fileItem.handle.name}\n\n${content}`;

			this.updateFileItemObject(fileItem, 'inprogress', '');
			const response = await this.aiservice.message(
				finalPrompt,
				this.selectedModel(),
				this.showAuthenticationAlert.bind(this)
			);

			this.processResponse(response);
			const message = response.message;
			fileItem.res = this.fileService.extractCode(message);
			this.updateFileItemObject(fileItem, 'done', fileItem.res);
			this.fileService.writeToFile(fileItem);
		} catch (error) {
			console.error(error);
			this.updateFileItemObject(fileItem, 'error', (error as Error).message);
		}
	}

	private updateFileItemObject(fileItem: FileItem, status: 'inprogress' | 'done' | 'error', res: string): void {
		this.allFileHandles.update((items) => items.map(item => item.path === fileItem.path ? { ...item, status, res } : item));
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
			this.messages.set(response.chat);
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

	private addUserMessage(text: string): void {
		this.messages.set([...this.messages(), { role: 'user', text, date: new Date() }]);
	}
	async openAiConfigModal() {
		const modal = await this.modalController.create({
			component: SettingsComponent,
			cssClass: 'full-screen-modal',
		});

		await modal.present();
		const { data } = await modal.onWillDismiss();
		console.log(data);
	}
}
