import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

// Services
import { AuthService } from '../../../services/auth.service';
import { JobService, JobFilters } from '../../../services/job.service';
import { ApplicationService, DetailedApplication } from '../../../services/application.service';
import { CompanyService } from '../../../services/company.service';

// Interfaces
import { JobOffer } from '../../../interfaces/jobOffer';
import { Company } from '../../../interfaces/company';
import { User } from '../../../interfaces/user';

type ApplicationStatus = 'pending' | 'reviewed' | 'accepted' | 'rejected';

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

interface JobWithApplications extends JobOffer {
  applicationCount: number;
  pendingApplications: number;
  reviewedApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
}

interface RecentActivity {
  text: string;
  time: Date;
  icon: string;
}

// Simple selection model for pure HTML/TypeScript
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

// Simple data source
class TableDataSource<T> {
  data: T[] = [];

  constructor(initialData: T[] = []) {
    this.data = [...initialData];
  }
}

@Component({
  selector: 'app-company-dash',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './company-dash.html',
  styleUrls: ['./company-dash.css'],
  providers: [DatePipe]
})
export class CompanyDash implements OnInit {
  // User and company info
  currentUser: User | null = null;
  companyInfo: Company | null = null;
  
  // Dashboard cards data
  dashboardCards: DashboardCard[] = [];
  
  // Jobs table
  jobsDataSource = new TableDataSource<JobWithApplications>();
  jobsSelection = new SelectionModel<JobWithApplications>(true, []);
  
  // Applications table
  applicationsDataSource = new TableDataSource<DetailedApplication>();
  applicationsSelection = new SelectionModel<DetailedApplication>(true, []);
  
  // UI state
  selectedTab = 0;
  loading = false;
  showMenu = false;
  
  // Job filters
  searchTerm = '';
  selectedJobType = '';
  selectedJobStatus = '';
  jobTypes = ['full-time', 'part-time', 'contract', 'internship'];
  
  // Application filters
  applicationSearchTerm = '';
  selectedApplicationStatus = '';
  selectedJobFilter = '';
  
  // Jobs pagination
  currentPage = 1;
  pageSize = 10;
  totalJobs = 0;
  totalPages = 0;
  
  // Applications pagination
  currentApplicationPage = 1;
  applicationPageSize = 10;
  totalApplications = 0;
  totalApplicationPages = 0;
  
  // Recent activities
  recentActivities: RecentActivity[] = [];

  constructor(
    private authService: AuthService,
    private jobService: JobService,
    private applicationService: ApplicationService,
    private companyService: CompanyService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.currentUser = this.authService.getCurrentUser();
    
    if (!this.currentUser || this.currentUser.userType !== 'company') {
      this.router.navigate(['/login']);
      return;
    }

    await this.loadDashboardData();
  }

