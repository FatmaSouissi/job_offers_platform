// jobs.ts - Updated to use JobService
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';


import { JobOffer } from '../../../interfaces/jobOffer';
import { JobFilters } from '../../../interfaces/jobFilters';

// Import your service
import { JobService } from '../../../services/job.service';

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jobs.html',
  styleUrls: ['./jobs.css'],
  providers: [DatePipe]
})
export class JobsComponent implements OnInit, OnDestroy {
  public jobs: JobOffer[] = [];
  public allJobs: JobOffer[] = [];
  public loading: boolean = false;
  public error: string = '';
  public totalJobs: number = 0;
  
  public filters: JobFilters = {
    type: '',
    location: '',
    skills: '',
    page: 1,
    limit: 10
  };

  private subscriptions: Subscription = new Subscription();

  constructor(
    private router: Router,
    private datePipe: DatePipe,
    private jobService: JobService
  ) {}

  ngOnInit(): void {
    this.loadJobs();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load all available jobs using JobService
   */
  public loadJobs(): void {
    this.loading = true;
    this.error = '';

    const subscription = this.jobService.getJobs(this.filters).subscribe({
      next: (response) => {
      if (response.success && response.data) {
        this.allJobs = response.data || [];
        this.jobs = [...this.allJobs];
        this.totalJobs = response.pagination.total || 0;
      } else {
        this.error = 'Erreur lors du chargement des offres';
      }
      this.loading = false;
    },
      error: (error) => {
        console.error('Error loading jobs:', error);
        this.error = 'Une erreur est survenue lors du chargement des offres';
        this.loading = false;
      }
    });

    this.subscriptions.add(subscription);
  }

  /**
   * Filter jobs based on current filter criteria
   */
  public filterJobs(): void {
    this.loading = true;
    
    const subscription = this.jobService.getJobs(this.filters).subscribe({
      next: (response) => {
      if (response.success && response.data) {
        this.jobs = response.data || [];
        this.totalJobs = response.pagination.total || 0;
      }
      this.loading = false;
    },
      error: (error) => {
        console.error('Error filtering jobs:', error);
        this.error = 'Erreur lors du filtrage des offres';
        this.loading = false;
      }
    });

    this.subscriptions.add(subscription);
  }

  /**
   * Clear all filters
   */
  public clearFilters(): void {
    this.filters = {
      type: '',
      location: '',
      skills: '',
      page: 1,
      limit: 10
    };
    this.loadJobs();
  }

  /**
   * Navigate to job details page
   */
  public viewJob(job: JobOffer): void {
    this.router.navigate(['/job-details', job.id]);
  }

  /**
   * Get company display name
   */
  public getCompanyName(job: JobOffer): string {
    return job.companyName  || 'Entreprise non spécifiée';
  }

  /**
   * Format job type for display
   */
  public formatJobType(type: string): string {
    const types: { [key: string]: string } = {
      'full-time': 'Temps plein',
      'part-time': 'Temps partiel',
      'contract': 'Contrat',
      'internship': 'Stage'
    };
    return types[type] || type;
  }

  /**
   * Format experience level for display
   */
  public formatExperienceLevel(level: string): string {
    const levels: { [key: string]: string } = {
      'entry': 'Débutant',
      'mid': 'Intermédiaire',
      'senior': 'Expérimenté',
      'executive': 'Cadre supérieur'
    };
    return levels[level] || level;
  }

  /**
   * Format salary for display
   */
  public formatSalary(min?: number, max?: number, currency: string = 'TND'): string {
    if (!min && !max) return 'Salaire non spécifié';
    if (min && max) return `${min} - ${max} ${currency}`;
    if (min) return `À partir de ${min} ${currency}`;
    if (max) return `Jusqu'à ${max} ${currency}`;
    return 'Salaire non spécifié';
  }

  /**
   * Get days until deadline
   */
  public getDaysUntilDeadline(deadline?: string): number | null {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get Math object for template
   */
  public get Math() {
    return Math;
  }

  /**
   * Get job posting date
   */
  public getJobPostingDate(createdAt: string): string {
    const date = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Publié hier';
    if (diffDays <= 7) return `Publié il y a ${diffDays} jours`;
    if (diffDays <= 30) return `Publié il y a ${Math.ceil(diffDays / 7)} semaine(s)`;
    
    return this.datePipe.transform(date, 'dd/MM/yyyy') || date.toLocaleDateString('fr-FR');
  }

  /**
   * Check if a job is new (posted within last 3 days)
   */
  public isNewJob(createdAt: string): boolean {
    const date = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays <= 3;
  }

  /**
   * Get truncated job description
   */
  public getTruncatedDescription(description: string, limit: number = 150): string {
    if (!description) return '';
    if (description.length <= limit) return description;
    return description.substring(0, limit) + '...';
  }

  /**
   * Sort jobs by date (newest first)
   */
  public sortByDate(): void {
    this.jobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Sort jobs by company name
   */
  public sortByCompany(): void {
    this.jobs.sort((a, b) => {
      const nameA = this.getCompanyName(a).toLowerCase();
      const nameB = this.getCompanyName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }

  /**
   * Sort jobs by type
   */
  public sortByType(): void {
    this.jobs.sort((a, b) => {
      if (a.jobType === b.jobType) return 0;
      return a.jobType === 'full-time' ? -1 : 1;
    });
  }

  /**
   * Get available locations for filter dropdown
   */
  public getAvailableLocations(): string[] {
    const locations = this.allJobs.map(job => job.location).filter(location => location);
    return [...new Set(locations)].sort();
  }

  /**
   * Get jobs count by type
   */
  public getJobCountByType(): { jobs: number; internships: number } {
    const fullTimeJobs = this.jobs.filter(job => 
      job.jobType === 'full-time' || job.jobType === 'part-time' || job.jobType === 'contract'
    ).length;
    
    const internships = this.jobs.filter(job => job.jobType === 'internship').length;
    
    return { jobs: fullTimeJobs, internships };
  }

  /**
   * Refresh job listings
   */
  public refreshJobs(): void {
    this.filters.page = 1; // Reset to first page
    this.loadJobs();
  }

  /**
   * Handle search input change
   */
  public onSearch(search: string): void {
    this.filters.search = search.trim();
    this.filters.page = 1; // Reset to first page
    
    if (search.trim()) {
      this.filterJobs();
    } else {
      this.loadJobs();
    }
  }

  /**
   * Export jobs data
   */
  public exportJobs(): void {
    const dataStr = JSON.stringify(this.jobs, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `jobs-export-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  /**
   * Handle pagination
   */
  public onPageChange(page: number): void {
    this.filters.page = page;
    this.filterJobs();
  }
}