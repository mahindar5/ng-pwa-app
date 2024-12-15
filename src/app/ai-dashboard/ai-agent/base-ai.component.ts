import { inject, signal } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { AIModel, AIResponse, AIService, DeviceResponse } from '@mahindar5/common-lib';

import { Component } from '@angular/core';

@Component({
	selector: 'app-base-ai',
	template: ''
})
export abstract class BaseAiComponent {
	protected readonly aiservice = inject(AIService);
	protected readonly alertController = inject(AlertController);
	isProcessing = signal(false);
	selectedModel = signal<AIModel>({} as AIModel);
	models = signal<AIModel[]>([]);

	ngOnInit(): void {
		this.initializeModels();
	}

	protected async showAuthenticationAlert(response: DeviceResponse): Promise<boolean> {
		const { user_code, verification_uri, expires_in } = response;
		const expirationTime = new Date(Date.now() + expires_in * 1000).toLocaleString();
		const message = `Please visit ${verification_uri} and enter code ${user_code} to authenticate. Code expires at ${expirationTime}.`;

		const alert = await this.alertController.create({
			header: 'Authentication',
			message,
			buttons: [
				{ text: `Copy (${user_code}) & Authenticate`, handler: () => { navigator.clipboard.writeText(user_code).then(() => window.open(verification_uri, '_blank')); return false; } },
				{ text: 'Cancel', role: 'cancel' },
				{ text: 'Completed', role: 'ok' },
			]
		});
		await alert.present();
		const { role } = await alert.onDidDismiss();
		return role === 'ok';
	}

	protected processResponse(response: AIResponse): void {
		if (response.retryAfter) {
			const model = this.models().find(m => m.name === this.selectedModel().name);
			if (model) {
				model.retryAfter = response.retryAfter.retryAfter;
				model.retryAfterCreatedAt = new Date().toISOString();
				localStorage.setItem('models', JSON.stringify(this.models()));
				this.initializeModels();
			}
			throw new Error('Rate limit exceeded. Please try again later.');
		}
	}

	protected initializeModels(): void {
		const loadedModels = this.aiservice.loadModels();
		this.models.set(loadedModels);
		this.selectedModel.set(loadedModels.find(m => !m.disabled) || loadedModels[0]);
	}
}