  private async loadDashboardData(): Promise<void> {
    this.loading = true;
    try {
      // Load company info first as it's needed for all other data
      await this.loadCompanyInfo();
      
      // Verify we have company info before proceeding
      if (!this.companyInfo?.id) {
        this.showNotification('Unable to load company information. Please check your profile.', 'error');
        return;
      }

      console.log('Loading dashboard data for company:', this.companyInfo.id); // Debug log

      // Load all other data in parallel
      await Promise.all([
        this.loadDashboardCards(),
        this.loadJobs(),
        this.loadApplications(),
        this.loadRecentActivities()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showNotification('Error loading dashboard data', 'error');
    } finally {
      this.loading = false;
    }
  }

  private async loadCompanyInfo(): Promise<void> {
    try {
      const response = await firstValueFrom(this.companyService.getMyCompany());
      if (response?.success && response.data) {
        this.companyInfo = response.data;
        console.log('Company info loaded:', this.companyInfo); // Debug log
      } else {
        console.error('Failed to load company info:', response);
      }
    } catch (error) {
      console.error('Error loading company info:', error);
      this.showNotification('Error loading company information', 'error');
    }
  }

  private async loadDashboardCards(): Promise<void> {
    try {
      // Ensure we have company info before loading stats
      if (!this.companyInfo?.id) {
        await this.loadCompanyInfo();
      }

      if (!this.companyInfo?.id) {
        console.error('No company ID available for loading dashboard stats');
        // Set default cards if no company info
        this.dashboardCards = [
          { title: 'Total Job Offers', value: 0, icon: 'briefcase', color: '#667eea' },
          { title: 'Total Applications', value: 0, icon: 'file-alt', color: '#10b981' },
          { title: 'Pending Reviews', value: 0, icon: 'clock', color: '#f59e0b' },
          { title: 'Accepted Candidates', value: 0, icon: 'user-check', color: '#059669' }
        ];
        return;
      }

      console.log('Loading dashboard cards for company ID:', this.companyInfo.id); // Debug log

      const companyId = parseInt(this.companyInfo.id);
      
      // Load real data in parallel
      const [jobsResponse, applicationsResponse, statsResponse] = await Promise.all([
        // Get total jobs count for this company
        firstValueFrom(this.jobService.getJobs({ 
          page: 1, 
          limit: 1,
          companyId: companyId
        })).catch(error => {
          console.error('Error loading jobs count:', error);
          return null;
        }),
        
        // Get applications for this company
        firstValueFrom(this.applicationService.getApplicationsByCompany(companyId, 1, 1)).catch(error => {
          console.error('Error loading applications:', error);
          return null;
        }),
        
        // Get application statistics for this company
        firstValueFrom(this.applicationService.getApplicationStatistics(companyId)).catch(error => {
          console.error('Error loading application statistics:', error);
          return null;
        })
      ]);

      console.log('Dashboard data loaded:', { jobsResponse, applicationsResponse, statsResponse }); // Debug log

      // Calculate real statistics
      const totalJobs = jobsResponse?.pagination?.total || 0;
      const totalApplications = applicationsResponse?.pagination?.total || applicationsResponse?.data?.length || 0;
      
      // Get applications by status
      let pendingApplications = 0;
      let acceptedApplications = 0;
      let reviewedApplications = 0;
      let rejectedApplications = 0;

      if (applicationsResponse?.data) {
        applicationsResponse.data.forEach((app: DetailedApplication) => {
          switch (app.status) {
            case 'pending':
              pendingApplications++;
              break;
            case 'accepted':
              acceptedApplications++;
              break;
            case 'reviewed':
              reviewedApplications++;
              break;
            case 'rejected':
              rejectedApplications++;
              break;
          }
        });
      }

      // Use stats from API if available, otherwise use calculated values
      const stats = statsResponse?.data || {};
      
      this.dashboardCards = [
        {
          title: 'Total Job Offers',
          value: totalJobs,
          icon: 'briefcase',
          color: '#667eea',
          trend: stats.jobsTrend ? {
            value: Math.abs(stats.jobsTrend),
            isPositive: stats.jobsTrend > 0
          } : undefined
        },
        {
          title: 'Total Applications',
          value: stats.totalApplications || totalApplications,
          icon: 'file-alt',
          color: '#10b981',
          trend: stats.applicationsTrend ? {
            value: Math.abs(stats.applicationsTrend),
            isPositive: stats.applicationsTrend > 0
          } : undefined
        },
        {
          title: 'Pending Reviews',
          value: stats.pendingApplications || pendingApplications,
          icon: 'clock',
          color: '#f59e0b',
          trend: stats.pendingTrend ? {
            value: Math.abs(stats.pendingTrend),
            isPositive: stats.pendingTrend < 0 // Decreasing pending is positive
          } : undefined
        },
        {
          title: 'Accepted Candidates',
          value: stats.acceptedApplications || acceptedApplications,
          icon: 'user-check',
          color: '#059669',
          trend: stats.acceptedTrend ? {
            value: Math.abs(stats.acceptedTrend),
            isPositive: stats.acceptedTrend > 0
          } : undefined
        }
      ];

      console.log('Dashboard cards created:', this.dashboardCards); // Debug log

    } catch (error) {
      console.error('Error loading dashboard cards:', error);
      this.showNotification('Error loading dashboard statistics', 'error');
      // Set default cards on error
      this.dashboardCards = [
        { title: 'Total Job Offers', value: 0, icon: 'briefcase', color: '#667eea' },
        { title: 'Total Applications', value: 0, icon: 'file-alt', color: '#10b981' },
        { title: 'Pending Reviews', value: 0, icon: 'clock', color: '#f59e0b' },
        { title: 'Accepted Candidates', value: 0, icon: 'user-check', color: '#059669' }
      ];
    }
  }

  private async loadJobs(): Promise<void> {
    try {
      // Ensure we have company info before loading jobs
      if (!this.companyInfo?.id) {
        await this.loadCompanyInfo();
      }

      // If still no company info, show error and return
      if (!this.companyInfo?.id) {
        console.error('No company ID available for loading jobs');
        this.showNotification('Unable to load company information', 'error');
        return;
      }

      const companyId = parseInt(this.companyInfo.id);
      console.log('Loading jobs for company ID:', companyId); // Debug log

      // Build filters - ALWAYS include companyId to filter by current company
      const filters: JobFilters = {
        page: this.currentPage,
        limit: this.pageSize,
        companyId: companyId // This is the key fix - always filter by company ID
      };

      // Apply additional search and filters
      if (this.searchTerm.trim()) filters.search = this.searchTerm.trim();
      if (this.selectedJobType) filters.jobType = this.selectedJobType;
      if (this.selectedJobStatus !== '') {
        filters.isActive = this.selectedJobStatus === 'true';
      }

      console.log('Loading jobs with filters:', filters); // Debug log

      const response = await firstValueFrom(this.jobService.getJobs(filters));
      console.log('Jobs response:', response); // Debug log
      
      if (response?.success && response.data) {
        // Verify that loaded jobs belong to current company
        const filteredJobs = response.data.filter(job => job.companyId === companyId);
        console.log(`Loaded ${response.data.length} jobs, filtered to ${filteredJobs.length} for company ${companyId}`); // Debug log
        
        // Map jobs to include application counts
        const jobsWithApplications = await Promise.all(
          filteredJobs.map(async (job) => {
            try {
              // Get applications for this specific job
              const applicationsResponse = await firstValueFrom(
                this.applicationService.getApplicationsByJob(job.id, 1, 999) // Get all applications for counting
              );
              
              const applications = applicationsResponse?.data || [];
              const applicationStats = this.calculateApplicationStats(applications);
              
              return {
                ...job,
                ...applicationStats
              } as JobWithApplications;
            } catch (error) {
              console.error(`Error loading applications for job ${job.id}:`, error);
              return {
                ...job,
                applicationCount: 0,
                pendingApplications: 0,
                reviewedApplications: 0,
                acceptedApplications: 0,
                rejectedApplications: 0
              } as JobWithApplications;
            }
          })
        );

        this.jobsDataSource.data = jobsWithApplications;
        this.totalJobs = response.pagination.total;
        this.totalPages = response.pagination.pages;
        
        console.log('Jobs loaded successfully:', {
          totalJobs: this.totalJobs,
          currentPageJobs: jobsWithApplications.length,
          totalPages: this.totalPages
        }); // Debug log
      } else {
        console.error('Failed to load jobs:', response);
        this.jobsDataSource.data = [];
        this.totalJobs = 0;
        this.totalPages = 0;
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
      this.showNotification('Error loading jobs', 'error');
      this.jobsDataSource.data = [];
      this.totalJobs = 0;
      this.totalPages = 0;
    }
  }

  private calculateApplicationStats(applications: DetailedApplication[]) {
    const stats = {
      applicationCount: applications.length,
      pendingApplications: 0,
      reviewedApplications: 0,
      acceptedApplications: 0,
      rejectedApplications: 0
    };

    applications.forEach(app => {
      switch (app.status) {
        case 'pending':
          stats.pendingApplications++;
          break;
        case 'reviewed':
          stats.reviewedApplications++;
          break;
        case 'accepted':
          stats.acceptedApplications++;
          break;
        case 'rejected':
          stats.rejectedApplications++;
          break;
      }
    });

    return stats;
  }

  private async loadApplications(): Promise<void> {
    try {
      // Ensure we have company info before loading applications
      if (!this.companyInfo?.id) {
        await this.loadCompanyInfo();
      }

      // If still no company info, show error and return
      if (!this.companyInfo?.id) {
        console.error('No company ID available for loading applications');
        this.showNotification('Unable to load company information', 'error');
        return;
      }

      const companyId = parseInt(this.companyInfo.id);
      console.log('Loading applications for company ID:', companyId); // Debug log

      // Use getApplicationsByCompany to ensure we only get this company's applications
      let response;
      
      if (this.selectedJobFilter) {
        // If filtering by specific job, use getApplicationsByJob
        response = await firstValueFrom(
          this.applicationService.getApplicationsByJob(
            parseInt(this.selectedJobFilter), 
            this.currentApplicationPage, 
            this.applicationPageSize
          )
        );
      } else {
        // Otherwise, get all applications for this company
        response = await firstValueFrom(
          this.applicationService.getApplicationsByCompany(
            companyId,
            this.currentApplicationPage,
            this.applicationPageSize,
            this.selectedApplicationStatus || undefined
          )
        );
      }

      console.log('Applications response:', response); // Debug log
      
      if (response?.success && response.data) {
        let applications = response.data;
        
        // Apply search filter if provided
        if (this.applicationSearchTerm.trim()) {
          const searchTerm = this.applicationSearchTerm.toLowerCase();
          applications = applications.filter(app => 
            app.firstName.toLowerCase().includes(searchTerm) ||
            app.lastName.toLowerCase().includes(searchTerm) ||
            app.email.toLowerCase().includes(searchTerm) ||
            (app.job?.title || '').toLowerCase().includes(searchTerm)
          );
        }

        // Apply status filter if provided (and not already applied by API)
        if (this.selectedApplicationStatus && !this.selectedJobFilter) {
          applications = applications.filter(app => app.status === this.selectedApplicationStatus);
        }

        this.applicationsDataSource.data = applications;
        this.totalApplications = response.pagination?.total || applications.length;
        this.totalApplicationPages = response.pagination?.pages || Math.ceil(this.totalApplications / this.applicationPageSize);
        
        console.log('Applications loaded successfully:', {
          totalApplications: this.totalApplications,
          currentPageApplications: applications.length,
          totalPages: this.totalApplicationPages
        }); // Debug log
      } else {
        console.error('Failed to load applications:', response);
        this.applicationsDataSource.data = [];
        this.totalApplications = 0;
        this.totalApplicationPages = 0;
      }
    } catch (error) {
      console.error('Error loading applications:', error);
      this.showNotification('Error loading applications', 'error');
      this.applicationsDataSource.data = [];
      this.totalApplications = 0;
      this.totalApplicationPages = 0;
    }
  }

  private async loadRecentActivities(): Promise<void> {
    try {
      // Ensure we have company info
      if (!this.companyInfo?.id) {
        await this.loadCompanyInfo();
      }

      if (!this.companyInfo?.id) {
        this.recentActivities = [{
          text: 'No company information available',
          time: new Date(),
          icon: 'fa-info-circle'
        }];
        return;
      }

      const response = await firstValueFrom(
        this.applicationService.getRecentApplications(10, parseInt(this.companyInfo.id))
      );
      
      console.log('Recent activities response:', response); // Debug log
      
      if (response?.success && response.data && response.data.length > 0) {
        this.recentActivities = response.data.map(app => ({
          text: `New application from ${app.firstName} ${app.lastName} for ${app.job?.title || 'Unknown Job'}`,
          time: new Date(app.appliedAt),
          icon: 'fa-user-plus'
        }));
      } else {
        this.recentActivities = [{
          text: 'No recent applications',
          time: new Date(),
          icon: 'fa-info-circle'
        }];
      }
    } catch (error) {
      console.error('Error loading recent activities:', error);
      this.recentActivities = [
        {
          text: 'Error loading recent activity',
          time: new Date(),
          icon: 'fa-exclamation-triangle'
        }
      ];
    }
  }

  // Tab navigation
  selectTab(index: number): void {
    this.selectedTab = index;
  }

  // Menu toggle
  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  // Job actions
  createJob(): void {
    this.router.navigate(['/company/jobs/create']);
  }

  editJob(job: JobWithApplications): void {
    this.router.navigate(['/company/jobs/edit', job.id]);
  }

  duplicateJob(job: JobWithApplications): void {
    // Create a copy of the job without id and with modified title
    const jobCopy = {
      ...job,
      title: `${job.title} (Copy)`,
      createdAt: undefined,
      updatedAt: undefined
    };
    delete (jobCopy as any).id;
    
    this.router.navigate(['/company/jobs/create'], { 
      state: { jobData: jobCopy } 
    });
  }

  async deleteJob(job: JobWithApplications): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${job.title}"?`)) {
      return;
    }

    try {
      const response = await firstValueFrom(this.jobService.deleteJob(job.id));
      if (response?.success) {
        this.showNotification('Job deleted successfully', 'success');
        await Promise.all([this.loadJobs(), this.loadDashboardCards()]); // Refresh both jobs and cards
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      this.showNotification('Error deleting job', 'error');
    }
  }

  async toggleJobStatus(job: JobWithApplications): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.jobService.updateJob(job.id, { isActive: !job.isActive })
      );
      
      if (response?.success) {
        job.isActive = !job.isActive;
        this.showNotification(
          `Job ${job.isActive ? 'activated' : 'deactivated'} successfully`, 
          'success'
        );
        await this.loadDashboardCards(); // Refresh dashboard cards
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      this.showNotification('Error updating job status', 'error');
    }
  }

