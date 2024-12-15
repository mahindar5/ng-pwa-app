import { Injectable, signal } from '@angular/core';
import { AIModel, ProcessingStrategy, PromptItem, promptsArray, Settings } from '@mahindar5/common-lib';

@Injectable({
	providedIn: 'root'
})
export class SettingsService {
	readonly availableFileExtensions: string[] = Object.keys(promptsArray);

	private defaultSettings: Settings = {
		temperature: 0,
		topP: 1,
		n: 1,
		model: 'gpt-3',
		// fileExtensions: ['ts', 'html'],
		prompts: promptsArray,
		systemRole: 'assistant',
		models: [],
		processingStrategy: ProcessingStrategy.Combined
	};
	settings = signal<Settings>({} as Settings);

	constructor() {
		this.loadSettings();
	}

	private loadSettings(): void {
		const savedSettings = localStorage.getItem('settings');
		const loadedModels = JSON.parse(localStorage.getItem('models') || '[]');
		this.defaultSettings.models = loadedModels;
		this.defaultSettings.model = loadedModels.find((m: AIModel) => !m.disabled)?.name || 'gpt-3';

		if (savedSettings) {
			const settings = JSON.parse(savedSettings);
			Object.keys(this.defaultSettings).forEach(key => {
				if (!(key in settings)) {
					settings[key as keyof Settings] = this.defaultSettings[key as keyof Settings];
				}
			});
			this.settings.set(settings);
		} else {
			this.settings.set(this.defaultSettings);
		}
	}

	saveSettings(): void {
		const updatedSettings = this.settings();
		localStorage.setItem('settings', JSON.stringify(updatedSettings));
		localStorage.setItem('models', JSON.stringify(updatedSettings.models));
	}

	addPrompt(prompt: PromptItem) {
		const updatedSettings = this.settings();
		const promptItem = updatedSettings.prompts.find(p => p.name === prompt.name);
		if (!promptItem) {
			throw new Error('Prompt not found');
		}
		promptItem.promptTextList.push({ text: '', selected: false });
		this.settings.set(updatedSettings);
	}

	removePrompt(prompt: PromptItem, index: number) {
		const updatedSettings = this.settings();
		const promptItem = updatedSettings.prompts.find(p => p.name === prompt.name);
		if (!promptItem) {
			throw new Error('Prompt not found');
		}
		promptItem.promptTextList.splice(index, 1);
		this.settings.set(updatedSettings);
	}

	// updateFileExtensions(selectedExtensions: string[]) {
	// 	const updatedSettings = this.settings();
	// 	const newPrompts = selectedExtensions.reduce((acc: any, ext) => {
	// 		acc[ext] = acc[ext] || updatedSettings.prompts[ext] || [];
	// 		return acc;
	// 	}, {});
	// 	updatedSettings.fileExtensions = selectedExtensions;
	// 	updatedSettings.prompts = newPrompts;
	// 	this.settings.set(updatedSettings);
	// }
}
