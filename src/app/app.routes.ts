import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';

export const routes: Routes = [
	{
		path: '',
		redirectTo: 'ai-dashboard',
		pathMatch: 'full',
	},
	{
		path: 'login',
		loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
	},
	{
		path: 'ai-dashboard',
		canActivate: [AuthGuard],
		loadComponent: () => import('./ai-dashboard/ai-dashboard.component').then(m => m.AiDashboardComponent),
		children: [
			{
				path: '',
				redirectTo: 'ai-agent',
				pathMatch: 'full',
			},
			{
				path: 'ai-agent',
				loadComponent: () => import('./ai-dashboard/ai-agent/ai-agent.component').then(m => m.AiAgentComponent),
			},
			{
				path: 'ai-chat',
				loadComponent: () => import('./ai-dashboard/ai-chat/ai-chat.component').then(m => m.AiChatComponent),
			},
			{
				path: 'settings',
				loadComponent: () => import('./ai-dashboard/settings/settings.component').then(m => m.SettingsComponent),
			}
		],
	},
];
