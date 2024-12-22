import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { IonAvatar, IonButton, IonButtons, IonChip, IonContent, IonFooter, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonProgressBar, IonSplitPane, IonTextarea, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { AIService, sendExtBackgroundMessage } from '@mahindar5/common-lib';
import { AiChatComponent } from './ai-chat.component';
import { AiProcessingService } from '../ai-processing.service';
import { SettingsComponent } from '../settings/settings.component';
import { AlertController } from '@ionic/angular';
import { of } from 'rxjs';
import { signal } from '@angular/core';

describe('AiChatComponent', () => {
	let component: AiChatComponent;
	let fixture: ComponentFixture<AiChatComponent>;
	let aiService: jasmine.SpyObj<AIService>;
	let aiProcessingService: jasmine.SpyObj<AiProcessingService>;
	let alertController: jasmine.SpyObj<AlertController>;

	beforeEach(async () => {
		const aiServiceSpy = jasmine.createSpyObj('AIService', ['chat']);
		const aiProcessingServiceSpy = jasmine.createSpyObj('AiProcessingService', ['processResponse']);
		const alertControllerSpy = jasmine.createSpyObj('AlertController', ['create']);

		await TestBed.configureTestingModule({
			declarations: [],
			imports: [
				FormsModule,
				IonChip, IonFooter, IonAvatar, IonButtons, IonItem, IonList, IonContent,
				IonLabel, IonIcon, IonProgressBar, IonToolbar, IonTextarea, IonButton, IonSplitPane, IonMenu, IonHeader, IonTitle, SettingsComponent
			],
			providers: [
				{ provide: AIService, useValue: aiServiceSpy },
				{ provide: AiProcessingService, useValue: aiProcessingServiceSpy },
				{ provide: AlertController, useValue: alertControllerSpy }
			]
		}).compileComponents();

		fixture = TestBed.createComponent(AiChatComponent);
		component = fixture.componentInstance;
		aiService = TestBed.inject(AIService) as jasmine.SpyObj<AIService>;
		aiProcessingService = TestBed.inject(AiProcessingService) as jasmine.SpyObj<AiProcessingService>;
		alertController = TestBed.inject(AlertController) as jasmine.SpyObj<AlertController>;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('should send a message and update messages', async () => {
		aiService.chat.and.returnValue(Promise.resolve({ chat: [{ role: 'user', text: 'Test message', date: new Date() }] }));
		component.message.set('Test message');
		await component.sendMessage();
		expect(aiService.chat).toHaveBeenCalled();
		expect(component.messages().length).toBe(1);
		expect(component.messages()[0].text).toBe('Test message');
	});

	it('should clear messages', () => {
		component.messages.set([{ role: 'user', text: 'Test message', date: new Date() }]);
		component.clearMessages();
		expect(component.messages().length).toBe(0);
	});

	it('should add user message', () => {
		component.message.set('Test message');
		component['addUserMessage']('Test message');
		expect(component.messages().length).toBe(1);
		expect(component.messages()[0].text).toBe('Test message');
	});

	// Add more tests as needed
});