import { CommonModule } from '@angular/common';
import { Component, NgModule, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

import { User } from '../interfaces/user';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.html',
  styleUrls: ['./app.css'],

})

export class AppComponent implements OnInit {
  title = 'Job Platform';
  
  public isLoggedIn: boolean = false;
  public currentUser: User | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkAuthStatus();
  }

  /**
   * Check if user is authenticated
   */
  private checkAuthStatus(): void {
    try {
      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      
      if (token && userData) {
        this.currentUser = JSON.parse(userData);
        this.isLoggedIn = true;
      } else {
        this.isLoggedIn = false;
        this.currentUser = null;
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.isLoggedIn = false;
      this.currentUser = null;
    }
  }

  /**
   * Logout user
   */
  public logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.isLoggedIn = false;
    this.currentUser = null;
    this.router.navigate(['/login']);
  }

  /**
   * Navigate to login page
   */
  public goToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Navigate to register page
   */
  public goToRegister(): void {
    this.router.navigate(['/register']);
  }

  /**
   * Navigate to profile page
   */
  public goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  /**
   * Navigate to dashboard
   */
  public goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}