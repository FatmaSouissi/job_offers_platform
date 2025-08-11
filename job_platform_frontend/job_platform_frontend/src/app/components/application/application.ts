import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JobOffer } from '../../../interfaces/jobOffer';
import { JobService } from '../../../services/job.service';
import { AuthService } from '../../../services/auth.service';
import { ApplicationService } from '../../../services/application.service';
import { User } from '../../../interfaces/user';
import { JobApplication } from '../../../interfaces/jobApplication';

interface ApplicationData {
  jobOfferId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  coverLetter: string;
  resumeFile?: File;
  portfolioUrl?: string;
  expectedSalary?: number;
  resumeUrl?: string;
}

// Interface for creating a new application (without auto-generated/server-set fields)
interface CreateApplicationRequest {
  jobOfferId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  coverLetter: string;
  resumeUrl: string;
  portfolioUrl?: string;
  expectedSalary?: number;
}

// Interface that matches the JobApplication but allows partial creation
interface JobApplicationPayload extends Omit<JobApplication, 'id' | 'userId' | 'appliedAt'> {
  // These fields will be set by the server
  // id: auto-generated
  // userId: from authenticated user
  // appliedAt: server timestamp
}

@Component({
  selector: 'app-application',
  standalone: false,
  templateUrl: './application.html',
  styleUrls: ['./application.css']
})
export class ApplicationComponent implements OnInit {
  applicationForm!: FormGroup; // Use definite assignment assertion
  job: JobOffer | null = null;
  loading = true;
  error: string | null = null;
  submitting = false;
  currentUser: User | null = null; // Type the currentUser properly
  jobId: number | null = null;
  resumeFile: File | null = null;
  maxFileSize = 5 * 1024 * 1024; // 5MB
  allowedFileTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  coverLetterMaxLength = 2000;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private jobService: JobService,
    private authService: AuthService,
    private applicationService: ApplicationService 
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadJobId();
    this.loadCurrentUser();
    this.loadJobDetails();
  }

 private initializeForm(): void {
    this.applicationForm = this.formBuilder.group({
        firstName: ['', [Validators.required, Validators.minLength(2)]],
        lastName: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        phone: ['', [Validators.required, Validators.pattern(/^[\+]?[0-9\s\-\(\)]{8,}$/)]],
        coverLetter: ['', [
            Validators.required, 
            Validators.minLength(50), 
            Validators.maxLength(this.coverLetterMaxLength)
        ]],
        resume: [null, [Validators.required]], // Changed from empty string to null
        portfolioUrl: ['', [Validators.pattern(/^https?:\/\/.+/)]],
        expectedSalary: [null, [Validators.min(0)]],
        //termsAccepted: [false, [Validators.requiredTrue]],
        //dataConsent: [false, [Validators.requiredTrue]]
    });
}

  private loadJobId(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.jobId = Number(id);
    } else {
      this.error = 'ID du poste manquant';
      this.loading = false;
    }
  }

  private loadCurrentUser(): void {
    // getCurrentUser() returns User | null, not an Observable
    this.currentUser = this.authService.getCurrentUser();
    this.prefillUserData();
  }

  private prefillUserData(): void {
    if (this.currentUser) {
      this.applicationForm.patchValue({
        firstName: this.currentUser.firstName || '',
        lastName: this.currentUser.lastName || '',
        email: this.currentUser.email || '',
        phone: this.currentUser.phone || '',
        
      });
    }
  }

  private loadJobDetails(): void {
    if (!this.jobId) return;

    this.jobService.getJobById(this.jobId).subscribe({
      next: (response: any) => {
        this.job = response.data || response;
        this.loading = false;
        this.loadDraft();
      },
      error: (error: any) => {
        this.error = 'Erreur lors du chargement du poste';
        this.loading = false;
        console.error('Error loading job:', error);
      }
    });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0] as File;
    
    if (!file) {
      this.resumeFile = null;
      this.applicationForm.get('resume')?.setValue(null); // Clear the form control
      return;
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      this.showError('Le fichier est trop volumineux. Taille maximale: 5MB');
      this.clearFileInput();
      this.applicationForm.get('resume')?.setErrors({ fileSize: true });
      return;
    }

    // Validate file type
    if (!this.allowedFileTypes.includes(file.type)) {
      this.showError('Format de fichier non supporté. Utilisez PDF, DOC ou DOCX');
      this.clearFileInput();
      this.applicationForm.get('resume')?.setErrors({ fileType: true });
      return;
    }

    this.resumeFile = file;
    this.applicationForm.get('resume')?.setValue('file_selected'); // Set a value to pass validation
}
  private clearFileInput(): void {
    const fileInput = document.getElementById('resume') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    this.resumeFile = null;
  }

  getCoverLetterCount(): number {
    return this.applicationForm.get('coverLetter')?.value?.length || 0;
  }

  getCoverLetterCountClass(): string {
    const count = this.getCoverLetterCount();
    return count > this.coverLetterMaxLength ? 'text-danger' : 'text-primary';
  }