  viewApplications(job: JobWithApplications): void {
    this.selectedJobFilter = job.id.toString();
    this.selectTab(1);
    this.applyApplicationFilters();
  }

  // Job filters
  applyJobFilters(): void {
    this.currentPage = 1;
    this.loadJobs();
  }

  clearJobFilters(): void {
    this.searchTerm = '';
    this.selectedJobType = '';
    this.selectedJobStatus = '';
    this.currentPage = 1;
    this.loadJobs();
  }

  // Application filters
  applyApplicationFilters(): void {
    this.currentApplicationPage = 1;
    this.loadApplications();
  }

  clearApplicationFilters(): void {
    this.applicationSearchTerm = '';
    this.selectedApplicationStatus = '';
    this.selectedJobFilter = '';
    this.currentApplicationPage = 1;
    this.loadApplications();
  }

  // Job selection
  masterToggleJobs(): void {
    if (this.isAllJobsSelected()) {
      this.jobsSelection.clear();
    } else {
      this.jobsDataSource.data.forEach(job => this.jobsSelection.select(job));
    }
  }

  isAllJobsSelected(): boolean {
    return this.jobsDataSource.data.length > 0 && 
           this.jobsDataSource.data.every(job => this.jobsSelection.isSelected(job));
  }

  // Application selection
  masterToggleApplications(): void {
    if (this.isAllApplicationsSelected()) {
      this.applicationsSelection.clear();
    } else {
      this.applicationsDataSource.data.forEach(app => this.applicationsSelection.select(app));
    }
  }

