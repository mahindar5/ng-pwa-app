import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonButtons, IonCheckbox, IonCol, IonContent, IonFooter, IonHeader, IonIcon, IonInput, IonItem, IonItemDivider, IonItemGroup, IonLabel, IonList, IonListHeader, IonRange, IonRow, IonSelect, IonSelectOption, IonTitle, IonToolbar, ModalController } from '@ionic/angular/standalone';
import { promptsArray } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { addCircle, removeCircle } from 'ionicons/icons';

@Component({
	selector: 'app-settings',
	templateUrl: './settings.component.html',
	styleUrls: ['./settings.component.scss'],
	standalone: true,
	imports: [
		FormsModule, IonButton, IonButtons, IonFooter, IonRow, IonCol, IonItemDivider, IonItemGroup, IonIcon,
		IonCheckbox, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonListHeader, IonRange, IonSelect, IonSelectOption, IonTitle, IonToolbar
	],
})
export class SettingsComponent {
	readonly availableModels: string[] = ['gpt-3', 'gpt-4', 'davinci', 'curie'];
	readonly availableFileExtensions: string[] = Object.keys(promptsArray);

	private readonly modalController = inject(ModalController);

	modalDataSignal = signal<ModalData>({
		temperature: 0,
		topP: 1,
		n: 1,
		model: 'gpt-3',
		fileExtensions: ['ts', 'html'],
		prompts: promptsArray,
		systemRole: 'assistant',
	});

	constructor() {
		addIcons({ addCircle, removeCircle });
	}

	updateTemperature(event: CustomEvent): void {
		this.modalDataSignal.update(state => ({ ...state, temperature: event.detail }));
	}

	updateTopP(event: CustomEvent): void {
		this.modalDataSignal.update(state => ({ ...state, topP: event.detail }));
	}

	updateN(event: Event): void {
		const value = Number((event.target as HTMLInputElement).value);
		this.modalDataSignal.update(state => ({ ...state, n: value }));
	}

	updateModel(event: CustomEvent): void {
		this.modalDataSignal.update(state => ({ ...state, model: event.detail }));
	}

	updatePromptSelected(extension: string, index: number, event: CustomEvent): void {
		this.modalDataSignal.update(state => ({
			...state,
			prompts: {
				...state.prompts,
				[extension]: state.prompts[extension].map((prompt, idx) =>
					idx === index ? { ...prompt, selected: event.detail } : prompt
				),
			},
		}));
	}

	updatePromptText(extension: string, index: number, event: Event): void {
		const text = (event.target as HTMLInputElement).value;
		this.modalDataSignal.update(state => ({
			...state,
			prompts: {
				...state.prompts,
				[extension]: state.prompts[extension].map((prompt, idx) =>
					idx === index ? { ...prompt, text } : prompt
				),
			},
		}));
	}

	updateSystemRole(event: Event): void {
		const role = (event.target as HTMLInputElement).value;
		this.modalDataSignal.update(state => ({ ...state, systemRole: role }));
	}

	addPrompt(extension: string): void {
		this.modalDataSignal.update(state => ({
			...state,
			prompts: {
				...state.prompts,
				[extension]: [...state.prompts[extension], { text: '', selected: false }],
			},
		}));
	}

	removePrompt(extension: string, index: number): void {
		this.modalDataSignal.update(state => ({
			...state,
			prompts: {
				...state.prompts,
				[extension]: state.prompts[extension].filter((_, idx) => idx !== index),
			},
		}));
	}

	updateFileExtensions(selectedExtensions: string[]): void {
		const newPrompts = selectedExtensions.reduce<Record<string, Prompt[]>>((acc, ext) => {
			acc[ext] = acc[ext] || this.modalDataSignal().prompts[ext] || [];
			return acc;
		}, {});
		this.modalDataSignal.update(state => ({
			...state,
			fileExtensions: selectedExtensions,
			prompts: newPrompts,
		}));
	}

	closeModal(): void {
		this.modalController.dismiss(this.modalDataSignal());
	}
}

interface ModalData {
	temperature: number;
	topP: number;
	n: number;
	model: string;
	fileExtensions: string[];
	prompts: Record<string, Prompt[]>;
	systemRole: string;
}

interface Prompt {
	text: string;
	selected: boolean;
}
