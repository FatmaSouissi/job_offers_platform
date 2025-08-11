// guards/admin.guard.ts
import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    
    return this.authService.currentUser$.pipe(
      take(1),
      map(user => {
        console.log('AdminGuard: Checking user access', user);
        
        // Check if user exists and is admin
        if (user && user.userType === 'admin') {
          console.log('AdminGuard: Admin access granted');
          return true;
        }
        
        // If not admin, redirect based on user type
        if (user) {
          console.log('AdminGuard: Access denied, redirecting based on user type:', user.userType);
          
          switch (user.userType) {
            case 'company':
              this.router.navigate(['/company-dashboard']);
              break;
            case 'job_seeker':
              this.router.navigate(['/dashboard']);
              break;
            default:
              this.router.navigate(['/']);
              break;
          }
        } else {
          // No user, redirect to login
          console.log('AdminGuard: No user found, redirecting to login');
          this.router.navigate(['/login'], { 
            queryParams: { returnUrl: state.url } 
          });
        }
        
        return false;
      })
    );
  }
}