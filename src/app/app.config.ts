import { ApplicationConfig, provideExperimentalZonelessChangeDetection, isDevMode } from '@angular/core';
import { provideRouter, RouteReuseStrategy } from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { routes } from './app.routes';
import { provideServiceWorker } from '@angular/service-worker';

export const appConfig: ApplicationConfig = {
  providers: [provideExperimentalZonelessChangeDetection(), provideRouter(routes), provideServiceWorker('ngsw-worker.js', {
    enabled: !isDevMode(),
    registrationStrategy: 'registerWhenStable:30000',
  }),
  { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  provideIonicAngular({
    useSetInputAPI: true,
    innerHTMLTemplatesEnabled: true,
  })]
};
