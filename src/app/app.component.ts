import { AsyncPipe, DatePipe } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonCard, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle, IonRouterLink, IonRouterOutlet, IonSplitPane, IonTitle, IonToggle, IonToolbar } from '@ionic/angular/standalone';

@Component({
	selector: 'app-root',
	imports: [
		FormsModule, RouterLink, RouterLinkActive, AsyncPipe, DatePipe, IonApp, IonSplitPane, IonMenu, IonHeader, IonToolbar, IonTitle, IonCard, IonContent, IonList, IonItem, IonIcon, IonLabel, IonToggle, IonMenuToggle, IonRouterLink, IonRouterOutlet
	],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss'
})
export class AppComponent {
}
