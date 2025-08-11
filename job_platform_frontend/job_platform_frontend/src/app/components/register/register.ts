// register.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { RegisterRequest } from '../../../interfaces/loginRequest';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './register.html',
  styleUrls: ['./register.css']
})
export class RegisterComponent implements OnInit, OnDestroy {
  private authSubscription: Subscription = new Subscription();

  registerData: RegisterRequest = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    userType: 'job_seeker'
  };

  confirmPassword = '';
  isLoading = false;
  errorMessage = '';
  fieldErrors: { [key: string]: string } = {};

  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is already logged in and redirect
    this.authSubscription.add(
      this.authService.isAuthenticated$.subscribe(isAuthenticated => {
        if (isAuthenticated) {
          console.log('User already logged in, redirecting to home...');
          this.router.navigate(['/']);
        }
      })
    );
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }

  onSubmit(): void {
    console.log('🔄 Register form submitted');
    
    // Clear previous errors
    this.clearErrors();

    // Validation
    if (!this.isFormValid()) {
      console.log('❌ Form validation failed');
      return;
    }

    // Password confirmation check
    if (this.registerData.password !== this.confirmPassword) {
      this.fieldErrors['confirmPassword'] = 'Les mots de passe ne correspondent pas';
      console.log('❌ Password confirmation mismatch');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    console.log('🔄 Starting registration process...');
    console.log('📦 Registration data (password hidden):', {
      email: this.registerData.email,
      firstName: this.registerData.firstName,
      lastName: this.registerData.lastName,
      phone: this.registerData.phone,
      userType: this.registerData.userType,
      password: '[HIDDEN - LENGTH: ' + this.registerData.password.length + ']'
    });

    // Make the registration API call
    this.authService.register(this.registerData).subscribe({
      next: (response) => {
        console.log('✅ Registration API response received:', response);
        
        if (response.success && response.data) {
          console.log('🎉 Registration successful! User data:', {
            id: response.data.user.id,
            email: response.data.user.email,
            firstName: response.data.user.firstName,
            lastName: response.data.user.lastName,
            userType: response.data.user.userType
          });
          
          console.log('🔑 Token received and stored automatically by AuthService');
          
          // Show success message briefly before redirect
          setTimeout(() => {
            console.log('🏠 Redirecting to home page...');
            this.router.navigate(['/']);
          }, 1000);
          
          // Reset form
          this.resetForm();
        } else {
          console.log('❌ Registration failed - Invalid response structure');
          this.errorMessage = response.message || 'Erreur lors de l\'inscription';
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('💥 Registration error occurred:', error);
        console.error('📊 Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          url: error.url
        });
        
        // Handle different types of errors
        if (error.status === 400) {
          // Bad request - likely validation error or user already exists
          if (error.error?.message) {
            this.errorMessage = error.error.message;
            
            // Check for specific "user already exists" error
            if (error.error.message.includes('already exists')) {
              this.fieldErrors['email'] = 'Un compte existe déjà avec cet email';
            }
          } else {
            this.errorMessage = 'Données d\'inscription invalides';
          }
        } else if (error.status === 500) {
          // Server error
          this.errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else if (error.status === 0) {
          // Network error
          this.errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet.';
        } else {
          // Generic error
          this.errorMessage = error.error?.message || 'Erreur lors de l\'inscription. Veuillez réessayer.';
        }
        
        this.isLoading = false;
      }
    });
  }

  private isFormValid(): boolean {
    let isValid = true;
    const { email, password, firstName, lastName, phone } = this.registerData;
    
    console.log('🔍 Validating form fields...');
    
    // Required fields validation
    if (!firstName?.trim()) {
      this.fieldErrors['firstName'] = 'Le prénom est requis';
      isValid = false;
      console.log('❌ firstName validation failed');
    }

    if (!lastName?.trim()) {
      this.fieldErrors['lastName'] = 'Le nom est requis';
      isValid = false;
      console.log('❌ lastName validation failed');
    }

    if (!email?.trim()) {
      this.fieldErrors['email'] = 'L\'email est requis';
      isValid = false;
      console.log('❌ email validation failed - empty');
    } else {
      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        this.fieldErrors['email'] = 'Format d\'email invalide';
        isValid = false;
        console.log('❌ email validation failed - invalid format');
      }
    }

    if (!phone?.trim()) {
      this.fieldErrors['phone'] = 'Le numéro de téléphone est requis';
      isValid = false;
      console.log('❌ phone validation failed');
    } else {
      // Basic phone validation (you can make this more specific for Tunisia)
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
      if (!phoneRegex.test(phone.trim())) {
        this.fieldErrors['phone'] = 'Format de téléphone invalide';
        isValid = false;
        console.log('❌ phone validation failed - invalid format');
      }
    }

    if (!password) {
      this.fieldErrors['password'] = 'Le mot de passe est requis';
      isValid = false;
      console.log('❌ password validation failed - empty');
    } else if (password.length < 6) {
      this.fieldErrors['password'] = 'Le mot de passe doit contenir au moins 6 caractères';
      isValid = false;
      console.log('❌ password validation failed - too short');
    }

    if (!this.confirmPassword) {
      this.fieldErrors['confirmPassword'] = 'La confirmation du mot de passe est requise';
      isValid = false;
      console.log('❌ confirmPassword validation failed - empty');
    }

    console.log('📋 Form validation result:', isValid ? 'VALID' : 'INVALID');
    if (!isValid) {
      console.log('🚫 Field errors:', this.fieldErrors);
    }

    return isValid;
  }

  private clearErrors(): void {
    this.errorMessage = '';
    this.fieldErrors = {};
    console.log('🧹 Errors cleared');
  }

  private resetForm(): void {
    this.registerData = {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phone: '',
      userType: 'job_seeker'
    };
    this.confirmPassword = '';
    this.clearErrors();
    console.log('🔄 Form reset to initial state');
  }

  // Method to check if a field has an error
  hasFieldError(fieldName: string): boolean {
    return !!this.fieldErrors[fieldName];
  }

  // Method to get field error message
  getFieldError(fieldName: string): string {
    return this.fieldErrors[fieldName] || '';
  }

  // Navigate to login page
  public goToLogin(): void {
    if (!this.isLoading) {
      console.log('🔄 Navigating to login page...');
      this.router.navigate(['/login']);
    }
  }

  // Real-time password confirmation validation
  onConfirmPasswordChange(): void {
    if (this.confirmPassword && this.registerData.password !== this.confirmPassword) {
      this.fieldErrors['confirmPassword'] = 'Les mots de passe ne correspondent pas';
    } else if (this.confirmPassword === this.registerData.password) {
      delete this.fieldErrors['confirmPassword'];
    }
  }

  // Method to format phone number (optional - for better UX)
  onPhoneChange(): void {
    // Remove any non-digit characters except + and spaces
    let phone = this.registerData.phone.replace(/[^\d\+\s]/g, '');
    
    // If it starts with +216, that's good for Tunisia
    // If it starts with just digits, we might want to suggest +216
    if (phone && !phone.startsWith('+') && phone.length >= 8) {
      // This is optional - you can remove this if you don't want auto-formatting
      // phone = '+216 ' + phone;
    }
    
    this.registerData.phone = phone;
    
    // Clear phone error if it was previously invalid
    if (this.fieldErrors['phone'] && phone.trim().length >= 8) {
      delete this.fieldErrors['phone'];
    }
  }
}