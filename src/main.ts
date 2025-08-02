import { bootstrapApplication } from '@angular/platform-browser';
import { fetchProxy } from '@mahindar5/common-lib';
import { configureApplicationWithConfig } from '@mahindar5/ng-common-ion-lib';
import { AppComponent } from '@mahindar5/ng-common-ion-lib/components/app';
import { BUILD_INFO } from './build-info';

fetchProxy();
bootstrapApplication(AppComponent, await configureApplicationWithConfig({ BUILD_INFO: { myAppBUILD_INFO: BUILD_INFO }, NAMESPACE: BUILD_INFO.namespace }))
	.catch((err) => console.error(err));
