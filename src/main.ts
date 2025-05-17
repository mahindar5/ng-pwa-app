import { bootstrapApplication } from '@angular/platform-browser';
import { BUILD_INFO as commonLibBUILD_INFO, fetchProxy } from '@mahindar5/common-lib';
import { configureApplicationWithConfig, BUILD_INFO as matBUILD_INFO } from '@mahindar5/ng-common-ion-lib';
import { AppComponent } from '@mahindar5/ng-common-ion-lib/components/app';
import { BUILD_INFO as myAppBUILD_INFO } from './build-info';

fetchProxy();
bootstrapApplication(AppComponent, await configureApplicationWithConfig({ BUILD_INFO: { myAppBUILD_INFO, matBUILD_INFO, commonLibBUILD_INFO } }))
	.catch((err) => console.error(err));
