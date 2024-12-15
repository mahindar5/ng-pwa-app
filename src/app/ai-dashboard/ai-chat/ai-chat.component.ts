import { DatePipe } from '@angular/common';
import { Component, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonAvatar, IonButton, IonButtons, IonChip, IonContent, IonFooter, IonIcon, IonInput, IonItem, IonLabel, IonList, IonMenuButton, IonProgressBar, IonSelect, IonSelectOption, IonText, IonTextarea, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, checkmark, checkmarkDoneCircle, clipboardOutline, close, cloudDoneOutline, colorWandOutline, createOutline, documentOutline, folderOutline, send, settingsOutline } from 'ionicons/icons';
import { AIModel, AIResponse, AIService, DeviceResponse, sendExtBackgroundMessage, UserRoleText } from '../../../../../common-lib/dist';

@Component({
	selector: 'app-ai-chat',
	imports: [
		FormsModule,
		IonChip, IonFooter, IonAvatar, IonButtons, IonItem, IonList, IonContent,
		IonLabel, IonIcon, IonProgressBar, IonToolbar, IonTextarea, IonButton,
		IonMenuButton, DatePipe, IonInput, IonText, IonSelect, IonSelectOption
	],
	templateUrl: './ai-chat.component.html',
	styleUrl: './ai-chat.component.scss'
})
export class AiChatComponent {

	private readonly aiservice = inject(AIService);
	private readonly contentRef = viewChild<IonContent>('myContent');
	private readonly alertController = inject(AlertController);
	message = signal('');
	messages = signal<UserRoleText[]>([]);
	isProcessing = signal(false);
	selectedModel = signal<AIModel>({} as AIModel);
	models = signal<AIModel[]>([]);

	constructor() {
		addIcons({ checkmark, checkmarkDoneCircle, close, colorWandOutline, createOutline, settingsOutline, cloudDoneOutline, documentOutline, folderOutline, send, chatbubblesOutline, clipboardOutline });
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

			if (response.chat?.length > 0) {
				this.messages.set(response.chat);
			}
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
}
