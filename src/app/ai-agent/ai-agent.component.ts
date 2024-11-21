import { DatePipe } from '@angular/common';
import { Component, computed, ElementRef, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonAvatar, IonButton, IonButtons, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonMenuButton, IonProgressBar, IonSelect, IonSelectOption, IonText, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { DeviceResponse, FileItem, FileService, GithubCopilotModel, GithubCopilotService, prompts, RetryAfterResponseModel, UserRoleText } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, clipboardOutline, cloudDoneOutline, createOutline, documentOutline, folderOutline, send } from 'ionicons/icons';

@Component({
	selector: 'ai-agent-component',
	templateUrl: 'ai-agent.component.html',
	styleUrls: ['ai-agent.component.scss'],
	standalone: true,
	providers: [GithubCopilotService, FileService],
	imports: [
		FormsModule, IonHeader, IonProgressBar, IonToolbar, IonButtons, DatePipe, IonInput,
		IonMenuButton, IonTitle, IonButton, IonIcon, IonContent, IonFooter, IonAvatar, IonText,
		IonList, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption
	],
})
export class AIAgentComponent implements OnInit {
	private readonly githubCopilotService = inject(GithubCopilotService);
	private readonly fileService = inject(FileService);
	private readonly alertController = inject(AlertController);
	private readonly contentRef = viewChild<IonContent>('myContent');
	private readonly dropZoneRef = viewChild<ElementRef>('dropZone');
	prompts = signal(prompts);
	selectedPrompt = signal(prompts[0]);
	models = signal<GithubCopilotModel[]>([]);
	selectedModel = signal<GithubCopilotModel>({} as GithubCopilotModel);
	allFileHandles = signal<FileItem[]>([]);
	fileList = computed(() => this.fileService.updateFileList(this.selectedPrompt().name, this.allFileHandles()));
	isProcessing = signal(false);

	message = signal('');
	messages = signal<UserRoleText[]>([]);
	toggleChat = signal(true);

	constructor() {
		addIcons({ createOutline, cloudDoneOutline, documentOutline, folderOutline, send, chatbubblesOutline, clipboardOutline });
	}

	ngOnInit(): void {
		this.loadModels();
	}

	private loadModels(): void {
		const loadedModels = this.githubCopilotService.loadModels();
		this.models.set(loadedModels);
		this.selectedModel.set(loadedModels.find(m => !m.disabled) || loadedModels[0]);
	}

	private async showAuthenticationAlert(data: DeviceResponse): Promise<boolean> {
		const { user_code, verification_uri, expires_in } = data;
		const expirationTime = new Date(Date.now() + expires_in * 1000).toLocaleString();
		const message = `Please visit ${verification_uri} and enter code ${user_code} to authenticate. Code expires at ${expirationTime}.`;

		const alert = await this.alertController.create({
			header: 'Authentication',
			message,
			buttons: [
				{ text: `Copy Code (${user_code})`, handler: () => { navigator.clipboard.writeText(user_code); return false; } },
				{ text: 'Open Browser', handler: () => { window.open(verification_uri, '_blank'); return false; } },
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
			for (const fileItem of this.fileList()) {
				try {
					const file = await fileItem.handle.getFile();
					const content = await file.text();
					const fileExt = fileItem.path.split('.').pop()!;
					this.selectedPrompt.set(prompts.find(p => p.name === fileExt) || prompts[0]);
					const finalPrompt = `${this.selectedPrompt().prompt}\n\nCode for ${fileItem.handle.name}\n\n${content}`;

					fileItem.status = 'inprogress';
					let response = await this.githubCopilotService.message(
						finalPrompt,
						this.selectedModel(),
						this.showAuthenticationAlert.bind(this)
					);

					this.handleRateLimitResponse(response);

					fileItem.res = this.fileService.extractCode(response as string); fileItem.status = 'done';
					await this.fileService.writeToFile(fileItem);
				} catch (error) {
					console.error(error);
					fileItem.status = 'error';
					fileItem.res = (error as Error).message;
				}
			}
		} finally {
			this.isProcessing.set(false);
		}
	}

	private handleRateLimitResponse(response: string | UserRoleText[] | RetryAfterResponseModel) {
		if (typeof response === 'object' && 'retryAfter' in response) {
			const model = this.models().find(m => m.name === this.selectedModel().name);
			if (model) {
				model.retryAfter = response.retryAfter;
				model.retryAfterCreatedAt = new Date().toISOString();
				localStorage.setItem('models', JSON.stringify(this.models()));
				this.loadModels();
			}
			throw new Error('Rate limit exceeded. Please try again later.');
		}
	}

	handleDrag(event: DragEvent, action: 'over' | 'leave'): void {
		event.preventDefault();
		this.dropZoneRef()?.nativeElement.classList[action === 'over' ? 'add' : 'remove']('drag-over');
	}

	async onDrop(event: DragEvent): Promise<void> {
		event.preventDefault();
		this.handleDrag(event, 'leave');
		this.allFileHandles.set(await this.fileService.handleDrop(event));
	}

	async selectFolder(): Promise<void> {
		this.allFileHandles.set(await this.fileService.selectFolder());
	}

	async selectFiles(): Promise<void> {
		this.allFileHandles.set(await this.fileService.selectFiles());
	}


	async sendMessage() {
		try {
			this.messages.set([...this.messages(), {
				role: 'user',
				text: this.message(),
				date: new Date(),
			}]);
			this.isProcessing.set(true);

			const response = await this.githubCopilotService.chat(this.messages(), this.selectedModel(), this.showAuthenticationAlert.bind(this));
			this.handleRateLimitResponse(response);

			this.message.set('');
			this.messages.set(response as UserRoleText[]);
			setTimeout(() => this.contentRef()?.scrollToBottom(400), 100);
		} catch (error) {
			console.error(error);
			this.messages.set([...this.messages(), {
				text: (error as Error).message,
				date: new Date(),
				role: 'model',
			}]);
		}
		this.isProcessing.set(false);
	}
}
