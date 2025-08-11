// auth.service.ts - Updated version with redirect handling
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

import { User } from '../interfaces/user';
import { LoginRequest, LoginResponse, RegisterRequest, ApiResponse } from '../interfaces/loginRequest';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:3000/api'; // Adjust to your backend URL
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private tokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.currentUser$.pipe(
    map(user => !!user)
  );

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    // Load user from localStorage on service initialization
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        this.tokenSubject.next(token);
        this.currentUserSubject.next(user);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        this.clearStorage();
      }
    }
  }

  private setUserData(user: User, token: string): void {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    this.currentUserSubject.next(user);
    this.tokenSubject.next(token);
  }

  private clearStorage(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    this.tokenSubject.next(null);
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/users/login`, credentials)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.setUserData(response.data.user, response.data.token);
            
            // Handle redirect after successful login
            this.handlePostLoginRedirect(response.data.user);
          }
          return response;
        }),
        catchError(error => {
          console.error('Login error:', error);
          return throwError(() => error);
        })
      );
  }

  register(userData: RegisterRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/users/register`, userData)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            this.setUserData(response.data.user, response.data.token);
            
            // Handle redirect after successful registration
            this.handlePostLoginRedirect(response.data.user);
          }
          return response;
        }),
        catchError(error => {
          console.error('Registration error:', error);
          return throwError(() => error);
        })
      );
  }

  /**
   * Handle redirect after successful login/registration
   */
  private handlePostLoginRedirect(user: User): void {
    // Check for return URL from query params
    const urlTree = this.router.parseUrl(this.router.url);
    const returnUrl = urlTree.queryParams['returnUrl'];
    
    if (returnUrl && returnUrl !== '/login' && returnUrl !== '/register') {
      console.log('Redirecting to return URL:', returnUrl);
      this.router.navigateByUrl(returnUrl);
      return;
    }
    
    // Default redirect based on user type
    this.redirectToDashboard(user);
  }

  /**
   * Redirect user to appropriate dashboard based on user type
   */
  private redirectToDashboard(user: User): void {
    switch (user.userType) {
      case 'admin':
        console.log('Redirecting admin to admin dashboard');
        this.router.navigate(['/admin-dashboard']);
        break;
      
      case 'company':
        console.log('Redirecting company to company dashboard');
        this.router.navigate(['/company-dashboard']);
        break;
      
      case 'job_seeker':
        console.log('Redirecting job seeker to dashboard');
        this.router.navigate(['/dashboard']);
        break;
      
      default:
        console.warn(`Unknown user type: ${user.userType}, redirecting to home`);
        this.router.navigate(['/']);
        break;
    }
  }

  logout(): void {
    this.clearStorage();
    this.router.navigate(['/login']);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getToken(): string | null {
    return this.tokenSubject.value;
  }

  isAuthenticated(): boolean {
    return !!this.getCurrentUser() && !!this.getToken();
  }

  // Get authorization headers for API requests
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  // Refresh token
  refreshToken(): Observable<ApiResponse<{token: string}>> {
    return this.http.post<ApiResponse<{token: string}>>(`${this.API_URL}/users/refresh-token`, {}, {
      headers: this.getAuthHeaders()
    }).pipe(
      map((response: ApiResponse<{token: string}>) => {
        if (response.success && response.data?.token) {
          const currentUser = this.getCurrentUser();
          if (currentUser) {
            this.setUserData(currentUser, response.data.token);
          }
        }
        return response;
      }),
      catchError(error => {
        this.logout(); // Force logout on token refresh failure
        return throwError(() => error);
      })
    );
  }

  // Update user profile
  updateProfile(profileData: Partial<User>): Observable<ApiResponse<User>> {
    return this.http.put<ApiResponse<User>>(`${this.API_URL}/users/me`, profileData, {
      headers: this.getAuthHeaders()
    }).pipe(
      map((response: ApiResponse<User>) => {
        if (response.success && response.data) {
          const token = this.getToken();
          if (token) {
            this.setUserData(response.data, token);
          }
        }
        return response;
      })
    );
  }

  // Change password
  changePassword(oldPassword: string, newPassword: string): Observable<ApiResponse> {
    console.log('🔧 AuthService.changePassword called');
    console.log('📤 Request details:', {
      url: `${this.API_URL}/users/change-password`,
      method: 'PUT',
      oldPasswordProvided: !!oldPassword,
      newPasswordProvided: !!newPassword,
      oldPasswordLength: oldPassword?.length || 0,
      newPasswordLength: newPassword?.length || 0,
      hasToken: !!this.getToken()
    });

    const requestBody = {
      oldPassword,
      password: newPassword // Backend expects "password" field
    };

    console.log('📦 Request body structure:', {
      hasOldPassword: !!requestBody.oldPassword,
      hasPassword: !!requestBody.password,
      oldPasswordLength: requestBody.oldPassword?.length || 0,
      passwordLength: requestBody.password?.length || 0
    });

    return this.http.put<ApiResponse>(`${this.API_URL}/users/change-password`, requestBody, {
      headers: this.getAuthHeaders()
    }).pipe(
      map((response: ApiResponse) => {
        console.log('✅ AuthService received response:', response);
        return response;
      }),
      catchError(error => {
        console.error('❌ AuthService password change error:', error);
        console.error('📊 Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          url: error.url,
          body: error.error
        });
        return throwError(() => error);
      })
    );
  }

  /**
   * Check if current user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    return user?.userType === role;
  }

  /**
   * Check if current user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Check if current user is company
   */
  isCompany(): boolean {
    return this.hasRole('company');
  }

  /**
   * Check if current user is job seeker
   */
  isJobSeeker(): boolean {
    return this.hasRole('job_seeker');
  }
}