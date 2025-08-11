// login.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LoginRequest, LoginResponse } from '../../../interfaces/loginRequest';
import { User } from '../../../interfaces/user';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-login',
  //standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  @Output() loginSuccess = new EventEmitter<User>();
  @Output() showRegister = new EventEmitter<void>();

  loginData: LoginRequest = {
    email: '',
    password: ''
  };

  rememberMe = false;
  isLoading = false;
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    console.log('🔄 Login attempt started');
    console.log('📧 Email:', this.loginData.email);
    console.log('🔒 Password length:', this.loginData.password.length);
    
    if (!this.loginData.email || !this.loginData.password) {
      this.errorMessage = 'Veuillez remplir tous les champs';
      console.log('❌ Validation failed: Empty fields');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log('🌐 Making login request to backend...');

    this.authService.login(this.loginData).subscribe({
      next: (response: LoginResponse) => {
        console.log('✅ Login response received:', response);
        
        if (response.success && response.data) {
          console.log('🎉 Login successful for user:', response.data.user.email);
          this.loginSuccess.emit(response.data.user);
          this.loginData = { email: '', password: '' };
        } else {
          console.log('❌ Login failed:', response.message);
          this.errorMessage = response.message || 'Erreur de connexion';
        }
        this.isLoading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Login error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          errorBody: error.error
        });
        
        if (error.status === 401) {
          this.errorMessage = 'Email ou mot de passe incorrect';
        } else if (error.status === 0) {
          this.errorMessage = 'Impossible de se connecter au serveur';
        } else {
          this.errorMessage = error.error?.message || 'Erreur de connexion. Veuillez réessayer.';
        }
        
        this.isLoading = false;
      }
    });
  }

  onShowRegister(): void {
    this.showRegister.emit();
  }

  goToRegister(): void {
    this.router.navigate(['/register']);
  }

  showForgotPassword(): void {
    console.log('Forgot password clicked');
  }
}