onSubmit(): void {
    console.log('SUBMIT BUTTON CLICKED!');
    
    // Mark all fields as touched to show validation messages
    Object.keys(this.applicationForm.controls).forEach(key => {
        const control = this.applicationForm.get(key);
        control?.markAsTouched();
    });

    // Log detailed validation errors
    if (this.applicationForm.invalid) {
        console.log('Form validation errors:');
        Object.keys(this.applicationForm.controls).forEach(key => {
            const control = this.applicationForm.get(key);
            if (control?.errors) {
                console.log(`${key} errors:`, control.errors);
            }
        });
        return;
    }

    if (!this.resumeFile) {
        this.applicationForm.get('resume')?.setErrors({ required: true });
        return;
    }

    if (this.submitting) {
        return;
    }

    this.submitting = true;
    
    const formValue = this.applicationForm.value;
    const applicationData: ApplicationData = {
        jobOfferId: this.jobId!,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        phone: formValue.phone,
        coverLetter: formValue.coverLetter,
        portfolioUrl: formValue.portfolioUrl || undefined,
        expectedSalary: formValue.expectedSalary || undefined,
        resumeFile: this.resumeFile
    };

    this.submitApplication(applicationData);
}

 private async submitApplication(applicationData: ApplicationData): Promise<void> {
  try {
    // First upload the resume file
    let resumeUrl = '';
    if (applicationData.resumeFile) {
      resumeUrl = await this.uploadResume(applicationData.resumeFile);
    }

    // Create the application payload that matches your database structure
    const applicationPayload = {
      jobOfferId: applicationData.jobOfferId,
      firstName: applicationData.firstName,
      lastName: applicationData.lastName,
      email: applicationData.email,
      phone: applicationData.phone,
      coverLetter: applicationData.coverLetter,
      resumeFile: resumeUrl, // This should be the uploaded file URL
      portfolioUrl: applicationData.portfolioUrl || null,
      expectedSalary: applicationData.expectedSalary || null,
      status: 'pending'
    } as any; // Type assertion to avoid interface conflicts

    // Submit application using ApplicationService
    this.applicationService.createApplication(applicationPayload).subscribe({
      next: (response: any) => {
        this.submitting = false;
        console.log('Application created successfully:', response);
        
        // Show success message
        alert(`Candidature envoyée avec succès ! Numéro: #${response.id || response.data?.id}`);
        
        // Clear the draft and redirect
        this.clearDraft();
        
        // Redirect to applications page
        setTimeout(() => {
          this.router.navigate(['/applications/my']);
        }, 2000);
      },
      error: (error: any) => {
        this.submitting = false;
        console.error('Error creating application:', error);
        
        // Extract error message
        let errorMessage = 'Erreur lors de l\'envoi de la candidature';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        alert(errorMessage);
      }
    });

  } catch (error: any) {
    this.submitting = false;
    console.error('Error in application submission:', error);
    alert('Erreur lors de l\'envoi de la candidature: ' + error.message);
  }
}

