import { inject, Injectable, signal } from '@angular/core';
import { AIService, AIServiceType, DEFAULT_PROMPT, ProcessingStrategy, PromptItem, PromptName, promptsArray, Settings } from '@mahindar5/common-lib';

@Injectable({
	providedIn: 'root'
})
export class SettingsService {
	private defaultSettings: Settings = {
		temperature: 1,
		topP: 0.95,
		topK: 64,
		n: 1,
		model: { name: 'gemini-exp-1206', org: AIServiceType.Gemini },
		selectedPrompt: promptsArray.find(a => a.name == DEFAULT_PROMPT) || promptsArray[0],
		prompts: promptsArray,
		models: [],
		apiKeys: { github: '', google: '' },
		maxOutputTokens: 8192 * 4,
		processingStrategy: ProcessingStrategy.Combined,
		sideBarOpen: { aiAgent: true, aiChat: true }
	};
	settings = signal<Settings>(this.defaultSettings);
	private readonly aiservice = inject(AIService);

	constructor() {
		this.loadSettings();
	}

	private loadSettings(): void {
		const savedSettings = localStorage.getItem('settings');
		if (savedSettings) {
			const settings = JSON.parse(savedSettings);
			for (const key of Object.keys(this.defaultSettings) as (keyof Settings)[]) {
				if (!(key in settings)) {
					settings[key] = this.defaultSettings[key];
				}
			}
			this.defaultSettings.apiKeys = { ...this.defaultSettings.apiKeys, ...settings.apiKeys };
			this.settings.set(settings);
		} else {
			this.settings.set(this.defaultSettings);
		}
		this.initializeModels();
	}

	saveSettings(settings?: Settings): void {
		settings = settings ?? this.settings();
		this.settings.update(() => ({ ...settings }));
		localStorage.setItem('settings', JSON.stringify(settings));
	}

	resetSettings(): void {
		this.settings.set(this.defaultSettings);
		this.initializeModels();
	}

	addPrompt(prompt: PromptItem, event?: Event) {
		event?.stopPropagation();
		const updatedSettings = this.settings();
		const promptItem = updatedSettings.prompts.find(p => p.name === prompt.name);
		if (!promptItem) {
			throw new Error('Prompt not found');
		}
		promptItem.promptTextList.push({ text: '', selected: false });
		this.saveSettings(updatedSettings);
	}

	removePrompt(prompt: PromptItem, index: number): void {
		const updatedSettings = this.settings();
		const promptItem = updatedSettings.prompts.find(p => p.name === prompt.name);
		if (!promptItem) {
			throw new Error('Prompt not found');
		}
		promptItem.promptTextList.splice(index, 1);
		this.saveSettings(updatedSettings);
	}

	addPromptItem(): void {
		const updatedSettings = this.settings();
		const newPromptName = `New Prompt ${updatedSettings.prompts.length + 1}`;
		updatedSettings.prompts.push({
			name: newPromptName as PromptName,
			promptTextList: [],
			role: ''
		});
		this.saveSettings(updatedSettings);
	}

	removePromptItem(name: string): void {
		const updatedSettings = this.settings();
		const index = updatedSettings.prompts.findIndex(p => p.name === name);
		if (index === -1) {
			throw new Error('Prompt not found');
		}
		updatedSettings.prompts.splice(index, 1);
		this.saveSettings(updatedSettings);
	}

	initializeModels(): void {
		const currentSettings = this.settings();
		const loadedModels = this.aiservice.loadModels(currentSettings);
		this.saveSettings({ ...currentSettings, models: loadedModels });
	}

	downloadSettings(): void {
		const settings = this.settings();
		const json = JSON.stringify(settings, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = window.URL.createObjectURL(blob);

		const a = document.createElement('a');
		a.href = url;
		a.download = 'settings.json';
		a.click();

		window.URL.revokeObjectURL(url);
	}

	async selectAndValidateSettingsJsonFile(): Promise<void> {
		const requiredKeys: (keyof Settings)[] = ["temperature", "topP", "topK", "n", "model", "selectedPrompt", "prompts", "models", "apiKeys", "maxOutputTokens", "processingStrategy"];
		const [fileHandle] = await window.showOpenFilePicker({
			multiple: false,
			id: 'settingsjson',
			types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
		});

		const file = await fileHandle.getFile();
		const fileContent = await file.text();
		const jsonData = JSON.parse(fileContent);

		const missingKeys = requiredKeys.filter(key => !(key in jsonData));
		if (missingKeys.length > 0) {
			console.error('File content is missing required keys:' + missingKeys.join(', '));
			return;
		}

		this.saveSettings(jsonData);
	}
}
