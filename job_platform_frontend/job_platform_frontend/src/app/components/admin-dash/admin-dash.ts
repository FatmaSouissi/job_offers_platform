import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CompanyService } from '../../../services/company.service';
import { JobService } from '../../../services/job.service';
import { Company } from '../../../interfaces/company';
import { JobOffer } from '../../../interfaces/jobOffer';
import { CommonModule, NgIf, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

interface DashboardCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface CompanyWithJobs extends Company {
  jobCount: number;
  activeJobCount: number;
  totalApplications: number;
  lastJobPosted?: Date;
  industry: string;
  companySize: string;
  createdAt: string;
  logo?: string;     
  city?: string;      
  country?: string; 
}

// Simple selection model for pure HTML
class SelectionModel<T> {
  selected: T[] = [];

  constructor(private multiple: boolean = true, initialSelection: T[] = []) {
    this.selected = [...initialSelection];
  }

  isSelected(item: T): boolean {
    return this.selected.includes(item);
  }

  toggle(item: T): void {
    const index = this.selected.indexOf(item);
    if (index >= 0) {
      this.selected.splice(index, 1);
    } else {
      if (this.multiple) {
        this.selected.push(item);
      } else {
        this.selected = [item];
      }
    }
  }

  select(item: T): void {
    if (!this.isSelected(item)) {
      if (this.multiple) {
        this.selected.push(item);
      } else {
        this.selected = [item];
      }
    }
  }

  deselect(item: T): void {
    const index = this.selected.indexOf(item);
    if (index >= 0) {
      this.selected.splice(index, 1);
    }
  }

  clear(): void {
    this.selected = [];
  }

  hasValue(): boolean {
    return this.selected.length > 0;
  }
}

// Simple data source for pure HTML
class TableDataSource<T> {
  data: T[] = [];

  constructor(initialData: T[] = []) {
    this.data = [...initialData];
  }
}

@Component({
  selector: 'app-admin-dash',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './admin-dash.html',
  styleUrls: ['./admin-dash.css'],
  providers: [DatePipe]
})
export class AdminDash implements OnInit {
  // Dashboard cards data
  dashboardCards: DashboardCard[] = [];
  
  // Companies table
  companiesDataSource = new TableDataSource<CompanyWithJobs>();
  companiesSelection = new SelectionModel<CompanyWithJobs>(true, []);
  
  // Jobs table
  jobsDataSource = new TableDataSource<JobOffer>();
  jobsSelection = new SelectionModel<JobOffer>(true, []);
  
  // UI state
  selectedTab = 0;
  loading = false;
  searchTerm = '';
  selectedIndustry = '';
  selectedJobType = '';
  selectedCompanySize = '';
  showMenu = false;
  
  // Filter options
  industries: string[] = [];
  jobTypes = ['full-time', 'part-time', 'contract', 'internship'];
  companySizes = ['1-10', '11-50', '51-200', '201-500', '500+'];
  
  // Job status management
  updatingJobStatus: Set<number> = new Set();
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  
  constructor(
    private companyService: CompanyService,
    private jobService: JobService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadDashboardData();
    this.loadIndustries();
  }
  
  private async loadDashboardData(): Promise<void> {
    this.loading = true;
    try {
      await Promise.all([
        this.loadDashboardCards(),
        this.loadCompanies(),
        this.loadJobs()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showNotification('Error loading dashboard data', 'error');
    } finally {
      this.loading = false;
    }
  }
  
  private async loadDashboardCards(): Promise<void> {
    try {
      // Load companies
      const companiesResponse = await this.companyService.getCompanies({ limit: 1000 }).toPromise();
      const totalCompanies = companiesResponse?.pagination?.total || 0;
      
      // Load jobs
      const jobsResponse = await this.jobService.getJobs({ limit: 1000 }).toPromise();
      const inactiveJobs = jobsResponse?.pagination?.total || 0;
      
      // Load active jobs
      const activeJobsResponse = await this.jobService.getJobs({ 
        limit: 1000, 
        isActive: true 
      }).toPromise();
      const activeJobs = activeJobsResponse?.pagination?.total || 0;
      
      // Calculate statistics (mock trends for now)
      this.dashboardCards = [
        {
          title: 'Total Companies',
          value: totalCompanies,
          icon: 'building',
          color: '#2196F3',
          trend: { value: 12, isPositive: true }
        },
        {
          title: 'Inactive Job Offers',
          value: inactiveJobs,
          icon: 'briefcase',
          color: '#4CAF50',
          trend: { value: 8, isPositive: true }
        },
        {
          title: 'Active Jobs',
          value: activeJobs,
          icon: 'chart-line',
          color: '#FF9800',
          trend: { value: 5, isPositive: true }
        },
        {
          title: 'Total Applications',
          value: '2.4K', // This would come from a statistics endpoint
          icon: 'users',
          color: '#9C27B0',
          trend: { value: 15, isPositive: true }
        }
      ];
    } catch (error) {
      console.error('Error loading dashboard cards:', error);
    }
  }
  
  private async loadCompanies(): Promise<void> {
    try {
      const response = await this.companyService.getCompanies({
        limit: 1000,
        searchTerm: this.searchTerm || undefined,
        industry: this.selectedIndustry || undefined,
        companySize: this.selectedCompanySize || undefined
      }).toPromise();
      
      if (response?.success && response.data) {
        // Enhance companies with job statistics
        const companiesWithJobs = await Promise.all(
          response.data.map(async (company) => {
            try {
              const jobsResponse = await this.companyService.getCompanyJobs(company.id.toString()).toPromise();
              const jobs = jobsResponse?.data || [];
              
              return {
                ...company,
                jobCount: jobs.length,
                activeJobCount: jobs.filter((job: any) => job.is_active).length,
                totalApplications: jobs.reduce((sum: number, job: any) => sum + (job.application_count || 0), 0),
                lastJobPosted: jobs.length > 0 ? new Date(jobs[0].created_at) : undefined
              } as CompanyWithJobs;
            } catch (error) {
              return {
                ...company,
                jobCount: 0,
                activeJobCount: 0,
                totalApplications: 0
              } as CompanyWithJobs;
            }
          })
        );
        
        this.companiesDataSource.data = companiesWithJobs;
        this.totalItems = companiesWithJobs.length;
        this.updatePagination();
      }
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  }
  
  private async loadJobs(): Promise<void> {
    try {
      const response = await this.jobService.getJobs({
        limit: 1000,
        search: this.searchTerm || undefined,
        jobType: this.selectedJobType || undefined
      }).toPromise();
      
      if (response?.data) {
        this.jobsDataSource.data = response.data;
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  }
  
  private async loadIndustries(): Promise<void> {
    try {
      const response = await this.companyService.getIndustries().toPromise();
      if (response?.success) {
        this.industries = response.data;
      }
    } catch (error) {
      console.error('Error loading industries:', error);
    }
  }

  // Tab Management
  selectTab(tabIndex: number): void {
    this.selectedTab = tabIndex;
  }

  // Menu Management
  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  // Pagination
  private updatePagination(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
  
  // Table selection methods
  isAllCompaniesSelected(): boolean {
    const numSelected = this.companiesSelection.selected.length;
    const numRows = this.companiesDataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }
  
  isAllJobsSelected(): boolean {
    const numSelected = this.jobsSelection.selected.length;
    const numRows = this.jobsDataSource.data.length;
    return numSelected === numRows && numRows > 0;
  }
  
  masterToggleCompanies(): void {
    if (this.isAllCompaniesSelected()) {
      this.companiesSelection.clear();
    } else {
      this.companiesDataSource.data.forEach((row: CompanyWithJobs) => 
        this.companiesSelection.select(row)
      );
    }
  }
  
  masterToggleJobs(): void {
    if (this.isAllJobsSelected()) {
      this.jobsSelection.clear();
    } else {
      this.jobsDataSource.data.forEach((row: JobOffer) => 
        this.jobsSelection.select(row)
      );
    }
  }
  
  // Filter methods
  applyCompanyFilter(): void {
    this.loadCompanies();
    this.showMenu = false;
  }
  
  applyJobFilter(): void {
    this.loadJobs();
    this.showMenu = false;
  }
  
  clearFilters(): void {
    this.searchTerm = '';
    this.selectedIndustry = '';
    this.selectedJobType = '';
    this.selectedCompanySize = '';
    this.loadCompanies();
    this.loadJobs();
    this.showMenu = false;
  }
  
  // Company CRUD operations
  createCompany(): void {
    // Open create company dialog or navigate to create page
    console.log('Create company dialog');
    this.showNotification('Create company feature to be implemented', 'info');
  }
  
  editCompany(company: Company): void {
    // Open edit company dialog or navigate to edit page
    console.log('Edit company:', company);
    this.showNotification(`Edit ${company.companyName} feature to be implemented`, 'info');
  }
  
  async deleteCompany(company: Company): Promise<void> {
    if (confirm(`Are you sure you want to delete ${company.companyName}?`)) {
      try {
        await this.companyService.deleteCompany(company.id.toString()).toPromise();
        this.showNotification('Company deleted successfully', 'success');
        this.loadCompanies();
        this.loadDashboardCards();
      } catch (error) {
        this.showNotification('Error deleting company', 'error');
      }
    }
  }
  
  async deleteSelectedCompanies(): Promise<void> {
    const selectedCompanies = this.companiesSelection.selected;
    if (selectedCompanies.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedCompanies.length} companies?`)) {
      try {
        await Promise.all(
          selectedCompanies.map((company: CompanyWithJobs) => 
            this.companyService.deleteCompany(company.id.toString()).toPromise()
          )
        );
        this.showNotification(`${selectedCompanies.length} companies deleted successfully`, 'success');
        this.companiesSelection.clear();
        this.loadCompanies();
        this.loadDashboardCards();
      } catch (error) {
        this.showNotification('Error deleting companies', 'error');
      }
    }
  }
  
  // Enhanced Job Status Management
  async toggleJobStatus(job: JobOffer): Promise<void> {
    if (this.updatingJobStatus.has(job.id)) {
      return; // Prevent multiple simultaneous updates
    }

    this.updatingJobStatus.add(job.id);
    const newStatus = !job.isActive;
    
    try {
      const response = await this.jobService.updateJobStatus(job.id, newStatus).toPromise();
      
      if (response?.success) {
        // Update local state
        job.isActive = newStatus;
        
        // Show success notification
        this.showNotification(
          `Job "${job.title}" ${newStatus ? 'activated' : 'deactivated'} successfully`, 
          'success'
        );
        
        // Refresh dashboard cards to update active job count
        this.loadDashboardCards();
        
        // If we're filtering by active status, refresh the jobs list
        if (this.selectedJobType || this.searchTerm) {
          this.loadJobs();
        }
      } else {
        throw new Error(response?.message || 'Failed to update job status');
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      this.showNotification(
        `Error ${newStatus ? 'activating' : 'deactivating'} job "${job.title}"`, 
        'error'
      );
      
      // Revert the toggle if it was changed optimistically
      // Note: We're not doing optimistic updates in this implementation
    } finally {
      this.updatingJobStatus.delete(job.id);
    }
  }

  // Bulk job status operations
  async activateSelectedJobs(): Promise<void> {
    const selectedJobs = this.jobsSelection.selected.filter(job => !job.isActive);
    if (selectedJobs.length === 0) {
      this.showNotification('No inactive jobs selected', 'info');
      return;
    }

    const confirmMessage = `Are you sure you want to activate ${selectedJobs.length} job${selectedJobs.length > 1 ? 's' : ''}?`;
    if (!confirm(confirmMessage)) return;

    try {
      const results = await Promise.allSettled(
        selectedJobs.map(job => this.jobService.activateJob(job.id).toPromise())
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (successful > 0) {
        // Update local state for successful activations
        selectedJobs.forEach(job => job.isActive = true);
        this.showNotification(`${successful} job${successful > 1 ? 's' : ''} activated successfully`, 'success');
      }

      if (failed > 0) {
        this.showNotification(`${failed} job${failed > 1 ? 's' : ''} failed to activate`, 'error');
      }

      this.jobsSelection.clear();
      this.loadDashboardCards();
    } catch (error) {
      this.showNotification('Error activating selected jobs', 'error');
    }
  }

  async deactivateSelectedJobs(): Promise<void> {
    const selectedJobs = this.jobsSelection.selected.filter(job => job.isActive);
    if (selectedJobs.length === 0) {
      this.showNotification('No active jobs selected', 'info');
      return;
    }

    const confirmMessage = `Are you sure you want to deactivate ${selectedJobs.length} job${selectedJobs.length > 1 ? 's' : ''}?`;
    if (!confirm(confirmMessage)) return;

    try {
      const results = await Promise.allSettled(
        selectedJobs.map(job => this.jobService.deactivateJob(job.id).toPromise())
      );

      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (successful > 0) {
        // Update local state for successful deactivations
        selectedJobs.forEach(job => job.isActive = false);
        this.showNotification(`${successful} job${successful > 1 ? 's' : ''} deactivated successfully`, 'success');
      }

      if (failed > 0) {
        this.showNotification(`${failed} job${failed > 1 ? 's' : ''} failed to deactivate`, 'error');
      }

      this.jobsSelection.clear();
      this.loadDashboardCards();
    } catch (error) {
      this.showNotification('Error deactivating selected jobs', 'error');
    }
  }

  // Check if job status is being updated
  isJobStatusUpdating(jobId: number): boolean {
    return this.updatingJobStatus.has(jobId);
  }

  // Get count of selected active/inactive jobs
  getSelectedActiveJobsCount(): number {
    return this.jobsSelection.selected.filter(job => job.isActive).length;
  }

  getSelectedInactiveJobsCount(): number {
    return this.jobsSelection.selected.filter(job => !job.isActive).length;
  }
  
  // Job operations
  viewJobDetails(job: JobOffer): void {
    console.log('View job details:', job);
    this.showNotification(`View details for ${job.title} feature to be implemented`, 'info');
  }
  
  async deleteJob(job: JobOffer): Promise<void> {
    if (confirm(`Are you sure you want to delete "${job.title}"?`)) {
      try {
        await this.jobService.deleteJob(job.id).toPromise();
        this.showNotification('Job deleted successfully', 'success');
        this.loadJobs();
        this.loadDashboardCards();
      } catch (error) {
        this.showNotification('Error deleting job', 'error');
      }
    }
  }
  
  async deleteSelectedJobs(): Promise<void> {
    const selectedJobs = this.jobsSelection.selected;
    if (selectedJobs.length === 0) return;
    
    if (confirm(`Are you sure you want to delete ${selectedJobs.length} jobs?`)) {
      try {
        await Promise.all(
          selectedJobs.map(job => this.jobService.deleteJob(job.id).toPromise())
        );
        this.showNotification(`${selectedJobs.length} jobs deleted successfully`, 'success');
        this.jobsSelection.clear();
        this.loadJobs();
        this.loadDashboardCards();
      } catch (error) {
        this.showNotification('Error deleting jobs', 'error');
      }
    }
  }
  
  // Utility methods
  formatSalary(min?: number, max?: number, currency: string = 'TND'): string {
    if (!min && !max) return 'Not specified';
    if (min && max) return `${min} - ${max} ${currency}`;
    if (min) return `From ${min} ${currency}`;
    if (max) return `Up to ${max} ${currency}`;
    return 'Not specified';
  }
  
  formatJobType(jobType: string): string {
    const types: { [key: string]: string } = {
      'full-time': 'Full Time',
      'part-time': 'Part Time',
      'contract': 'Contract',
      'internship': 'Internship'
    };
    return types[jobType] || jobType;
  }
  
  formatExperienceLevel(level: string): string {
    const levels: { [key: string]: string } = {
      'entry': 'Entry Level',
      'mid': 'Mid Level',
      'senior': 'Senior Level',
      'executive': 'Executive'
    };
    return levels[level] || level;
  }
  
  // Notification system (simple implementation)
  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas ${this.getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // Add styles if not already present
    if (!document.querySelector('#notification-styles')) {
      const styles = document.createElement('style');
      styles.id = 'notification-styles';
      styles.textContent = `
        .notification {
          position: fixed;
          top: 20px;
          right: 20px;
          min-width: 300px;
          max-width: 500px;
          padding: 1rem;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          z-index: 10000;
          animation: slideInRight 0.3s ease-out;
        }
        
        .notification-success {
          background: #dcfce7;
          border-left: 4px solid #10b981;
          color: #065f46;
        }
        
        .notification-error {
          background: #fee2e2;
          border-left: 4px solid #ef4444;
          color: #991b1b;
        }
        
        .notification-info {
          background: #dbeafe;
          border-left: 4px solid #3b82f6;
          color: #1e3a8a;
        }
        
        .notification-content {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .notification-close {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 4px;
          opacity: 0.7;
        }
        
        .notification-close:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.1);
        }
        
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `;
      document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }
  
  private getNotificationIcon(type: string): string {
    const icons = {
      'success': 'fa-check-circle',
      'error': 'fa-exclamation-circle',
      'info': 'fa-info-circle'
    };
    return icons[type as keyof typeof icons] || 'fa-info-circle';
  }
  
  // Export functionality
  exportCompanies(): void {
    try {
      const csvContent = this.generateCompaniesCSV();
      this.downloadCSV(csvContent, 'companies.csv');
      this.showNotification('Companies exported successfully', 'success');
    } catch (error) {
      this.showNotification('Error exporting companies', 'error');
    }
    this.showMenu = false;
  }
  
  exportJobs(): void {
    try {
      const csvContent = this.generateJobsCSV();
      this.downloadCSV(csvContent, 'jobs.csv');
      this.showNotification('Jobs exported successfully', 'success');
    } catch (error) {
      this.showNotification('Error exporting jobs', 'error');
    }
    this.showMenu = false;
  }
  
  private generateCompaniesCSV(): string {
    const headers = ['Company Name', 'Industry', 'Size', 'Location', 'Total Jobs', 'Active Jobs', 'Applications', 'Created Date'];
    const rows = this.companiesDataSource.data.map(company => [
      company.companyName,
      company.industry,
      company.companySize,
      //`${company.city}, ${company.country}`,
      company.jobCount.toString(),
      company.activeJobCount.toString(),
      company.totalApplications.toString(),
      new Date(company.createdAt).toLocaleDateString()
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  }
  
  private generateJobsCSV(): string {
    const headers = ['Job Title', 'Company', 'Type', 'Level', 'Location', 'Salary', 'Applications', 'Status', 'Posted Date'];
    const rows = this.jobsDataSource.data.map(job => [
      job.title,
      job.companyName,
      this.formatJobType(job.jobType),
      this.formatExperienceLevel(job.experienceLevel),
      job.location,
      this.formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency),
      (job.applicationCount || 0).toString(),
      job.isActive ? 'Active' : 'Inactive',
      new Date(job.createdAt).toLocaleDateString()
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
  }
  
  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Helper method for Math functions in template
  Math = Math;
}