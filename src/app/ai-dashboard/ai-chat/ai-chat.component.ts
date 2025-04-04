import { Component, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonAvatar, IonButton, IonButtons, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonProgressBar, IonSplitPane, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AIService, sendExtBackgroundMessage, UserRoleText } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { chatbubblesOutline, checkmark, checkmarkDoneCircle, clipboardOutline, close, cloudDoneOutline, colorWandOutline, createOutline, documentOutline, folderOutline, send, settingsOutline } from 'ionicons/icons';
import { AiProcessingService } from '../ai-processing.service';
import { BaseAiComponent } from '../base-ai.component';
import { SettingsComponent } from '../settings/settings.component';

@Component({
	selector: 'app-ai-chat',
	imports: [
		FormsModule,
		IonChip, IonFooter, IonAvatar, IonButtons, IonItem, IonList, IonContent,
		IonLabel, IonIcon, IonProgressBar, IonToolbar, IonTextarea, IonButton, IonSplitPane, IonMenu, IonHeader, IonTitle, SettingsComponent
	],
	providers: [AIService, AiProcessingService],
	templateUrl: './ai-chat.component.html',
	styleUrl: './ai-chat.component.scss',
})
export class AiChatComponent extends BaseAiComponent {
	private readonly aiservice = inject(AIService);

	private readonly contentRef = viewChild<IonContent>('myContent');
	message = signal('');
	messages = signal<UserRoleText[]>([]);

	constructor() {
		super();
		addIcons({ checkmark, checkmarkDoneCircle, close, colorWandOutline, createOutline, settingsOutline, cloudDoneOutline, documentOutline, folderOutline, send, chatbubblesOutline, clipboardOutline });
	}

	async sendMessage(event?: any): Promise<void> {
		event?.preventDefault();
		try {
			this.addUserMessage(this.message());
			this.isProcessing.set(true);

			const settings = this.settingsService.settings();
			const response = await this.aiservice.chat(
				this.messages(),
				settings,
				this.showAuthenticationAlert.bind(this)
			);

			this.aiProcessingService.processResponse(response, settings);
			this.message.set('');

			if (response.chat?.length > 0) {
				this.messages.set(response.chat);
			}
			setTimeout(() => this.contentRef()?.scrollToBottom(400));
		} catch (error) {
			console.error(error);
			this.addUserMessage((error as Error).message);
		} finally {
			this.isProcessing.set(false);
		}
	}

	async summarizeActivePage(isQueryActiveTab: boolean = false): Promise<void> {
		const activeTabsResponse = await sendExtBackgroundMessage('ChromeTabHelper', 'getAllTabs', {});
		const tabs = activeTabsResponse.output?.map((tab: any) => ({
			name: tab.id,
			value: { id: tab.id, url: tab.url, title: tab.title },
			label: tab.title,
			type: 'radio',
			checked: false,
		}));

		if (tabs.length === 1) {
			await this.processTab(tabs[0].value, isQueryActiveTab);
		} else if (tabs.length > 1) {
			const alert = await this.alertController.create({
				header: 'Select Tab',
				inputs: tabs,
				buttons: [
					{ text: 'Cancel', role: 'cancel' },
					{
						text: 'Ok',
						handler: (selectedVal) => {
							this.processTab(selectedVal, isQueryActiveTab);
						},
					},
				],
			});
			await alert.present();
		} else {
			this.addUserMessage('No active tabs');
		}
	}

	async processTab(selectedVal: any, isQueryActiveTab: boolean): Promise<void> {
		this.messages.set([]);
		const tabContent = await sendExtBackgroundMessage('ChromeTabHelper', 'getTabContent', { tabId: selectedVal.id });
		const message = this.message();
		let content = `If there is any #Question, please provide the answer to the question and then summarize the text below.
Analyze the text below and provide:

A detailed summary of the main ideas and supporting points.
A clear timeline of events, if applicable, in chronological order. The timeline should be presented as simple numbered or indented lines for readability, compatible with plain text formatting in Notepad.
Key highlights or important takeaways in a concise manner, using simple formatting like dashes or colons to separate items, avoiding Markdown or rich text styles.
Ensure the response uses plain text formatting compatible with Notepad for clear readability without advanced styling.

${message?.trim() ? `#Question: ${message}` : ''}


Text:${tabContent.output?.replace(/\n/g, ' ')}`;
		if (isQueryActiveTab) {
			content = `
#Query: ${message}
${tabContent.output?.replace(/\n/g, ' ')}
			`
		}
		this.message.set(content);
		setTimeout(() => {
			this.message.set('');
			this.messages.set([{ role: 'user', text: `Summarize active page and user query: ${message}`, date: new Date() }]);
		});
		await this.sendMessage();
		// only keep last message
		this.messages.set([this.messages()[this.messages().length - 1]]);
	}

	clearMessages(): void {
		this.messages.set([]);
	}

	private addUserMessage(text: string): void {
		this.messages.update(currentMessages => [...currentMessages, { role: 'user', text, date: new Date() }]);
	}
}
