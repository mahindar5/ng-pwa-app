import { Component, inject, input, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonButtons, IonCheckbox, IonCol, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonItemDivider, IonItemGroup, IonLabel, IonList, IonRange, IonRow, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AIService, AIServiceType, FileService, ProcessingStrategy, PromptItem, promptsArray, Settings } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { addCircle, cloudUploadOutline, downloadOutline, openOutline, removeCircle } from 'ionicons/icons';
import { SettingsService } from './settings.service';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss'],
	providers: [AIService, FileService],
	imports: [
		FormsModule, IonButton, IonButtons, IonRow, IonCol, IonItemDivider, IonItemGroup, IonIcon,
		IonCheckbox, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonRange, IonSelect, IonSelectOption, IonTitle, IonToolbar
	],
})
export class SettingsComponent {
	readonly availableFileExtensions: string[] = Object.keys(promptsArray);
	readonly processingStrategies = Object.values(ProcessingStrategy);
	private readonly settingsService = inject(SettingsService);
	private readonly router = inject(Router);

	isCompactView = input<boolean>(false);

	settings: WritableSignal<Settings> = this.settingsService.settings;

	constructor() {
		addIcons({ addCircle, removeCircle, openOutline, downloadOutline, cloudUploadOutline });
	}

	compareModels(a: { name: string; org: AIServiceType }, b: { name: string; org: AIServiceType }): boolean {
		return a.name === b.name && a.org === b.org;
	}

	addPrompt(prompt: PromptItem): void {
		this.settingsService.addPrompt(prompt);
	}

	removePrompt(prompt: PromptItem, index: number): void {
		this.settingsService.removePrompt(prompt, index);
	}

	saveSettings(): void {
		this.settingsService.saveSettings();
	}

	resetSettings(): void {
		this.settingsService.resetSettings();
	}

	openFullSettings(): void {
		this.router.navigate(['ai-dashboard/settings']);
	}

	comparePrompts(a: PromptItem, b: PromptItem): boolean {
		return a.name === b.name;
	}

	onPromptChange(): void {
		const settings = this.settings();
		this.settingsService.saveSettings({ ...settings, selectedPrompt: settings.selectedPrompt });
	}

	downloadSettings(): void {
		this.settingsService.downloadSettings();
	}

	async uploadSettings(): Promise<void> {
		await this.settingsService.selectAndValidateSettingsJsonFile();
	}
}
