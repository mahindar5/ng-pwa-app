import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { AIService, FileService } from '@mahindar5/common-lib';
import { addIcons } from 'ionicons';
import { playCircle, radio, settings } from 'ionicons/icons';

@Component({
	selector: 'ai-dashboard-component',
	templateUrl: 'ai-dashboard.component.html',
	styleUrls: ['ai-dashboard.component.scss'],
	standalone: true,
	providers: [AIService, FileService],
	imports: [
		IonTabButton, IonIcon, IonTabs, IonTabBar, IonLabel
	],
})
export class AiDashboardComponent {
	constructor() {
		addIcons({ playCircle, radio, settings });
	}
}
