import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular/standalone';
import { AiDashboardComponent } from './ai-dashboard.component';
import { AIService, FileService } from '@mahindar5/common-lib';
import { AiProcessingService } from './ai-processing.service';

describe('AiDashboardComponent', () => {
	let component: AiDashboardComponent;
	let fixture: ComponentFixture<AiDashboardComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			declarations: [],
			imports: [IonTabButton, IonIcon, IonTabs, IonTabBar, IonLabel],
			providers: [AIService, FileService, AiProcessingService]
		}).compileComponents();

		fixture = TestBed.createComponent(AiDashboardComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});