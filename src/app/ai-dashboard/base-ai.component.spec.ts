import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular/standalone';
import { DeviceResponse, Settings } from '@mahindar5/common-lib';

import { Component, signal } from '@angular/core';
import { AiProcessingService } from './ai-processing.service';
import { SettingsService } from './settings/settings.service';
import { BaseAiComponent } from './base-ai.component';

@Component({
	selector: 'app-base-ai',
	template: ''
})
class TestBaseAiComponent extends BaseAiComponent {
	constructor(
		alertController: AlertController,
		settingsService: SettingsService,
		aiProcessingService: AiProcessingService
	) {
		super();
		this['alertController'] = alertController;
		this['settingsService'] = settingsService;
		this['aiProcessingService'] = aiProcessingService;
	}
}

describe('BaseAiComponent', () => {
	let component: TestBaseAiComponent;
	let fixture: ComponentFixture<TestBaseAiComponent>;
	let alertController: jasmine.SpyObj<AlertController>;
	let settingsService: jasmine.SpyObj<SettingsService>;
	let aiProcessingService: jasmine.SpyObj<AiProcessingService>;

	beforeEach(async () => {
		const alertControllerSpy = jasmine.createSpyObj('AlertController', ['create']);
		const settingsServiceSpy = jasmine.createSpyObj('SettingsService', ['settings', 'saveSettings', 'initializeModels']);
		const aiProcessingServiceSpy = jasmine.createSpyObj('AiProcessingService', ['setProcessingStrategy']);

		await TestBed.configureTestingModule({
			declarations: [TestBaseAiComponent],
			providers: [
				{ provide: AlertController, useValue: alertControllerSpy },
				{ provide: SettingsService, useValue: settingsServiceSpy },
				{ provide: AiProcessingService, useValue: aiProcessingServiceSpy }
			]
		}).compileComponents();

		fixture = TestBed.createComponent(TestBaseAiComponent);
		component = fixture.componentInstance;
		alertController = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;
		settingsService = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;
		aiProcessingService = TestBed.inject(AiProcessingService) as jasmine.SpyObj<AiProcessingService>;
		settingsService.settings.and.returnValue(signal<Settings>({
			temperature: 0,
			topP: 0,
			topK: 0,
			n: 0,
			model: { name: '', org: '' },
			selectedPrompt: { name: '', type: '', promptTextList: [], excludeCommonInstructions: false, role: '' },
			prompts: [],
			models: [],
			apiKeys: { github: '', google: '' },
			maxOutputTokens: 0,
			processingStrategy: '',
			sideBarOpen: { aiAgent: false, aiChat: false }
		})());
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should show authentication alert', async () => {
		const mockDeviceResponse: DeviceResponse = {
			device_code: 'test_device_code',
			user_code: 'test_user_code',
			verification_uri: 'https://testverification.com',
			expires_in: 300,
			interval: 5
		};

		const mockAlert = {
			present: jasmine.createSpy('present').and.returnValue(Promise.resolve()),
			onDidDismiss: jasmine.createSpy('onDidDismiss').and.returnValue(Promise.resolve({ role: 'ok' }))
		};

		alertController.create.and.returnValue(Promise.resolve(mockAlert as any));

		const result = await component['showAuthenticationAlert'](mockDeviceResponse);

		expect(alertController.create).toHaveBeenCalled();
		expect(mockAlert.present).toHaveBeenCalled();
		expect(mockAlert.onDidDismiss).toHaveBeenCalled();
		expect(result).toBe(true);
	});

	it('should toggle sidebar open state', async () => {
		const initialSettings: Settings = {
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
			processingStrategy: 'Combined',
			sideBarOpen: { aiAgent: false, aiChat: false }
		};
		settingsService.settings.and.returnValue(signal<Settings>(initialSettings)());

		await component['toggleSideBarOpen']('aiAgent');
		expect(settingsService.saveSettings).toHaveBeenCalledWith({ ...initialSettings, sideBarOpen: { aiAgent: true, aiChat: false } });
	});
});