import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonButtons, IonCheckbox, IonCol, IonContent, IonHeader, IonIcon, IonInput, IonItem, IonItemDivider, IonItemGroup, IonLabel, IonList, IonRange, IonRow, IonSelect, IonSelectOption, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AIService, FileService, ProcessingStrategy } from '@mahindar5/common-lib';
import { SettingsComponent } from './settings.component';
import { SettingsService } from './settings.service';
import { signal } from '@angular/core';

describe('SettingsComponent', () => {
	let component: SettingsComponent;
	let fixture: ComponentFixture<SettingsComponent>;
	let settingsService: jasmine.SpyObj<SettingsService>;
	let router: jasmine.SpyObj<Router>;

	beforeEach(async () => {
		const settingsServiceSpy = jasmine.createSpyObj('SettingsService', ['settings', 'addPrompt', 'removePrompt', 'saveSettings', 'resetSettings', 'downloadSettings', 'selectAndValidateSettingsJsonFile']);
		const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

		await TestBed.configureTestingModule({
			declarations: [],
			imports: [
				FormsModule, IonButton, IonButtons, IonRow, IonCol, IonItemDivider, IonItemGroup, IonIcon,
				IonCheckbox, IonContent, IonHeader, IonInput, IonItem, IonLabel, IonList, IonRange, IonSelect, IonSelectOption, IonTitle, IonToolbar
			],
			providers: [
				{ provide: SettingsService, useValue: settingsServiceSpy },
				{ provide: Router, useValue: routerSpy },
				AIService, FileService
			]
		}).compileComponents();

		fixture = TestBed.createComponent(SettingsComponent);
		component = fixture.componentInstance;
		settingsService = TestBed.inject(SettingsService) as jasmine.SpyObj<SettingsService>;
		router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

		settingsService.settings.and.returnValue(signal({
			temperature: 0.5,
			topP: 0.8,
			topK: 40,
			n: 1,
			model: { name: 'gemini-pro', org: 'Gemini' },
			selectedPrompt: { name: 'prompt1', type: 'ts', promptTextList: [{ text: 'Prompt 1', selected: true }], excludeCommonInstructions: false, role: 'Developer' },
			prompts: [{ name: 'prompt1', type: 'ts', promptTextList: [{ text: 'Prompt 1', selected: true }], excludeCommonInstructions: false, role: 'Developer' }],
			models: [],
			apiKeys: { github: '', google: '' },
			maxOutputTokens: 1024,
			processingStrategy: ProcessingStrategy.Combined,
			sideBarOpen: { aiAgent: false, aiChat: false }
		})());

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should add a prompt', () => {
		const prompt = { name: 'prompt1', type: 'ts', promptTextList: [{ text: 'Prompt 1', selected: true }], excludeCommonInstructions: false, role: 'Developer' };
		component.addPrompt(prompt);
		expect(settingsService.addPrompt).toHaveBeenCalledWith(prompt);
	});

	it('should remove a prompt', () => {
		const prompt = { name: 'prompt1', type: 'ts', promptTextList: [{ text: 'Prompt 1', selected: true }], excludeCommonInstructions: false, role: 'Developer' };
		const index = 0;
		component.removePrompt(prompt, index);
		expect(settingsService.removePrompt).toHaveBeenCalledWith(prompt, index);
	});

	it('should save settings', () => {
		component.saveSettings();
		expect(settingsService.saveSettings).toHaveBeenCalled();
	});

	it('should reset settings', () => {
		component.resetSettings();
		expect(settingsService.resetSettings).toHaveBeenCalled();
	});

	it('should open full settings', () => {
		component.openFullSettings();
		expect(router.navigate).toHaveBeenCalledWith(['ai-dashboard/settings']);
	});

	it('should download settings', () => {
		component.downloadSettings();
		expect(settingsService.downloadSettings).toHaveBeenCalled();
	});

	it('should upload settings', async () => {
		await component.uploadSettings();
		expect(settingsService.selectAndValidateSettingsJsonFile).toHaveBeenCalled();
	});

	// Add more tests as needed
});