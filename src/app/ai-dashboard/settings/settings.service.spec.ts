import { TestBed } from '@angular/core/testing';
import { AIService, DEFAULT_PROMPT, ProcessingStrategy, promptsArray } from '@mahindar5/common-lib';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
	let service: SettingsService;
	let aiService: jasmine.SpyObj<AIService>;

	beforeEach(() => {
		const aiServiceSpy = jasmine.createSpyObj('AIService', ['loadModels']);

		TestBed.configureTestingModule({
			providers: [
				SettingsService,
				{ provide: AIService, useValue: aiServiceSpy }
			]
		});

		service = TestBed.inject(SettingsService);
		aiService = TestBed.inject(AIService) as jasmine.SpyObj<AIService>;

		localStorage.clear();
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('should load settings from localStorage', () => {
		const mockSettings = {
			temperature: 0.7,
			topP: 0.9,
			topK: 50,
			n: 2,
			model: { name: 'gpt-4', org: 'OpenAI' },
			selectedPrompt: promptsArray[1],
			prompts: promptsArray,
			models: [],
			apiKeys: { github: 'test_github_key', google: 'test_google_key' },
			maxOutputTokens: 2048,
			processingStrategy: ProcessingStrategy.Individual,
			sideBarOpen: { aiAgent: true, aiChat: true }
		};
		localStorage.setItem('settings', JSON.stringify(mockSettings));

		service['loadSettings']();

		expect(service.settings()).toEqual(mockSettings);
	});

	it('should save settings to localStorage', () => {
		const newSettings = {
			temperature: 0.8,
			topP: 0.95,
			topK: 64,
			n: 1,
			model: { name: 'gemini-pro', org: 'Gemini' },
			selectedPrompt: promptsArray[0],
			prompts: promptsArray,
			models: [],
			apiKeys: { github: '', google: '' },
			maxOutputTokens: 8192,
			processingStrategy: ProcessingStrategy.Combined,
			sideBarOpen: { aiAgent: false, aiChat: false }
		};

		service.saveSettings(newSettings);

		expect(localStorage.getItem('settings')).toEqual(JSON.stringify(service.settings()));
	});

	it('should reset settings to default', () => {
		service.resetSettings();

		expect(service.settings()).toEqual(service['defaultSettings']);
	});

	it('should add a prompt', () => {
		const prompt = promptsArray[0];
		service.addPrompt(prompt);

		expect(service.settings().prompts[0].promptTextList.length).toBe(prompt.promptTextList.length + 1);
	});

	it('should remove a prompt', () => {
		const prompt = promptsArray[0];
		service.addPrompt(prompt);
		service.removePrompt(prompt, 0);

		expect(service.settings().prompts[0].promptTextList.length).toBe(prompt.promptTextList.length);
	});

	it('should initialize models', () => {
		aiService.loadModels.and.returnValue([]);
		service.initializeModels();

		expect(aiService.loadModels).toHaveBeenCalled();
		expect(service.settings().models).toEqual([]);
	});

	it('should download settings', () => {
		spyOn(window.URL, 'createObjectURL').and.returnValue('mock_url');
		spyOn(window.URL, 'revokeObjectURL');
		const createElementSpy = spyOn(document, 'createElement').and.callThrough();

		service.downloadSettings();

		expect(createElementSpy).toHaveBeenCalledWith('a');
		expect(window.URL.createObjectURL).toHaveBeenCalled();
		expect(window.URL.revokeObjectURL).toHaveBeenCalled();
	});

	// Add more tests as needed
});