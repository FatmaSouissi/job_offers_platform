// profile.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { User } from '../../../interfaces/user';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile implements OnInit, OnDestroy {
  
  // Current user data
  currentUser: User | null = null;
  
  // Form data for profile update
  profileData = {
    firstName: '',
    lastName: '',
    phone: '',
    profilePicture: ''
  };
  
  // Password change form data
  passwordData = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  // UI state
  isLoading = false;
  isUpdatingProfile = false;
  isChangingPassword = false;
  
  // Messages and errors
  profileMessage = '';
  profileError = '';
  passwordMessage = '';
  passwordError = '';
  fieldErrors: { [key: string]: string } = {};
  
  // Active tab
  activeTab: 'profile' | 'password' | 'applications' | 'saved-jobs' = 'profile';
  
  // Additional data
  userApplications: any[] = [];
  userSavedJobs: any[] = [];
  
  private subscriptions = new Subscription();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🔄 Profile component initialized');
    
    // Check authentication
    this.subscriptions.add(
      this.authService.isAuthenticated$.subscribe(isAuthenticated => {
        if (!isAuthenticated) {
          console.log('❌ User not authenticated, redirecting to login');
          this.router.navigate(['/login']);
          return;
        }
      })
    );
    
    // Get current user data
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        if (user) {
          console.log('👤 User data loaded:', user);
          this.currentUser = user;
          this.loadProfileData();
        }
      })
    );
    
    // Load initial data
    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load user profile data into form
   */
  private loadProfileData(): void {
    if (this.currentUser) {
      this.profileData = {
        firstName: this.currentUser.firstName || '',
        lastName: this.currentUser.lastName || '',
        phone: this.currentUser.phone || '',
        profilePicture: this.currentUser.profilePicture || ''
      };
    }
  }

  /**
   * Load additional user data (applications, saved jobs)
   */
  private loadUserData(): void {
    if (this.currentUser?.userType === 'job_seeker') {
      this.loadApplications();
      this.loadSavedJobs();
    }
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: 'profile' | 'password' | 'applications' | 'saved-jobs'): void {
    console.log('🔄 Switching to tab:', tab);
    this.activeTab = tab;
    this.clearMessages();
    
    // Load data when switching to specific tabs
    if (tab === 'applications' && this.userApplications.length === 0) {
      this.loadApplications();
    } else if (tab === 'saved-jobs' && this.userSavedJobs.length === 0) {
      this.loadSavedJobs();
    }
  }

  /**
   * Update user profile
   */
  onUpdateProfile(): void {
    console.log('🔄 Updating profile...');
    
    this.clearMessages();
    
    // Validate form
    if (!this.validateProfileForm()) {
      return;
    }
    
    this.isUpdatingProfile = true;
    
    this.authService.updateProfile(this.profileData).subscribe({
      next: (response) => {
        console.log('✅ Profile updated successfully:', response);
        
        if (response.success) {
          this.profileMessage = 'Profil mis à jour avec succès';
          // The AuthService automatically updates the current user
        } else {
          this.profileError = response.message || 'Erreur lors de la mise à jour';
        }
        
        this.isUpdatingProfile = false;
      },
      error: (error) => {
        console.error('❌ Profile update error:', error);
        
        this.profileError = error.error?.message || 'Erreur lors de la mise à jour du profil';
        this.isUpdatingProfile = false;
      }
    });
  }

  /**
   * Change user password - FIXED VERSION
   */
  onChangePassword(): void {
    console.log(' Changing password...');
    console.log(' Password data (lengths):', {
      oldPassword: this.passwordData.oldPassword?.length || 0,
      newPassword: this.passwordData.newPassword?.length || 0,
      confirmPassword: this.passwordData.confirmPassword?.length || 0
    });
    
    this.clearMessages();
    
    // Validate password form
    if (!this.validatePasswordForm()) {
      console.log('❌ Password form validation failed');
      return;
    }
    
    this.isChangingPassword = true;
    console.log('🔑 Calling AuthService.changePassword...');
    
    this.authService.changePassword(this.passwordData.oldPassword, this.passwordData.newPassword).subscribe({
      next: (response) => {
        console.log('✅ Password change API response:', response);
        
        if (response.success) {
          this.passwordMessage = 'Mot de passe modifié avec succès';
          this.resetPasswordForm();
          console.log(' Password changed successfully');
          
          // Auto-hide success message after 5 seconds
          setTimeout(() => {
            this.passwordMessage = '';
          }, 5000);
        } else {
          console.log(' Password change failed:', response.message);
          this.passwordError = response.message || 'Erreur lors du changement de mot de passe';
        }
        
        this.isChangingPassword = false;
      },
      error: (error) => {
        console.error(' Password change error occurred:', error);
        console.error(' Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          url: error.url
        });
        
        // Handle specific error cases
        if (error.status === 400) {
          if (error.error?.message?.includes('Invalid old password')) {
            this.fieldErrors['oldPassword'] = 'Mot de passe actuel incorrect';
            this.passwordError = 'Le mot de passe actuel que vous avez saisi est incorrect';
          } else {
            this.passwordError = error.error?.message || 'Données invalides';
          }
        } else if (error.status === 401) {
          this.passwordError = 'Session expirée. Veuillez vous reconnecter.';
          // Optionally redirect to login
          setTimeout(() => {
            this.authService.logout();
            this.router.navigate(['/login']);
          }, 2000);
        } else if (error.status === 500) {
          this.passwordError = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else if (error.status === 0) {
          this.passwordError = 'Erreur de connexion. Vérifiez votre connexion internet.';
        } else {
          this.passwordError = error.error?.message || 'Erreur lors du changement de mot de passe';
        }
        
        this.isChangingPassword = false;
      }
    });
  }

  /**
   * Load user applications
   */
  private loadApplications(): void {
    if (this.currentUser?.userType !== 'job_seeker') return;
    
    console.log('🔄 Loading user applications...');
    // You'll need to implement this in your AuthService or create a separate service
    // For now, this is a placeholder
  }

  /**
   * Load user saved jobs
   */
  private loadSavedJobs(): void {
    if (this.currentUser?.userType !== 'job_seeker') return;
    
    console.log('🔄 Loading user saved jobs...');
    // You'll need to implement this in your AuthService or create a separate service
    // For now, this is a placeholder
  }

  /**
   * Validate profile form
   */
  private validateProfileForm(): boolean {
    let isValid = true;
    this.fieldErrors = {};
    
    if (!this.profileData.firstName?.trim()) {
      this.fieldErrors['firstName'] = 'Le prénom est requis';
      isValid = false;
    }
    
    if (!this.profileData.lastName?.trim()) {
      this.fieldErrors['lastName'] = 'Le nom est requis';
      isValid = false;
    }
    
    if (!this.profileData.phone?.trim()) {
      this.fieldErrors['phone'] = 'Le téléphone est requis';
      isValid = false;
    } else {
      const phoneRegex = /^[\+]?[0-9\s\-\(\)]{8,}$/;
      if (!phoneRegex.test(this.profileData.phone.trim())) {
        this.fieldErrors['phone'] = 'Format de téléphone invalide';
        isValid = false;
      }
    }
    
    return isValid;
  }

  /**
   * Enhanced password validation to match backend requirements
   */
  private validatePasswordForm(): boolean {
    let isValid = true;
    this.fieldErrors = {};
    
    console.log('🔍 Validating password form...');
    
    // Validate old password
    if (!this.passwordData.oldPassword?.trim()) {
      this.fieldErrors['oldPassword'] = 'L\'ancien mot de passe est requis';
      isValid = false;
      console.log(' Old password is empty');
    }
    
    // Validate new password
    if (!this.passwordData.newPassword?.trim()) {
      this.fieldErrors['newPassword'] = 'Le nouveau mot de passe est requis';
      isValid = false;
      console.log(' New password is empty');
    } else {
      const password = this.passwordData.newPassword;
      
      // Check minimum length
      if (password.length < 6) {
        this.fieldErrors['newPassword'] = 'Le mot de passe doit contenir au moins 6 caractères';
        isValid = false;
        console.log(' New password too short:', password.length);
      }
      // Check password complexity (match backend validation)
      else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        this.fieldErrors['newPassword'] = 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
        isValid = false;
        console.log(' Password complexity requirements not met');
      }
      // Check if different from old password
      else if (password === this.passwordData.oldPassword) {
        this.fieldErrors['newPassword'] = 'Le nouveau mot de passe doit être différent de l\'ancien';
        isValid = false;
        console.log(' New password same as old password');
      }
    }
    
    // Validate password confirmation
    if (!this.passwordData.confirmPassword?.trim()) {
      this.fieldErrors['confirmPassword'] = 'La confirmation du mot de passe est requise';
      isValid = false;
      console.log(' Password confirmation is empty');
    } else if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
      this.fieldErrors['confirmPassword'] = 'Les mots de passe ne correspondent pas';
      isValid = false;
      console.log('❌ Password confirmation mismatch');
    }
    
    console.log(' Password form validation result:', isValid ? 'VALID' : 'INVALID');
    if (!isValid) {
      console.log(' Password field errors:', this.fieldErrors);
    }
    
    return isValid;
  }

  /**
   * Reset password form
   */
  private resetPasswordForm(): void {
    this.passwordData = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  }

  /**
   * Clear all messages
   */
  private clearMessages(): void {
    this.profileMessage = '';
    this.profileError = '';
    this.passwordMessage = '';
    this.passwordError = '';
    this.fieldErrors = {};
  }

  /**
   * Check if field has error
   */
  hasFieldError(fieldName: string): boolean {
    return !!this.fieldErrors[fieldName];
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string {
    return this.fieldErrors[fieldName] || '';
  }

  /**
   * Get user type display name
   */
  getUserTypeDisplay(): string {
    switch (this.currentUser?.userType) {
      case 'job_seeker':
        return 'Chercheur d\'emploi';
      case 'company':
        return 'Entreprise';
      case 'admin':
        return 'Administrateur';
      default:
        return this.currentUser?.userType || 'Non défini';
    }
  }

  /**
   * Get account status display
   */
  getAccountStatusDisplay(): string {
    if (!this.currentUser) return 'Inconnu';
    
    if (!this.currentUser.isActive) return 'Inactif';
    if (!this.currentUser.emailVerified) return 'Email non vérifié';
    return 'Actif';
  }

  /**
   * Get account status class for styling
   */
  getAccountStatusClass(): string {
    if (!this.currentUser) return 'text-muted';
    
    if (!this.currentUser.isActive) return 'text-danger';
    if (!this.currentUser.emailVerified) return 'text-warning';
    return 'text-success';
  }

  /**
   * Format date for display
   */
  formatDate(dateString: string): string {
    if (!dateString) return 'Non disponible';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Navigate to dashboard
   */
  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Check if password form is valid for enabling/disabling submit button
   */
  isPasswordFormValid(): boolean {
    return !!(
      this.passwordData.oldPassword?.trim() &&
      this.passwordData.newPassword?.trim() &&
      this.passwordData.newPassword.length >= 6 &&
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(this.passwordData.newPassword) &&
      this.passwordData.confirmPassword?.trim() &&
      this.passwordData.newPassword === this.passwordData.confirmPassword &&
      this.passwordData.newPassword !== this.passwordData.oldPassword &&
      Object.keys(this.fieldErrors).length === 0
    );
  }

  /**
   * Real-time password confirmation validation
   */
  onConfirmPasswordChange(): void {
    // Clear previous confirmation error
    if (this.fieldErrors['confirmPassword']) {
      delete this.fieldErrors['confirmPassword'];
    }
    
    // Only validate if both passwords have values
    if (this.passwordData.confirmPassword && this.passwordData.newPassword) {
      if (this.passwordData.newPassword !== this.passwordData.confirmPassword) {
        this.fieldErrors['confirmPassword'] = 'Les mots de passe ne correspondent pas';
      }
    }
  }

  /**
   * Real-time new password validation
   */
  onNewPasswordChange(): void {
    // Clear previous new password error
    if (this.fieldErrors['newPassword']) {
      delete this.fieldErrors['newPassword'];
    }
    
    // Validate new password
    if (this.passwordData.newPassword) {
      const password = this.passwordData.newPassword;
      
      if (password.length < 6) {
        this.fieldErrors['newPassword'] = 'Le mot de passe doit contenir au moins 6 caractères';
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
        this.fieldErrors['newPassword'] = 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre';
      } else if (password === this.passwordData.oldPassword) {
        this.fieldErrors['newPassword'] = 'Le nouveau mot de passe doit être différent de l\'ancien';
      }
      
      // Re-validate confirmation if it exists
      if (this.passwordData.confirmPassword) {
        this.onConfirmPasswordChange();
      }
    }
  }

  /**
   * Real-time old password validation
   */
  onOldPasswordChange(): void {
    // Clear previous old password error
    if (this.fieldErrors['oldPassword']) {
      delete this.fieldErrors['oldPassword'];
    }
    
    // Re-validate new password if it exists (to check if it's different from old)
    if (this.passwordData.newPassword) {
      this.onNewPasswordChange();
    }
  }

  /**
   * Get user initials for placeholder image
   */
  getInitials(): string {
    if (!this.currentUser) return 'U';
    
    const firstName = this.currentUser.firstName || '';
    const lastName = this.currentUser.lastName || '';
    
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    
    return firstInitial + lastInitial || 'U';
  }

  /**
   * Get profile picture URL with fallback
   */
  getProfilePictureUrl(): string {
    if (this.currentUser?.profilePicture) {
      return this.currentUser.profilePicture;
    }
    
    const initials = this.getInitials();
    return `https://ui-avatars.com/api/?name=${initials}&background=007bff&color=fff&size=150`;
  }
}