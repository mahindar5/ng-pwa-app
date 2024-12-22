import { ApplicationConfig, isDevMode, provideExperimentalZonelessChangeDetection } from '@angular/core';
import { RouteReuseStrategy, provideRouter } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { provideServiceWorker } from '@angular/service-worker';
import { AIService, firebaseConfig } from '@mahindar5/common-lib';
import { initializeApp } from 'firebase/app';
import { routes } from './app.routes';

initializeApp(firebaseConfig)
export const appConfig: ApplicationConfig = {
	providers: [
		provideExperimentalZonelessChangeDetection(),
		provideRouter(routes),
		provideServiceWorker('ngsw-worker.js', {
			enabled: !isDevMode(),
			registrationStrategy: 'registerWhenStable:30000',
		}),
		{ provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
		{ provide: AIService, useClass: AIService },
		provideIonicAngular({
			useSetInputAPI: true,
			innerHTMLTemplatesEnabled: true,
		}),
	]
};
