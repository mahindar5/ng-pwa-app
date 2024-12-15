import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonButton, IonButtons, IonCheckbox, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonProgressBar, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, checkmark, checkmarkDoneCircle, clipboardOutline, close, cloudDoneOutline, colorWandOutline, createOutline, documentOutline, folderOutline, send, settingsOutline } from 'ionicons/icons';
import { AIModel, AIResponse, AIService, DeviceResponse, FileItem, FileService, prompts, UserRoleText } from '../../../../../common-lib/dist';
import { AiProcessingService, ProcessingStrategy } from '../ai-processing.service';

@Component({
	selector: 'app-ai-agent',
	templateUrl: './ai-agent.component.html',
	styleUrl: './ai-agent.component.scss',
	providers: [AIService, FileService, AiProcessingService],
	imports: [
		FormsModule, IonHeader, IonCheckbox, IonProgressBar, IonToolbar,
		IonTitle, IonButton, IonIcon, IonContent,
		IonList, IonItem, IonLabel, IonTextarea,
		IonButtons, IonSelectOption, IonSelect, IonMenuButton
	],
})
export class AiAgentComponent {

	private readonly aiservice = inject(AIService);
	private readonly fileService = inject(FileService);
	private readonly alertController = inject(AlertController);
	private readonly aiProcessingService = inject(AiProcessingService);
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

	private initializeModels(): void {
		const loadedModels = this.aiservice.loadModels();
		this.models.set(loadedModels);
		this.selectedModel.set(loadedModels.find(m => !m.disabled) || loadedModels[0]);
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


	onStrategyChange(event: CustomEvent): void {
		this.selectedStrategy.set(event.detail.value);
		this.aiProcessingService.setProcessingStrategy(this.selectedStrategy());
	}
	selectAll() {
		this.allFileHandles.update((items) => items.map(item => ({ ...item, selected: true })));
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

	private addUserMessage(text: string): void {
		this.messages.set([...this.messages(), { role: 'user', text, date: new Date() }]);
	}
	private updateFileItemObject(fileItem: FileItem, status: 'inprogress' | 'done' | 'error', res: string): void {
		this.allFileHandles.update((items) => items.map(item => item.path === fileItem.path ? { ...item, status, res } : item));
	}
}
