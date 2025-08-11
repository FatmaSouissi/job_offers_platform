import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CompanyService, SingleCompanyResponse } from '../../../services/company.service';
import { Company } from '../../../interfaces/company';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-company-details',
  standalone: false,
  templateUrl: './company-details.html',
  styleUrl: './company-details.css'
})
export class CompanyDetails implements OnInit, OnDestroy {
  public company: Company | null = null;
  public loading: boolean = false;
  public error: string = '';
  public companyJobs: any[] = [];
  public loadingJobs: boolean = false;
  
  private subscriptions: Subscription = new Subscription();
  private companyId: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.route.params.subscribe(params => {
        this.companyId = params['id'];
        if (this.companyId) {
          this.loadCompanyDetails();
          this.loadCompanyJobs();
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Load company details
   */
  
loadCompanyDetails(): void {
  this.loading = true;
  this.error = '';

  console.log('Loading company details for ID:', this.companyId); // Debug log

  this.subscriptions.add(
    this.companyService.getCompanyById(this.companyId).subscribe({
      next: (response: SingleCompanyResponse) => {
        console.log('Company details response:', response); // Debug log
        if (response.success) {
          this.company = response.data;
        } else {
          this.error = response.message || 'Entreprise non trouvée';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading company details:', error);
        
        // More specific error messages
        if (error.status === 404) {
          this.error = 'Cette entreprise n\'existe pas ou a été supprimée';
        } else if (error.status === 500) {
          this.error = 'Erreur du serveur. Veuillez réessayer plus tard';
        } else if (error.status === 0) {
          this.error = 'Impossible de se connecter au serveur. Vérifiez votre connexion';
        } else {
          this.error = `Erreur lors du chargement des détails (${error.status}: ${error.message})`;
        }
        
        this.loading = false;
      }
    })
  );
}

  /**
   * Load company jobs
   */
  loadCompanyJobs(): void {
    this.loadingJobs = true;

    this.subscriptions.add(
      this.companyService.getCompanyJobs(this.companyId).subscribe({
        next: (response) => {
          if (response.success) {
            this.companyJobs = response.data || [];
          }
          this.loadingJobs = false;
        },
        error: (error) => {
          console.error('Error loading company jobs:', error);
          this.loadingJobs = false;
        }
      })
    );
  }

  /**
   * Get company logo URL or placeholder
   */
  getCompanyLogo(): string {
  if (this.company?.profile?.logo) {
    return this.company.profile.logo;
  }
  // Use the same data URI placeholder
  return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjFGM0Y0Ii8+CjxwYXRoIGQ9Ik0zMCAzMEg3MFY3MEgzMFYzMFoiIGZpbGw9IiM2Qzc1N0QiLz4KPC9zdmc+';
}

  /**
   * Get display name for company
   */
  getCompanyDisplayName(): string {
    if (!this.company) return '';
    return this.company.profile?.companyName || `${this.company.companyName} `;
  }

  /**
   * Get company size label
   */
  getCompanySizeLabel(size: string): string {
    const sizeLabels: { [key: string]: string } = {
      'startup': 'Startup (1-10 employés)',
      'small': 'Petite entreprise (11-50 employés)',
      'medium': 'Moyenne entreprise (51-200 employés)',
      'large': 'Grande entreprise (201-1000 employés)',
      'enterprise': 'Très grande entreprise (1000+ employés)'
    };
    return sizeLabels[size] || size;
  }

  /**
   * Navigate to job details
   */
  viewJobDetails(jobId: string): void {
    this.router.navigate(['/job-details', jobId]);
  }

  /**
   * Go back to companies list
   */
  goBack(): void {
    this.router.navigate(['/companies']);
  }

  /**
   * Visit company website
   */
  visitWebsite(): void {
    if (this.company?.profile?.website) {
      window.open(this.company.profile.website, '_blank');
    }
  }
}