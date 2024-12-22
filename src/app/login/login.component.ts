import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { IonButton, IonCol, IonContent, IonGrid, IonInput, IonItem, IonRow } from '@ionic/angular/standalone';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';

@Component({
	selector: 'app-login',
	templateUrl: './login.component.html',
	styleUrls: ['./login.component.scss'],
	imports: [FormsModule, IonContent, IonGrid, IonInput, IonItem, IonRow, IonCol, IonButton],
})
export class LoginComponent implements OnInit {
	loginData = {
		username: '',
		password: '',
	};

	constructor(private router: Router, private route: ActivatedRoute) { }

	ngOnInit() {
		const auth = getAuth();
		onAuthStateChanged(auth, (user) => {
			if (user) {
				this.router.navigateByUrl('')
			}
		})
	}

	login() {
		const auth = getAuth();
		signInWithEmailAndPassword(auth, this.loginData.username, this.loginData.password)
			.then((userCredential) => {
				// Signed in
				const user = userCredential.user;
				console.log('User logged in:', user);

				// Check for return URL and navigate there if it exists
				const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/ai-dashboard';
				this.router.navigateByUrl(returnUrl);
			})
			.catch((error) => {
				const errorCode = error.code;
				const errorMessage = error.message;
				console.error('Login error:', errorCode, errorMessage);
			});
	}
}
