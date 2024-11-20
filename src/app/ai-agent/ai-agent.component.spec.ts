import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AIAgentComponent } from './ai-agent.component';


describe('AiAgentComponent', () => {
	let component: AIAgentComponent;
	let fixture: ComponentFixture<AIAgentComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [AIAgentComponent]
		})
			.compileComponents();

		fixture = TestBed.createComponent(AIAgentComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
