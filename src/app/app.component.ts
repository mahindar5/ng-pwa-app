import { AsyncPipe, DatePipe, DOCUMENT } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonApp, IonCard, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonMenu, IonMenuToggle, IonRouterLink, IonRouterOutlet, IonSplitPane, IonTitle, IonToggle, IonToolbar, ModalController, Platform, ToastController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { barChart, basket, bug, chatboxEllipses, chatbubble, close, gift, layers, list, logoAmazon, logoReddit, logOut, moon, musicalNotes, people, playCircle, recording, refreshCircle, settings, wifi } from 'ionicons/icons';

const DARK_THEME_STORAGE_KEY = 'DarkThemeStorageKey';

@Component({
	selector: 'app-root',
	imports: [
		FormsModule, RouterLink, RouterLinkActive, AsyncPipe, DatePipe, IonApp, IonSplitPane, IonMenu, IonHeader, IonToolbar, IonTitle, IonCard, IonContent, IonList, IonItem, IonIcon, IonLabel, IonToggle, IonMenuToggle, IonRouterLink, IonRouterOutlet
	],
	templateUrl: './app.component.html',
	styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
	private readonly platform = inject(Platform);
	// private readonly zone = inject(NgZone);
	// private readonly router = inject(Router);
	// private readonly userRolesService = inject(UserRolesService);
	// private readonly customElementsService = inject(CustomElementsService);
	private readonly toastController = inject(ToastController);
	// private readonly cacheService = inject(CacheService);
	// private readonly indexedDbCacheService = inject(IndexedDbCacheService);
	private readonly modalCtrl = inject(ModalController);
	// public buildtime = RUNTIME_FILE.buildtime;
	public appPages = [];
	public darkMode = true;
	// public blurImages: Subject<boolean>;
	document = inject(DOCUMENT);

	constructor() {
		this.initializeApp();
		// this.clearCache().subscribe();
		// this.customElementsService.registerComponents();
		// this.setupModalEventListeners();
		this.setupBackButtonListener();
		addIcons({ moon, close, logOut, barChart, chatboxEllipses, chatbubble, wifi, musicalNotes, list, people, logoReddit, layers, gift, logoAmazon, basket, bug, playCircle, refreshCircle, recording, settings });
	}

	ngOnInit(): void {
		// this.blurImages = this.userRolesService.blurImages$;
		// onAuthStateChangedFirebase()
		// 	.pipe(
		// 		concatMap(user => user ? this.userRolesService.getUserRoleById(ctx, user.uid) : of(undefined)),
		// 		map(userRoles => {
		// 			this.userRolesService.blurImages$.next(!userRoles?.roles?.includes('unBlurImages'));
		// 			this.appPages = routes?.filter(menu => menu.icon && (userRoles?.roles?.some(r => menu.roles.includes(r) || r == menu.url) || menu.roles.includes('anonymous')));
		// 		}),
		// 	)
		// 	.subscribe();
	}

	// signOut() {
	// 	signOutFiresbase().then(() => this.router.navigate(['/login']));
	// }

	initializeApp() {
		this.errorHandlingAndToast();
		this.toggleDarkMode();
		this.platform.backButton.subscribeWithPriority(999, () => alert('platform.backButton.subscribeWithPriority'));
	}

	async showToast(message: string) {
		const toast = await this.toastController.create({ message, duration: 3000, buttons: [{ icon: 'close', role: 'cancel' }] });
		toast.present();
	}
	private errorHandlingAndToast() {
		(console as any).defaultError = console.error.bind(console);
		(console as any).errors = [];

		console.error = (...args) => {
			this.showToast((args[1] && args[1].message) || args[0]);
			(console as any).defaultError.apply(console, args);
			(console as any).errors.push(Array.from(args));
		};
	}

	private toggleDarkMode() {
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
		const darkThemestr = localStorage.getItem(DARK_THEME_STORAGE_KEY);
		const darkTheme = darkThemestr === undefined || darkThemestr === null ? prefersDark.matches : darkThemestr === 'true';
		this.initializeDarkPalette(darkTheme);
	}

	initializeDarkPalette(isDark: boolean) {
		this.darkMode = isDark;
		this.darkChange(isDark);
	}

	darkChangeTr(ev: any) {
		this.darkChange(!!ev.detail.checked);
	}

	darkChange(enableDarkTheme: boolean) {
		document.documentElement.classList.toggle('ion-palette-dark', enableDarkTheme);
		localStorage.setItem(DARK_THEME_STORAGE_KEY, enableDarkTheme as any);
	}

	// private setupModalEventListeners() {
	// 	this.document.addEventListener('ionModalWillPresent', () => history.pushState(null, null, location.href));
	// 	this.document.addEventListener('ionModalWillDismiss', (ev: CustomEvent) => {
	// 		if (ev.detail?.data?.from !== 'popstate') history.back();
	// 	});
	// }

	private setupBackButtonListener() {
		window.addEventListener('popstate', async () => {
			const modal = await this.modalCtrl.getTop();
			if (modal) modal.dismiss({ dismissed: true, from: 'popstate' });
		});
	}

	// @CacheLoader({ ttl: 1000 * 60 * 60 * 24, storageType: StorageType.IndexedDb, keyName: 'allKeys' })
	// public clearCache() {
	// 	let keysLength = 0;
	// 	return this.indexedDbCacheService.getAllKeys(ctx)
	// 		.pipe(
	// 			tap(keys => keysLength = keys.length),
	// 			concatMap(keys =>
	// 				keys.length > 0 ? forkJoin(keys.map(key => this.cacheService.getItem(ctx, key, StorageType.IndexedDb))) : of([])),
	// 			map(data => 'clearCache done, deleted ' + (keysLength - data.length) + ' keys at ' + new Date().toLocaleString()),
	// 			tap((msg) => this.showToast(msg)),
	// 		);
	// }
}
