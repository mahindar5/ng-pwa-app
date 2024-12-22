import { Component, inject, input, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonAccordion, IonAccordionGroup, IonButton, IonButtons, IonCheckbox, IonCol, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonRange, IonRow, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AIServiceType, ProcessingStrategy, PromptItem, Settings } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { addCircle, cloudUploadOutline, downloadOutline, openOutline, removeCircle } from 'ionicons/icons';
import { SettingsService } from './settings.service';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss'],
	imports: [
		FormsModule, IonButton, IonButtons, IonRow, IonCol, IonList, IonIcon, IonAccordion, IonAccordionGroup,
		IonCheckbox, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonRange, IonSelect, IonSelectOption, IonTitle, IonToolbar
	],
})
export class SettingsComponent {
	readonly processingStrategies = Object.values(ProcessingStrategy);
	readonly settingsService = inject(SettingsService);
	readonly router = inject(Router);

	isCompactView = input<boolean>(false);

	settings: WritableSignal<Settings> = this.settingsService.settings;
	expandedAccordion: string = '';

	constructor() {
		addIcons({ addCircle, removeCircle, openOutline, downloadOutline, cloudUploadOutline });
	}

	compareModels(a: { name: string; org: AIServiceType }, b: { name: string; org: AIServiceType }): boolean {
		return a.name === b.name && a.org === b.org;
	}

	comparePrompts(a: PromptItem, b: PromptItem): boolean {
		return a.name === b.name;
	}

	onPromptChange(): void {
		const settings = this.settings();
		this.settingsService.saveSettings({ ...settings, selectedPrompt: settings.selectedPrompt });
	}

	resetSettings(): void {
		this.settingsService.resetSettings();
	}
}
