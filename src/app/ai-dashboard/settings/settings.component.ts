import { Component, inject, OnInit, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonCheckbox, IonCol, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonItemDivider, IonItemGroup, IonLabel, IonList, IonRange, IonRow, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { ProcessingStrategy, PromptItem, promptsArray, Settings } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { addCircle, removeCircle } from 'ionicons/icons';
import { SettingsService } from './settings.service';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss'],
	standalone: true,
	imports: [
		FormsModule, IonButton, IonButtons, IonRow, IonCol, IonItemDivider, IonItemGroup, IonIcon,
		IonCheckbox, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonRange, IonSelect, IonSelectOption, IonTitle, IonToolbar
	],
})
export class SettingsComponent implements OnInit {
	readonly availableFileExtensions: string[] = Object.keys(promptsArray);
	readonly processingStrategies = Object.values(ProcessingStrategy);
	private readonly settingsService = inject(SettingsService);

	settings: Signal<Settings> = this.settingsService.settings;

	constructor() {
		addIcons({ addCircle, removeCircle });
	}

	ngOnInit(): void {
		// No initialization logic needed
	}

	addPrompt(prompt: PromptItem): void {
		this.settingsService.addPrompt(prompt);
		this.saveSettings();
	}

	removePrompt(prompt: PromptItem, index: number): void {
		this.settingsService.removePrompt(prompt, index);
		this.saveSettings();
	}

	saveSettings(): void {
		this.settingsService.saveSettings();
	}
}