private async uploadResume(file: File): Promise<string> {
  try {
    const response = await this.applicationService.uploadResume(file).toPromise();
    
    // Handle the ApiResponse format
    if (response?.data?.url) {
      return response.data.url;
    } else {
      throw new Error('Invalid response format from file upload');
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    throw new Error('Erreur lors de l\'upload du CV: ' + (error?.message || 'Erreur inconnue'));
  }
}

  saveDraft(): void {
    const formValue = this.applicationForm.value;
    const draftData = {
      jobId: this.jobId,
      ...formValue,
      savedAt: new Date().toISOString()
    };

    const drafts = this.getDrafts();
    drafts[this.jobId!] = draftData;
    localStorage.setItem('applicationDrafts', JSON.stringify(drafts));

    this.showSuccessMessage('Brouillon sauvegardé !');
  }

  private loadDraft(): void {
    const drafts = this.getDrafts();
    const draft = drafts[this.jobId!];

    if (draft) {
      this.applicationForm.patchValue({
        firstName: draft.firstName || '',
        lastName: draft.lastName || '',
        email: draft.email || '',
        phone: draft.phone || '',
        coverLetter: draft.coverLetter || '',
        portfolioUrl: draft.portfolioUrl || '',
        expectedSalary: draft.expectedSalary || ''
      });
    }
  }

  private clearDraft(): void {
    const drafts = this.getDrafts();
    delete drafts[this.jobId!];
    localStorage.setItem('applicationDrafts', JSON.stringify(drafts));
  }

  private getDrafts(): any {
    return JSON.parse(localStorage.getItem('applicationDrafts') || '{}');
  }

  private markFormGroupTouched(): void {
    Object.keys(this.applicationForm.controls).forEach(key => {
      const control = this.applicationForm.get(key);
      control?.markAsTouched();
    });
  }

  private showError(message: string): void {
    // You can implement a toast service or use simple alert
    alert(message);
  }

  private showSuccessMessage(message: string): void {
    // You can implement a toast service or use simple alert
    alert(message);
  }

  private showSuccessModal(applicationData: any): void {
    // Implement modal display logic
    const applicationNumber = applicationData.id;
    alert(`Candidature envoyée avec succès ! Numéro: #${applicationNumber}`);
    
    // Redirect after showing success
    setTimeout(() => {
      this.goToApplications();
    }, 2000);
  }

  goBack(): void {
    if (this.jobId) {
      this.router.navigate(['/jobs', this.jobId]);
    } else {
      this.router.navigate(['/jobs']);
    }
  }

  goToApplications(): void {
    this.router.navigate(['/applications/my']);
  }

  // Template helper methods
  getCompanyName(): string {
    return this.job?.company?.companyName 
           || this.job?.companyName 
           || 'Entreprise non spécifiée';
  }

  getJobTypeDisplay(): string {
    if (!this.job?.jobType) return 'Non spécifié';
    
    const types: { [key: string]: string } = {
      'full_time': 'Temps plein',
      'part_time': 'Temps partiel',
      'contract': 'Contrat',
      'freelance': 'Freelance',
      'internship': 'Stage'
    };
    
    return types[this.job.jobType] || this.job.jobType;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.applicationForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.applicationForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;
    
    if (errors['required']) return 'Ce champ est requis';
    if (errors['email']) return 'Format d\'email invalide';
    if (errors['minlength']) return `Minimum ${errors['minlength'].requiredLength} caractères`;
    if (errors['maxlength']) return `Maximum ${errors['maxlength'].requiredLength} caractères`;
    if (errors['pattern']) {
      if (fieldName === 'phone') return 'Format de téléphone invalide';
      if (fieldName === 'portfolioUrl') return 'URL invalide (doit commencer par http:// ou https://)';
    }
    if (errors['min']) return 'Valeur trop petite';
    if (errors['fileSize']) return 'Fichier trop volumineux (max 5MB)';
    if (errors['fileType']) return 'Format de fichier non supporté';
    
    return 'Champ invalide';
}

  // File upload helpers
  getFileUploadText(): string {
    return this.resumeFile ? this.resumeFile.name : 'Choisir un fichier';
  }

  isFileSelected(): boolean {
    return !!this.resumeFile;
  }


private validateForm(): boolean {
    if (!this.applicationForm) {
        console.error('Form not initialized');
        return false;
    }

    if (!this.jobId) {
        console.error('Job ID is missing');
        return false;
    }

    if (!this.resumeFile) {
        console.error('Resume file is required');
        this.applicationForm.get('resume')?.setErrors({ required: true });
        return false;
    }

    return this.applicationForm.valid;
}

  // Form validation helpers
  get firstName() { return this.applicationForm.get('firstName'); }
  get lastName() { return this.applicationForm.get('lastName'); }
  get email() { return this.applicationForm.get('email'); }
  get phone() { return this.applicationForm.get('phone'); }
  get coverLetter() { return this.applicationForm.get('coverLetter'); }
  get portfolioUrl() { return this.applicationForm.get('portfolioUrl'); }
  get expectedSalary() { return this.applicationForm.get('expectedSalary'); }
  get resume() { return this.applicationForm.get('resume'); }
  //get termsAccepted() { return this.applicationForm.get('termsAccepted'); }
  //get dataConsent() { return this.applicationForm.get('dataConsent'); }


  

}