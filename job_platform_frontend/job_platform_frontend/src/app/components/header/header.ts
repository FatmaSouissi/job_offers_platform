import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { User } from '../../../interfaces/user';
import { AuthService } from '../../../services/auth.service';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit, OnDestroy {

  public isLoggedIn: boolean = false;
  public currentUser: User | null = null;
  public isDropdownOpen: boolean = false;
  private routerSubscription: Subscription = new Subscription();
  private authSubscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribe to authentication state changes
    this.authSubscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
        console.log('Current user updated:', user);
      })
    );

    this.authSubscriptions.add(
      this.authService.isAuthenticated$.subscribe(isAuthenticated => {
        this.isLoggedIn = isAuthenticated;
        console.log('Authentication status:', isAuthenticated);
        
        // Check for redirect on auth state change
        this.checkAuthRedirect();
      })
    );
    
    // Listen to route changes to check for redirects
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.checkAuthRedirect();
      });

    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      const dropdown = document.getElementById('navbarDropdown');
      const dropdownMenu = document.querySelector('.dropdown-menu');
      
      if (dropdown && dropdownMenu && 
          !dropdown.contains(event.target as Node) && 
          !dropdownMenu.contains(event.target as Node)) {
        this.isDropdownOpen = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.authSubscriptions) {
      this.authSubscriptions.unsubscribe();
    }
  }

  /**
   * Check if authenticated user should be redirected from login/register pages
   */
  private checkAuthRedirect(): void {
    const currentUrl = this.router.url;
    
    // If logged in and on login/register page, redirect to home
    if (this.isLoggedIn && (currentUrl === '/login' || currentUrl === '/register')) {
      console.log('Already logged in, redirecting to home...');
      this.router.navigate(['/']);
    }
  }

  /**
   * Toggle dropdown menu with smart positioning
   */
  public toggleDropdown(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDropdownOpen = !this.isDropdownOpen;
    
    if (this.isDropdownOpen) {
      // Wait for DOM update, then position dropdown
      setTimeout(() => {
        this.positionDropdown();
      }, 0);
    }
  }

  /**
   * Position dropdown to avoid viewport cutoff
   */
  private positionDropdown(): void {
    const dropdown = document.querySelector('.dropdown-menu') as HTMLElement;
    const trigger = document.getElementById('navbarDropdown');
    
    if (dropdown && trigger) {
      const rect = trigger.getBoundingClientRect();
      const dropdownRect = dropdown.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      
      // Reset positioning
      dropdown.style.left = 'auto';
      dropdown.style.right = '0';
      
      // Check if dropdown would overflow on the right
      if (rect.right - dropdownRect.width < 0) {
        dropdown.style.left = '0';
        dropdown.style.right = 'auto';
      }
      
      // Check if dropdown would overflow on the left
      if (rect.left + dropdownRect.width > viewportWidth) {
        dropdown.style.right = '0';
        dropdown.style.left = 'auto';
      }
    }
  }

  /**
   * Close dropdown menu
   */
  public closeDropdown(): void {
    this.isDropdownOpen = false;
  }

  /**
   * Logout user using AuthService
   */
  public logout(): void {
    this.closeDropdown();
    this.authService.logout();
    console.log('User logged out');
    this.router.navigate(['/login']);
  }

  /**
   * Navigate to login page
   */
  public goToLogin(): void {
    // Check if already logged in, redirect to home instead
    if (this.isLoggedIn) {
      this.router.navigate(['/']);
      return;
    }
    this.router.navigate(['/login']);
  }

  /**
   * Navigate to register page
   */
  public goToRegister(): void {
    // Check if already logged in, redirect to home instead
    if (this.isLoggedIn) {
      this.router.navigate(['/']);
      return;
    }
    this.router.navigate(['/register']);
  }

  /**
   * Navigate to profile page
   */
  public goToProfile(): void {
    this.closeDropdown();
    this.router.navigate(['/profile']);
  }

  /**
   * Navigate to appropriate dashboard based on user type
   */
  public goToDashboard(): void {
    this.closeDropdown();
    
    if (!this.currentUser) {
      console.error('No current user found');
      this.router.navigate(['/login']);
      return;
    }

    const userType = this.currentUser.userType;
    
    switch (userType) {
      case 'admin':
        console.log('Redirecting admin to admin dashboard');
        this.router.navigate(['/admin-dash']);
        break;
      
      case 'company':
        console.log('Redirecting company to company dashboard');
        this.router.navigate(['/company-dash']);
        break;
      
      case 'job_seeker':
        console.log('Redirecting job seeker to job seeker dashboard');
        this.router.navigate(['/dashboard']);
        break;
      
      default:
        console.warn(`Unknown user type: ${userType}, redirecting to default dashboard`);
        this.router.navigate(['/dashboard']);
        break;
    }
  }

  /**
   * Navigate to companies page
   */
  public goToCompanies(): void {
    this.router.navigate(['/companies']);
  }

  /**
   * Check if current user is admin
   */
  public isAdmin(): boolean {
    return this.currentUser?.userType === 'admin';
  }

  /**
   * Check if current user is company
   */
  public isCompany(): boolean {
    return this.currentUser?.userType === 'company';
  }

  /**
   * Check if current user is job seeker
   */
  public isJobSeeker(): boolean {
    return this.currentUser?.userType === 'job_seeker';
  }

  /**
   * Get dashboard label based on user type
   */
  public getDashboardLabel(): string {
    if (!this.currentUser) return 'Tableau de bord';
    
    switch (this.currentUser.userType) {
      case 'admin':
        return 'Admin Dashboard';
      case 'company':
        return 'Company Dashboard';
      case 'job_seeker':
        return 'Mon Dashboard';
     
    }
  }

  /**
   * Get dashboard icon based on user type
   */
  public getDashboardIcon(): string {
    if (!this.currentUser) return 'fas fa-tachometer-alt';
    
    switch (this.currentUser.userType) {
      case 'admin':
        return 'fas fa-cogs';
      case 'company':
        return 'fas fa-building';
      case 'job_seeker':
        return 'fas fa-tachometer-alt';
      default:
        return 'fas fa-tachometer-alt';
    }
  }
}