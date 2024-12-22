import { TestBed } from '@angular/core/testing';
import { AIService, FILE_MARKERS, FileItem, FileService, ProcessingStrategy, Settings } from '@mahindar5/common-lib';
import { AiProcessingService } from './ai-processing.service';
import { SettingsService } from './settings/settings.service';
import { of } from 'rxjs';

describe('AiProcessingService', () => {
	let service: AiProcessingService;
	let fileService: jasmine.SpyObj<FileService>;
	let aiService: jasmine.SpyObj<AIService>;
	let settingsService: jasmine.SpyObj<SettingsService>;

	const mockFileItem: FileItem = {
		path: 'test.txt',
		status: 'unmodified',
		selected: false,
		handle: {
			getFile: () => Promise.resolve(new File(['test content'], 'test.txt')),
			name: 'test.txt'
		} as unknown as FileSystemFileHandle,
		directoryHandle: {} as FileSystemDirectoryHandle,
		code: ''
	};

	const mockSettings: Settings = {
		temperature: 0.5,
		topP: 0.8,
		topK: 40,
		n: 1,
		model: { name: 'gemini-pro', org: 'Gemini' },
		selectedPrompt: { name: 'prompt1', type: 'ts', promptTextList: [{ text: 'Prompt 1', selected: true }], excludeCommonInstructions: false, role: 'Developer' },
		prompts: [],
		models: [],
		apiKeys: { github: '', google: '' },
		maxOutputTokens: 1024,
		processingStrategy: ProcessingStrategy.Combined,
		sideBarOpen: { aiAgent: false, aiChat: false }
	};

	beforeEach(() => {
		const fileServiceSpy = jasmine.createSpyObj('FileService', ['extractCode', 'writeToFile']);
		const aiServiceSpy = jasmine.createSpyObj('AIService', ['message', 'chat']);
		const settingsServiceSpy = jasmine.createSpyObj('SettingsService', ['settings', 'saveSettings']);

		TestBed.configureTestingModule({
			providers: [
				AiProcessingService,
				{ provide: FileService, useValue: fileServiceSpy },
				{ provide: AIService, useValue: aiServiceSpy },
				{ provide: SettingsService, useValue: settingsServiceSpy }
			]
		});

		service = TestBed.inject(AiProcessingService);
		fileService = TestBed.inject(FileService) as jasmine.SpyObj<FileService>;
		aiService = TestBed.inject(AIService) as jasmine.SpyObj<AIService>;
		settingsService = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;

		settingsService.settings.and.returnValue(mockSettings);
	});

	it('should be created', () => {
		expect(service).toBeTruthy();
	});

	it('should process files individually', async () => {
		aiService.message.and.returnValue(Promise.resolve({ message: 'Processed code' }));
		fileService.extractCode.and.returnValue('Processed code');

		const updateFileItemStatus = jasmine.createSpy();
		await service.processFiles([mockFileItem], 'Test prompt', mockSettings, async () => true, updateFileItemStatus);

		expect(aiService.message).toHaveBeenCalled();
		expect(fileService.extractCode).toHaveBeenCalled();
		expect(updateFileItemStatus).toHaveBeenCalledWith(mockFileItem, 'done', 'Processed code', '');
	});

	it('should process files combined', async () => {
		aiService.message.and.returnValue(Promise.resolve({
			message: `${FILE_MARKERS.FILE_START}test.txt\n\`\`\`\nProcessed code\n\`\`\`\n${FILE_MARKERS.FILE_END}`
		}));
		fileService.extractCode.and.returnValue('Processed code');

		const updateFileItemStatus = jasmine.createSpy();
		await service.processFiles([mockFileItem], 'Test prompt', mockSettings, async () => true, updateFileItemStatus);

		expect(aiService.message).toHaveBeenCalled();
		expect(fileService.extractCode).toHaveBeenCalledTimes(1);
		expect(updateFileItemStatus).toHaveBeenCalledWith(mockFileItem, 'done', 'Processed code', '');
	});

	it('should process files in chat mode', async () => {
		aiService.chat.and.returnValue(Promise.resolve({ message: 'Processed code' }));
		fileService.extractCode.and.returnValue('Processed code');

		const updateFileItemStatus = jasmine.createSpy();
		await service.processFiles([mockFileItem], 'Test prompt', mockSettings, async () => true, updateFileItemStatus);

		expect(aiService.chat).toHaveBeenCalled();
		expect(fileService.extractCode).toHaveBeenCalled();
		expect(updateFileItemStatus).toHaveBeenCalledWith(mockFileItem, 'done', 'Processed code', '');
	});

	// Add more tests as needed
});