  isAllApplicationsSelected(): boolean {
    return this.applicationsDataSource.data.length > 0 && 
           this.applicationsDataSource.data.every(app => this.applicationsSelection.isSelected(app));
  }

  // Bulk actions
  async bulkToggleStatus(): Promise<void> {
    if (this.jobsSelection.selected.length === 0) return;

    try {
      const promises = this.jobsSelection.selected.map(job => 
        firstValueFrom(this.jobService.updateJob(job.id, { isActive: !job.isActive }))
      );
      
      await Promise.all(promises);
      this.showNotification('Job statuses updated successfully', 'success');
      this.jobsSelection.clear();
      await Promise.all([this.loadJobs(), this.loadDashboardCards()]); // Refresh both
    } catch (error) {
      console.error('Error updating job statuses:', error);
      this.showNotification('Error updating job statuses', 'error');
    }
  }

  async deleteSelectedJobs(): Promise<void> {
    if (this.jobsSelection.selected.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${this.jobsSelection.selected.length} job(s)?`)) {
      return;
    }

    try {
      const promises = this.jobsSelection.selected.map(job => 
        firstValueFrom(this.jobService.deleteJob(job.id))
      );
      
      await Promise.all(promises);
      this.showNotification('Jobs deleted successfully', 'success');
      this.jobsSelection.clear();
      await Promise.all([this.loadJobs(), this.loadDashboardCards()]); // Refresh both
    } catch (error) {
      console.error('Error deleting jobs:', error);
      this.showNotification('Error deleting jobs', 'error');
    }
  }

  async bulkUpdateStatus(status: ApplicationStatus): Promise<void> {
    if (this.applicationsSelection.selected.length === 0) return;

    try {
      const applicationIds = this.applicationsSelection.selected.map(app => app.id);
      const response = await firstValueFrom(
        this.applicationService.bulkUpdateApplicationStatus(applicationIds, status)
      );
      
      if (response?.success) {
        this.showNotification(`Applications updated to ${status}`, 'success');
        this.applicationsSelection.clear();
        await Promise.all([this.loadApplications(), this.loadDashboardCards()]); // Refresh both
      }
    } catch (error) {
      console.error('Error updating application statuses:', error);
      this.showNotification('Error updating application statuses', 'error');
    }
  }

  // Application actions
  async updateApplicationStatus(application: DetailedApplication, event: Event): Promise<void> {
    const target = event.target as HTMLSelectElement;
    const newStatus = target.value as ApplicationStatus;

    try {
      const response = await firstValueFrom(
        this.applicationService.updateApplicationStatus(application.id, newStatus)
      );
      
      if (response?.success) {
        application.status = newStatus;
        this.showNotification('Application status updated', 'success');
        await this.loadDashboardCards(); // Refresh dashboard cards
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      this.showNotification('Error updating application status', 'error');
      // Revert the select value
      target.value = application.status;
    }
  }

  viewApplicationDetails(application: DetailedApplication): void {
    this.router.navigate(['/company/applications', application.id]);
  }

  contactApplicant(application: DetailedApplication): void {
    window.location.href = `mailto:${application.email}?subject=Regarding your application for ${application.job?.title}`;
  }

  async deleteApplication(application: DetailedApplication): Promise<void> {
    if (!confirm(`Are you sure you want to delete the application from ${application.firstName} ${application.lastName}?`)) {
      return;
    }

    try {
      const response = await firstValueFrom(
        this.applicationService.deleteApplication(application.id)
      );
      
      if (response?.success) {
        this.showNotification('Application deleted successfully', 'success');
        await Promise.all([this.loadApplications(), this.loadDashboardCards()]); // Refresh both
      }
    } catch (error) {
      console.error('Error deleting application:', error);
      this.showNotification('Error deleting application', 'error');
    }
  }

  downloadResume(resumeFile: string): void {
    if (resumeFile) {
      window.open(resumeFile, '_blank');
    }
  }

  // Jobs pagination
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadJobs();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadJobs();
    }
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadJobs();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    const endPage = Math.min(this.totalPages, startPage + maxPages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getStartIndex(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.totalJobs);
  }

  // Applications pagination
  previousApplicationPage(): void {
    if (this.currentApplicationPage > 1) {
      this.currentApplicationPage--;
      this.loadApplications();
    }
  }

  nextApplicationPage(): void {
    if (this.currentApplicationPage < this.totalApplicationPages) {
      this.currentApplicationPage++;
      this.loadApplications();
    }
  }

  goToApplicationPage(page: number): void {
    this.currentApplicationPage = page;
    this.loadApplications();
  }

  getApplicationPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    const startPage = Math.max(1, this.currentApplicationPage - Math.floor(maxPages / 2));
    const endPage = Math.min(this.totalApplicationPages, startPage + maxPages - 1);

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  getApplicationStartIndex(): number {
    return (this.currentApplicationPage - 1) * this.applicationPageSize + 1;
  }

  getApplicationEndIndex(): number {
    return Math.min(this.currentApplicationPage * this.applicationPageSize, this.totalApplications);
  }

  // Export functions
  exportJobs(): void {
    const csvContent = this.generateJobsCSV();
    this.downloadCSV(csvContent, 'jobs-export.csv');
  }

  exportApplications(): void {
    const csvContent = this.generateApplicationsCSV();
    this.downloadCSV(csvContent, 'applications-export.csv');
  }

  private generateJobsCSV(): string {
    const headers = ['Title', 'Type', 'Location', 'Salary Range', 'Applications', 'Status', 'Posted Date'];
    const rows = this.jobsDataSource.data.map(job => [
      job.title,
      this.formatJobType(job.jobType || ''),
      job.location,
      this.formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency),
      job.applicationCount.toString(),
      job.isActive ? 'Active' : 'Inactive',
      new Date(job.createdAt).toLocaleDateString()
    ]);

    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  private generateApplicationsCSV(): string {
    const headers = ['Applicant Name', 'Email', 'Phone', 'Job Title', 'Status', 'Applied Date'];
    const rows = this.applicationsDataSource.data.map(app => [
      `${app.firstName} ${app.lastName}`,
      app.email,
      app.phone || '',
      app.job?.title || '',
      app.status,
      new Date(app.appliedAt).toLocaleDateString()
    ]);

    return [headers, ...rows].map(row => 
      row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
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

  viewProfile(): void {
    this.router.navigate(['/company/profile']);
  }

  // Utility methods
  formatJobType(jobType: string): string {
    return this.jobService.formatJobType(jobType);
  }

  formatExperienceLevel(level: string): string {
    return this.jobService.formatExperienceLevel(level);
  }

  formatSalary(min?: number, max?: number, currency: string = 'TND'): string {
    return this.jobService.formatSalary(min, max, currency);
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    // Simple notification - you can replace with a proper notification service
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // You can implement a toast notification here
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 24px;
      border-radius: 8px;
      color: white;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  }
}