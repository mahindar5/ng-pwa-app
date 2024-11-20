import { bootstrapApplication } from '@angular/platform-browser';
import { fetchProxy } from '@mahindar5/common-lib';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

fetchProxy();
bootstrapApplication(AppComponent, appConfig)
	.catch((err) => console.error(err));
