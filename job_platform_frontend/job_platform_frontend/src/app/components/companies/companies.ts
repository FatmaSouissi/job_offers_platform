import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyService, CompanyResponse } from '../../../services/company.service';
import { Company } from '../../../interfaces/company';
import { CompanyFilters } from '../../../interfaces/companyFilters';
import { Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-companies',
  standalone: false,
  templateUrl: './companies.html',
  styleUrl: './companies.css'
})
export class Companies implements OnInit, OnDestroy {
  public companies: Company[] = [];
  public loading: boolean = false;
  public error: string = '';
  public industries: string[] = [];
  
  // Pagination
  public currentPage: number = 1;
  public totalPages: number = 1;
  public totalCompanies: number = 0;
  public limit: number = 12;
  
  // Filters
  public filters: CompanyFilters = {
    page: 1,
    limit: 12,
    searchTerm: '',
    industry: '',
    companySize: ''
  };
  
  // Search
  private searchSubject = new Subject<string>();
  private subscriptions: Subscription = new Subscription();

  constructor(
    private companyService: CompanyService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadIndustries();
    this.loadCompanies();
    this.setupSearch();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Track by function for ngFor performance
   */
  trackByCompanyId(index: number, company: Company): string {
    return company.id || index.toString();
  }

  /**
   * Setup search with debounce
   */
  private setupSearch(): void {
    this.subscriptions.add(
      this.searchSubject
        .pipe(
          debounceTime(300),
          distinctUntilChanged()
        )
        .subscribe(searchTerm => {
          this.filters.searchTerm = searchTerm;
          this.filters.page = 1;
          this.currentPage = 1;
          this.loadCompanies();
        })
    );
  }

  /**
   * Load companies with current filters
   */
  loadCompanies(): void {
    this.loading = true;
    this.error = '';

    this.subscriptions.add(
      this.companyService.getCompanies(this.filters).subscribe({
        next: (response: CompanyResponse) => {
          console.log('Companies response:', response); // Debug log
          if (response.success) {
            this.companies = response.data || [];
            console.log('Loaded companies:', this.companies); // Debug log
            if (response.pagination) {
              this.currentPage = response.pagination.page;
              this.totalPages = response.pagination.pages;
              this.totalCompanies = response.pagination.total;
            }
          } else {
            this.error = 'Erreur lors du chargement des entreprises';
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading companies:', error);
          this.error = 'Erreur lors du chargement des entreprises';
          this.loading = false;
        }
      })
    );
  }

  /**
   * Load available industries
   */
  loadIndustries(): void {
    this.subscriptions.add(
      this.companyService.getIndustries().subscribe({
        next: (response) => {
          if (response.success) {
            this.industries = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading industries:', error);
        }
      })
    );
  }

  /**
   * Handle search input
   */
  onSearch(event: any): void {
    const searchTerm = event.target.value;
    this.searchSubject.next(searchTerm);
  }

  /**
   * Handle industry filter change
   */
  onIndustryChange(event: any): void {
    this.filters.industry = event.target.value;
    this.filters.page = 1;
    this.currentPage = 1;
    this.loadCompanies();
  }

  /**
   * Handle company size filter change
   */
  onCompanySizeChange(event: any): void {
    this.filters.companySize = event.target.value;
    this.filters.page = 1;
    this.currentPage = 1;
    this.loadCompanies();
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filters = {
      page: 1,
      limit: this.limit,
      searchTerm: '',
      industry: '',
      companySize: ''
    };
    this.currentPage = 1;
    
    // Reset form inputs
    const searchInput = document.getElementById('searchInput') as HTMLInputElement;
    const industrySelect = document.getElementById('industrySelect') as HTMLSelectElement;
    const sizeSelect = document.getElementById('sizeSelect') as HTMLSelectElement;
    
    if (searchInput) searchInput.value = '';
    if (industrySelect) industrySelect.value = '';
    if (sizeSelect) sizeSelect.value = '';
    
    this.loadCompanies();
  }

  /**
   * Handle pagination
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.filters.page = page;
      this.currentPage = page;
      this.loadCompanies();
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Get pages array for pagination
   */
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

  /**
   * Navigate to company detail page - FIXED VERSION
   */
 viewCompany(companyId: string): void {
  console.log('Navigating to company with ID:', companyId);
  
  if (!companyId || companyId === 'undefined') {
    console.error('Company ID is missing or undefined');
    return;
  }
  
  this.router.navigate(['/company', companyId]);
}


  /**
   * Get company logo URL or placeholder - FIXED VERSION
   */
  getCompanyLogo(company: Company): string {
    if (company?.profile?.logo) {
      return company.profile.logo;
    }
    // Use a simple gray placeholder
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjFGM0Y0Ii8+CjxwYXRoIGQ9Ik0zMCAzMEg3MFY3MEgzMFYzMFoiIGZpbGw9IiM2Qzc1N0QiLz4KPC9zdmc+';
  }

  /**
   * Get truncated description - FIXED VERSION
   */
  getTruncatedDescription(description: string | undefined, maxLength: number = 150): string {
  if (!description) return 'Aucune description disponible';
  return description.length > maxLength 
    ? description.substring(0, maxLength) + '...'
    : description;
}

  /**
   * Get display name for company - FIXED VERSION
   */
  getCompanyDisplayName(company: Company): string {
  if (!company) {
    console.warn('Company object is undefined');
    return 'Nom non disponible';
  }
  
  // Check multiple possible name fields
  if (company.profile?.companyName) {
    return company.profile.companyName;
  }
  
  if (company.companyName) {
    return company.companyName;
  }
  
  // If we have an email, extract company name from it
  if (company.email) {
    const domain = company.email.split('@')[1];
    if (domain) {
      return domain.split('.')[0];
    }
  }
  
  console.warn('No company name found for company:', company);
  return 'Nom non disponible';
}
}
