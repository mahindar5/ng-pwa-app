import { Routes } from '@angular/router';

export const routes: Routes = [
	{ path: '', loadComponent: () => import('./ai-agent/ai-agent.component').then(m => m.AIAgentComponent) },
];
