import { Component } from '@angular/core';
import { IonIcon, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { AIService, FileService } from '@mahindar5/common-lib';
import { AiProcessingService } from './ai-processing.service';

@Component({
	selector: 'ai-dashboard-component',
	templateUrl: 'ai-dashboard.component.html',
	styleUrls: ['ai-dashboard.component.scss'],
	standalone: true,
	providers: [AIService, FileService, AiProcessingService],
	imports: [
		IonTabButton, IonIcon, IonTabs, IonTabBar
	],
})
export class AiDashboardComponent {
}
