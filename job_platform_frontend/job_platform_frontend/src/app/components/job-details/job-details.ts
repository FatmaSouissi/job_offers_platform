import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JobOffer } from '../../../interfaces/jobOffer';
import { JobService } from '../../../services/job.service';


@Component({
  selector: 'app-job-details',
  standalone: false,
 // imports: [CommonModule, FormsModule],
  templateUrl: './job-details.html',
  styleUrls: ['./job-details.css'],
 
})
export class JobDetailsComponent implements OnInit {
  job: JobOffer | null = null;
  loading = true;
  error: string | null = null;
  applying = false;
  hasApplied = false;
  userType: string = 'student'; // This should come from your auth service
  similarJobs: JobOffer[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jobService: JobService
  ) {}

  ngOnInit(): void {
    this.loadJobDetails();
  }

  private loadJobDetails(): void {
    const jobId = this.route.snapshot.paramMap.get('id');
    if (!jobId) {
      this.error = 'ID du poste manquant';
      this.loading = false;
      return;
    }

    this.jobService.getJobById(Number(jobId)).subscribe({
      next: (response: any) => {
        this.job = response.data || response;
        this.loading = false;
        this.checkApplicationStatus();
        this.loadSimilarJobs();
      },
      error: (error: any) => {
        this.error = 'Erreur lors du chargement du poste';
        this.loading = false;
        console.error('Error loading job:', error);
      }
    });
  }

  private checkApplicationStatus(): void {
    if (!this.job) return;
    
    // Check if user has already applied using the service method
    this.jobService.hasUserApplied(this.job.id).subscribe({
      next: (response: any) => {
        this.hasApplied = response.data?.hasApplied || false;
      },
      error: (error: any) => {
        console.error('Error checking application status:', error);
        // Don't show error to user, just assume not applied
        this.hasApplied = false;
      }
    });
  }

  private loadSimilarJobs(): void {
    if (!this.job) return;
    
    this.jobService.getSimilarJobs(this.job.id, 4).subscribe({
      next: (response: any) => {
        this.similarJobs = response.data || [];
      },
      error: (error: any) => {
        console.error('Error loading similar jobs:', error);
        // Don't show error to user for similar jobs as it's not critical
      }
    });
  }

  applyToJob(): void {
    if (!this.job || this.applying || this.hasApplied) return;

    this.applying = true;
    
    this.jobService.applyToJob(this.job.id).subscribe({
      next: () => {
        this.hasApplied = true;
        this.applying = false;
        // Optionally show success message
      },
      error: (error: any) => {
        this.applying = false;
        console.error('Error applying to job:', error);
        // Show error message to user
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/jobs']); // Adjust route as needed
  }

  formatDate(date: Date | string): string {
    if (!date) return '';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  viewSimilarJob(job: JobOffer): void {
    this.router.navigate(['/jobs', job.id]);
  }

  // Company information methods
  getCompanyName(): string {
    return this.job?.company?.companyName 
           || this.job?.companyName 
           || 'Entreprise non spécifiée';
  }

  getCompanyIndustry(): string {
    return this.job?.company?.industry || '';
  }

  getCompanyWebsite(): string {
    return this.job?.company?.website || '';
  }

  getCompanyDescription(): string {
    return this.job?.company?.description || '';
  }

  getJobTypeDisplay(): string {
    return this.jobService.formatJobType(this.job?.jobType || '');
  }

  getContractTypeDisplay(): string {
    // For JobOffer interface, we use jobType which includes contract information
    return this.jobService.formatJobType(this.job?.jobType || '');
  }

  // Template helper methods that check for existence
  hasRequirements(): boolean {
    return !!(this.job?.requirements && this.job.requirements.trim().length > 0);
  }

  hasResponsibilities(): boolean {
    return !!(this.job?.responsibilities && this.job.responsibilities.trim().length > 0);
  }

  hasContactInfo(): boolean {
    // JobOffer doesn't have contactInfo, you might need to adjust this based on your data structure
    return false;
  }

  getRequirementsArray(): string[] {
    if (!this.job?.requirements) return [];
    
    // Split requirements string into array
    return this.job.requirements
      .split(/\n|;|•/)
      .map((req: string) => req.trim())
      .filter((req: string) => req.length > 0);
  }

  getResponsibilitiesArray(): string[] {
    if (!this.job?.responsibilities) return [];
    
    // Split responsibilities string into array
    return this.job.responsibilities
      .split(/\n|;|•/)
      .map((resp: string) => resp.trim())
      .filter((resp: string) => resp.length > 0);
  }

  getSimilarJobCompanyName(job: JobOffer): string {
    return job?.company?.companyName 
           || job?.companyName 
           || 'Entreprise non spécifiée';
  }

  getSimilarJobTypeDisplay(job: JobOffer): string {
    return this.jobService.formatJobType(job?.jobType || '');
  }

  // Get formatted salary using the service helper
  getSalaryDisplay(): string {
    if (!this.job) return '';
    return this.jobService.formatSalary(
      this.job.salaryMin, 
      this.job.salaryMax, 
      this.job.salaryCurrency
    );
  }

  // Check if job is expired
  isJobExpired(): boolean {
    return this.jobService.isJobExpired(this.job?.applicationDeadline);
  }

  // Get days until deadline
  getDaysUntilDeadline(): number | null {
    return this.jobService.getDaysUntilDeadline(this.job?.applicationDeadline);
  }
}