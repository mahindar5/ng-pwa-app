import { bootstrapApplication } from '@angular/platform-browser';
import { fetchProxy } from '@mahindar5/common-lib';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { BUILD_INFO } from './build-info';

fetchProxy();
bootstrapApplication(AppComponent, appConfig)
	.catch((err) => console.error(err));
(window as any).globalConfig = BUILD_INFO;
