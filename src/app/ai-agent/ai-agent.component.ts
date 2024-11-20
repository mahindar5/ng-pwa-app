import { Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenuButton, IonProgressBar, IonSelect, IonSelectOption, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { DeviceResponse, FileItem, FileService, GithubCopilotModel, GithubCopilotService, prompts } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { cloudDoneOutline, createOutline, documentOutline, folderOutline, send } from 'ionicons/icons';

@Component({
	selector: 'ai-agent-component',
	templateUrl: 'ai-agent.component.html',
	styleUrls: ['ai-agent.component.scss'],
	standalone: true,
	providers: [GithubCopilotService, FileService],
	imports: [
		FormsModule, IonHeader, IonProgressBar, IonToolbar, IonButtons, IonMenuButton, IonTitle,
		IonButton, IonIcon, IonContent, IonList, IonItem, IonLabel, IonTextarea, IonSelect, IonSelectOption
	],
})
export class AIAgentComponent implements OnInit {
	private readonly githubCopilotService = inject(GithubCopilotService);
	private readonly fileService = inject(FileService);
	private readonly alertController = inject(AlertController);

	isProcessing = signal(false);
	contentRef = viewChild<IonContent>('myContent');
	dropZoneRef = viewChild<ElementRef>('dropZone');
	selectedPrompt = signal(prompts[0]);
	prompts = signal(prompts);
	models = signal<GithubCopilotModel[]>([]);
	selectedModel = signal<GithubCopilotModel>(this.models()[0]);
	allFileHandles = signal<FileItem[]>([]);
	fileList = computed(() => this.fileService.updateFileList(this.selectedPrompt().name, this.allFileHandles()));

	constructor() {
		addIcons({ createOutline, cloudDoneOutline, documentOutline, folderOutline, send });
	}

	ngOnInit(): void {
		this.loadModels();
	}

	private loadModels(): void {
		const models = this.githubCopilotService.loadModels();
		this.models.set(models);
		this.selectedModel.set(models.find(m => !m.disabled) || models[0]);
	}

	private async showAuthenticationAlert(data: DeviceResponse): Promise<void> {
		const { user_code, verification_uri, expires_in } = data;
		const expirationTime = new Date(Date.now() + expires_in * 1000).toLocaleString();
		const message = `Please visit ${verification_uri} and enter code ${user_code} to authenticate. Code expires at ${expirationTime}.`;

		return new Promise<void>(async (resolve) => {
			const alert = await this.alertController.create({
				header: 'Authentication',
				message,
				buttons: [
					{ text: 'Completed', handler: () => resolve() },
					{ text: 'Cancel', role: 'cancel' },
					{ text: 'Copy Code', handler: () => { navigator.clipboard.writeText(user_code); return false; } },
					{ text: 'Open Browser', handler: () => { window.open(verification_uri, '_blank'); return false; } }
				]
			});
			await alert.present();
			await alert.onDidDismiss();
		});
	}

	async processFiles(): Promise<void> {
		this.isProcessing.set(true);
		try {
			for (const fileItem of this.fileList()) {
				try {
					const file = await fileItem.handle.getFile();
					const content = await file.text();
					const fileExt = fileItem.path.split('.').pop();
					this.selectedPrompt.set(prompts.find(p => p.name === fileExt) || prompts[0]);
					const finalPrompt = `${this.selectedPrompt().prompt}\n\nCode for ${fileItem.handle.name}\n\n${content}`;
					fileItem.status = 'inprogress';
					let response = await this.githubCopilotService.chat(finalPrompt, this.selectedModel().name, this.showAuthenticationAlert.bind(this));
					if (response.status === 429) {
						const model = this.models().find(m => m.name === this.selectedModel().name);
						if (model) {
							model.retryAfter = response.retryAfter;
							model.retryAfterCreatedAt = new Date().toISOString();
							localStorage.setItem('models', JSON.stringify(this.models()));
							this.loadModels();
						}
						throw new Error('Rate limit exceeded. Please try again later.');
					}
					response = this.fileService.extractCode(response);
					fileItem.status = 'done';
					fileItem.res = response;
					await this.fileService.writeToFile(fileItem);
				} catch (error: unknown) {
					console.error(error);
					fileItem.status = 'error';
					fileItem.res = (error as Error).message;
				}
			}
		} finally {
			this.isProcessing.set(false);
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
}
