import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Observable } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class AuthGuard implements CanActivate {

	constructor(private router: Router) { }

	canActivate(
		next: ActivatedRouteSnapshot,
		state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
		return new Promise((resolve, reject) => {
			const auth = getAuth();
			onAuthStateChanged(auth, (user) => {
				if (user) {
					resolve(true);
				} else {
					console.log('User is not logged in');
					// Store the attempted URL for redirecting after login
					this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
					resolve(false);
				}
			});
		});
	}
}
