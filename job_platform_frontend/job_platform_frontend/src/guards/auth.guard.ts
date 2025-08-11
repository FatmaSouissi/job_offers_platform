// guards/auth.guard.ts
import { Injectable } from '@angular/core';
import { 
  CanActivate, 
  Router, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot,
  UrlTree 
} from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    return this.authService.isAuthenticated$.pipe(
      take(1),
      map(isAuthenticated => {
        console.log('AuthGuard: Checking authentication status:', isAuthenticated);
        console.log('AuthGuard: Requested URL:', state.url);
        
        if (isAuthenticated) {
          console.log('AuthGuard: User is authenticated, access granted');
          return true;
        }
        
        // User is not authenticated, redirect to login
        console.log('AuthGuard: User not authenticated, redirecting to login');
        
        // Store the attempted URL for redirecting after login
        const returnUrl = state.url !== '/login' ? state.url : '/';
        
        return this.router.createUrlTree(['/login'], {
          queryParams: { returnUrl: returnUrl }
        });
      })
    );
  }
}

// Alternative implementation using CanActivateFn (Angular 14+)
// You can use this instead of the class-based guard above if you prefer functional guards

