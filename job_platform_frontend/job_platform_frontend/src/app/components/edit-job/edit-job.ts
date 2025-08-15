import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JobService } from '../../../services/job.service';
import { JobOffer } from '../../../interfaces/jobOffer';

@Component({
  selector: 'app-edit-job',
  standalone: false,
  templateUrl: './edit-job.html',
  styleUrls: ['./edit-job.css'],
  
})
export class EditJob implements OnInit {
  editJobForm!: FormGroup;
  jobId!: number;
  job: JobOffer | undefined;
  loading = false;
  error = '';
  
  jobTypes = [
    { value: 'full-time', label: 'Full Time' },
    { value: 'part-time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'internship', label: 'Internship' }
  ];
  
  experienceLevels = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'executive', label: 'Executive' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private fb: FormBuilder,
    private jobService: JobService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadJob();
  }

  initializeForm(): void {
    this.editJobForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.maxLength(2000)]],
      requirements: ['', [Validators.required, Validators.maxLength(1000)]],
      jobType: ['', Validators.required],
      experienceLevel: ['', Validators.required],
      location: ['', [Validators.required, Validators.maxLength(100)]],
      isRemote: [false],
      salaryMin: [''],
      salaryMax: [''],
      applicationDeadline: ['']
    });
  }

  loadJob(): void {
    this.jobId = Number(this.route.snapshot.paramMap.get('id'));
    
    if (!this.jobId) {
      this.router.navigate(['/company/jobs']);
      return;
    }

    this.loading = true;
    this.jobService.getJobById(this.jobId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.job = response.data;
          this.populateForm();
        } else {
          this.error = 'Job not found';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading job:', error);
        this.error = 'Error loading job details';
        this.loading = false;
      }
    });
  }

  populateForm(): void {
    if (!this.job) {
      this.error = 'Job data not available';
      return;
    }

    this.editJobForm.patchValue({
      title: this.job.title || '',
      description: this.job.description || '',
      requirements: this.job.requirements || '',
      jobType: this.job.jobType || '',
      experienceLevel: this.job.experienceLevel || '',
      location: this.job.location || '',
      isRemote: this.job.isRemote || false,
      salaryMin: this.job.salaryMin || '',
      salaryMax: this.job.salaryMax || '',
      applicationDeadline: this.job.applicationDeadline ? 
        new Date(this.job.applicationDeadline).toISOString().split('T')[0] : ''
    });
  }

  onSubmit(): void {
    if (this.editJobForm.valid) {
      this.loading = true;
      const formData = this.editJobForm.value;
      
      // Convert salary values to numbers if provided
      if (formData.salaryMin) formData.salaryMin = Number(formData.salaryMin);
      if (formData.salaryMax) formData.salaryMax = Number(formData.salaryMax);

      this.jobService.updateJob(this.jobId, formData).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Job updated successfully!');
            this.router.navigate(['/company/jobs']);
          } else {
            this.error = 'Failed to update job';
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error updating job:', error);
          this.error = 'Error updating job';
          this.loading = false;
        }
      });
    } else {
      this.markFormGroupTouched();
    }
  }

  markFormGroupTouched(): void {
    Object.keys(this.editJobForm.controls).forEach(key => {
      const control = this.editJobForm.get(key);
      if (control) {
        control.markAsTouched();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/company/jobs']);
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.editJobForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.editJobForm.get(fieldName);
    if (field && field.errors && field.touched) {
      if (field.errors['required']) return `${fieldName} is required`;
      if (field.errors['maxlength']) return `${fieldName} is too long`;
    }
    return '';
  }
}