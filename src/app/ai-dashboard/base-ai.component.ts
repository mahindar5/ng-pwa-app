import { inject, signal } from '@angular/core';
import { AlertController } from '@ionic/angular/standalone';
import { DeviceResponse } from '@mahindar5/common-lib';

import { Component } from '@angular/core';
import { AiProcessingService } from './ai-processing.service';
import { SettingsService } from './settings/settings.service';

@Component({
	selector: 'app-base-ai',
	template: ''
})
export abstract class BaseAiComponent {
	protected readonly alertController = inject(AlertController);
	protected readonly settingsService = inject(SettingsService);
	protected readonly aiProcessingService = inject(AiProcessingService);

	isProcessing = signal(false);
	settings = this.settingsService.settings;

	ngOnInit(): void {
		this.settingsService.initializeModels();
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

	protected async toggleSideBarOpen(sideBar: string): Promise<void> {
		const settings = this.settingsService.settings();
		settings.sideBarOpen = { ...settings.sideBarOpen, [sideBar]: !settings.sideBarOpen?.[sideBar] };
		this.settingsService.saveSettings(settings);
	}
}
