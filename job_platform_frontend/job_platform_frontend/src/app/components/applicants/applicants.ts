import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ApplicationService, DetailedApplication } from '../../../services/application.service';
import { JobService } from '../../../services/job.service';
import { JobOffer } from '../../../interfaces/jobOffer';


@Component({
  selector: 'app-applicants',
  standalone: false,
  templateUrl: './applicants.html',
  styleUrl: './applicants.css'
})
export class Applicants implements OnInit{
jobId!: number;
  job: JobOffer | undefined;
  applications: DetailedApplication[] = [];
  loading = false;
  error = '';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalApplications = 0;
  limit = 10;
  
  // Filters
  selectedStatus = '';
  statusOptions = [
    { value: '', label: 'All Applications' },
    { value: 'pending', label: 'Pending' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private applicationService: ApplicationService,
    private jobService: JobService
  ) {}

  ngOnInit(): void {
    this.jobId = Number(this.route.snapshot.paramMap.get('jobId'));
    if (this.jobId) {
      this.loadJob();
      this.loadApplications();
    } else {
      this.router.navigate(['/company/jobs']);
    }
  }

  loadJob(): void {
    this.jobService.getJobById(this.jobId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.job = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading job:', error);
      }
    });
  }

  loadApplications(): void {
    this.loading = true;
    this.error = '';
    
    this.applicationService.getApplicationsByJob(this.jobId, this.currentPage, this.limit).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.applications = response.data;
          // Handle pagination if available in response
          if (response.pagination) {
            this.currentPage = response.pagination.page;
            this.totalPages = response.pagination.pages;
            this.totalApplications = response.pagination.total;
          }
        } else {
          this.error = 'Failed to load applications';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading applications:', error);
        this.error = 'Error loading applications';
        this.loading = false;
      }
    });
  }

  onStatusFilterChange(event: any): void {
    this.selectedStatus = event.target.value;
    this.currentPage = 1;
    this.loadApplications();
  }

  updateApplicationStatus(applicationId: number, newStatus: string): void {
    if (!newStatus) return;
    
    this.applicationService.updateApplicationStatus(applicationId, newStatus).subscribe({
      next: (response) => {
        if (response.success) {
          // Update the local application status
          const app = this.applications.find(a => a.id === applicationId);
          if (app) {
            // Cast newStatus to the correct type
            app.status = newStatus as 'pending' | 'reviewed'  | 'accepted' | 'rejected';
          }
          alert('Application status updated successfully!');
        } else {
          alert('Failed to update application status');
        }
      },
      error: (error) => {
        console.error('Error updating application status:', error);
        alert('Error updating application status');
      }
    });
  }

  viewApplicantProfile(application: DetailedApplication): void {
    // Navigate to applicant profile or show modal with details
    console.log('View applicant profile:', application.applicant);
    // You can implement this based on your requirements
  }

  downloadResume(resumeUrl: string): void {
    if (resumeUrl) {
      window.open(resumeUrl, '_blank');
    } else {
      alert('Resume not available');
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadApplications();
    }
  }

  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'pending': 'bg-warning',
      'reviewed': 'bg-info',
      'interview': 'bg-primary',
      'accepted': 'bg-success',
      'rejected': 'bg-danger'
    };
    return statusClasses[status] || 'bg-secondary';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  goBackToJobs(): void {
    this.router.navigate(['/company/jobs']);
  }

  getPages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}


