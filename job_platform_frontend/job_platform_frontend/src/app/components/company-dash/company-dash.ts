import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';

// Services
import { AuthService } from '../../../services/auth.service';
import { JobService, JobFilters, JobOffersResponse } from '../../../services/job.service';
import { ApplicationService, DetailedApplication } from '../../../services/application.service';
import { CompanyService } from '../../../services/company.service';

// Interfaces
import { JobOffer } from '../../../interfaces/jobOffer';
import { Company } from '../../../interfaces/company';
import { User } from '../../../interfaces/user';
import { ApiResponse } from '../../../interfaces/loginRequest';

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
  companyName?: string;
  categoryName?: string;
}

interface RecentActivity {
  text: string;
  time: Date;
  icon: string;
}

// Enhanced Job Statistics Interface
interface JobStatistics {
  totalJobs: number;
  activeJobs: number;
  inactiveJobs: number;
  totalApplications: number;
  pendingApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
  reviewedApplications: number;
  avgApplicationsPerJob: number;
  topPerformingJobs: JobOffer[];
  recentJobs: JobOffer[];
  expiredJobs: JobOffer[];
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
  
  // Add these properties to your component class
analyticsData: {
  totalJobs: number;
  activeJobs: number;
  inactiveJobs: number;
  totalApplications: number;
  pendingApplications: number;
  reviewedApplications: number;
  acceptedApplications: number;
  rejectedApplications: number;
} = {
  totalJobs: 0,
  activeJobs: 0,
  inactiveJobs: 0,
  totalApplications: 0,
  pendingApplications: 0,
  reviewedApplications: 0,
  acceptedApplications: 0,
  rejectedApplications: 0
};

  // User and company info
  currentUser: User | null = null;
  companyInfo: Company | null = null;
  
  // Dashboard cards data
  dashboardCards: DashboardCard[] = [];
  
  // Enhanced job statistics
  jobStatistics: JobStatistics | null = null;
  
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
  
  // Enhanced filters and search
  searchTerm = '';
  selectedJobType = '';
  selectedJobStatus = '';
  selectedExperienceLevel = '';
  selectedLocation = '';
  selectedCategory = '';
  salaryMin: number | null = null;
  salaryMax: number | null = null;
  isRemoteFilter: boolean | null = null;
  
  // Available filter options (loaded from API)
  jobTypes = ['full-time', 'part-time', 'contract', 'internship'];
  experienceLevels = ['entry', 'mid', 'senior', 'executive'];
  jobCategories: any[] = [];
  availableLocations: string[] = [];
  
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

  // New properties for enhanced features
  savedJobs: JobOffer[] = [];
  similarJobs: { [jobId: number]: JobOffer[] } = {};
  
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

    console.log('Loading dashboard data for company:', this.companyInfo.id);

    // Load filter options first
    await Promise.all([
      this.loadJobCategories(),
      this.loadAvailableLocations()
    ]);

    // Load all other data in parallel including analytics data
    await Promise.all([
      this.loadAnalyticsData(), // Add this line to load analytics data
      this.loadEnhancedDashboardCards(),
      this.loadJobs(),
      this.loadApplications(),
      this.loadRecentActivities(),
      this.loadJobStatistics()
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
        console.log('Company info loaded:', this.companyInfo);
      } else {
        console.error('Failed to load company info:', response);
      }
    } catch (error) {
      console.error('Error loading company info:', error);
      this.showNotification('Error loading company information', 'error');
    }
  }

  // Load job categories for filters
  private async loadJobCategories(): Promise<void> {
    try {
      const response = await firstValueFrom(this.jobService.getJobCategories());
      if (response?.success && response.data) {
        this.jobCategories = response.data;
      }
    } catch (error) {
      console.error('Error loading job categories:', error);
    }
  }

  // Load available locations for filters
  private async loadAvailableLocations(): Promise<void> {
    try {
      const response = await firstValueFrom(this.jobService.getLocations());
      if (response?.success && response.data) {
        this.availableLocations = response.data;
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  }

  // Enhanced dashboard cards with comprehensive job statistics
  private async loadEnhancedDashboardCards(): Promise<void> {
  try {
    if (!this.companyInfo?.id) {
      await this.loadCompanyInfo();
    }

    if (!this.companyInfo?.id) {
      console.error('No company ID available for loading dashboard stats');
      this.dashboardCards = this.getDefaultDashboardCards();
      return;
    }

    //console.log(`Loading enhanced dashboard cards for company ID: ${this.companyInfo.id} (${this.companyInfo.name || 'Unknown Company'})`);
    const companyId = parseInt(this.companyInfo.id);
    
    // Load statistics if analytics data isn't loaded yet
    if (this.analyticsData.totalJobs === 0) {
      await this.loadAnalyticsData();
    }

    // Try to get trend data from the API (optional enhancement)
    let trendData: any = null;
    try {
      const statsResponse = await firstValueFrom(
        this.jobService.getCompanyJobStatistics(companyId)
      );
      trendData = statsResponse?.data;
    } catch (error) {
      //console.log('Trend data not available:', error.message);
    }

    // Use analytics data to create dashboard cards specifically for current company
    this.dashboardCards = [
      {
        title: 'Total Job Offers',
        value: this.analyticsData.totalJobs,
        icon: 'briefcase',
        color: '#667eea',
        trend: trendData?.jobsTrend ? {
          value: Math.abs(trendData.jobsTrend),
          isPositive: trendData.jobsTrend > 0
        } : undefined
      },
      {
        title: 'Active Jobs',
        value: this.analyticsData.activeJobs,
        icon: 'check-circle',
        color: '#10b981',
        trend: trendData?.activeJobsTrend ? {
          value: Math.abs(trendData.activeJobsTrend),
          isPositive: trendData.activeJobsTrend > 0
        } : undefined
      },
      {
        title: 'Total Applications',
        value: this.analyticsData.totalApplications,
        icon: 'file-alt',
        color: '#3b82f6',
        trend: trendData?.applicationsTrend ? {
          value: Math.abs(trendData.applicationsTrend),
          isPositive: trendData.applicationsTrend > 0
        } : undefined
      },
      {
        title: 'Pending Reviews',
        value: this.analyticsData.pendingApplications,
        icon: 'clock',
        color: '#f59e0b',
        trend: trendData?.pendingTrend ? {
          value: Math.abs(trendData.pendingTrend),
          isPositive: trendData.pendingTrend < 0 // Decreasing pending is positive
        } : undefined
      },
      {
        title: 'Accepted Candidates',
        value: this.analyticsData.acceptedApplications,
        icon: 'user-check',
        color: '#059669',
        trend: trendData?.acceptedTrend ? {
          value: Math.abs(trendData.acceptedTrend),
          isPositive: trendData.acceptedTrend > 0
        } : undefined
      },
      {
        title: 'Inactive Jobs',
        value: this.analyticsData.inactiveJobs,
        icon: 'pause-circle',
        color: '#6b7280',
        trend: trendData?.inactiveJobsTrend ? {
          value: Math.abs(trendData.inactiveJobsTrend),
          isPositive: trendData.inactiveJobsTrend < 0 // Decreasing inactive is positive
        } : undefined
      }
    ];

    console.log(`Enhanced dashboard cards created for company "${this.companyInfo.companyName || companyId}":`, {
      companyName: this.companyInfo.companyName,
      companyId: companyId,
      cardData: this.dashboardCards.map(card => ({ title: card.title, value: card.value }))
    });

  } catch (error) {
    console.error('Error loading enhanced dashboard cards:', error);
    this.showNotification('Error loading dashboard statistics', 'error');
    this.dashboardCards = this.getDefaultDashboardCards();
  }
  }
  
  // sync dashboard cards with analytics data
  private getDefaultDashboardCards(): DashboardCard[] {
    return [
      { title: 'Total Job Offers', value: 0, icon: 'briefcase', color: '#667eea' },
      { title: 'Active Jobs', value: 0, icon: 'check-circle', color: '#10b981' },
      { title: 'Total Applications', value: 0, icon: 'file-alt', color: '#3b82f6' },
      { title: 'Pending Reviews', value: 0, icon: 'clock', color: '#f59e0b' },
      { title: 'Accepted Candidates', value: 0, icon: 'user-check', color: '#059669' },
      { title: 'Inactive Jobs', value: 0, icon: 'pause-circle', color: '#6b7280' }
    ];
  }

  // Load comprehensive job statistics
  private async loadJobStatistics(): Promise<void> {
    try {
      if (!this.companyInfo?.id) return;

      const companyId = parseInt(this.companyInfo.id);
      const response = await firstValueFrom(
        this.jobService.getCompanyJobStatistics(companyId)
      );

      if (response?.success && response.data) {
        this.jobStatistics = response.data;
      }
    } catch (error) {
      console.error('Error loading job statistics:', error);
    }
  }

  // Enhanced job loading with all available filters
  private async loadJobs(): Promise<void> {
    try {
      if (!this.companyInfo?.id) {
        await this.loadCompanyInfo();
      }

      if (!this.companyInfo?.id) {
        console.error('No company ID available for loading jobs');
        this.showNotification('Unable to load company information', 'error');
        return;
      }

      const companyId = parseInt(this.companyInfo.id);
      console.log('Loading jobs for company ID:', companyId);

      // Build comprehensive filters
      const filters: JobFilters = {
        page: this.currentPage,
        limit: this.pageSize,
        companyId: companyId
      };

      // Apply all available filters
      if (this.searchTerm.trim()) filters.search = this.searchTerm.trim();
      if (this.selectedJobType) filters.jobType = this.selectedJobType;
      if (this.selectedExperienceLevel) filters.experienceLevel = this.selectedExperienceLevel;
      if (this.selectedLocation) filters.location = this.selectedLocation;
      if (this.selectedCategory) filters.categoryId = parseInt(this.selectedCategory);
      if (this.salaryMin) filters.salaryMin = this.salaryMin;
      if (this.salaryMax) filters.salaryMax = this.salaryMax;
      if (this.isRemoteFilter !== null) filters.isRemote = this.isRemoteFilter;
      if (this.selectedJobStatus !== '') {
        filters.isActive = this.selectedJobStatus === 'true';
      }

      console.log('Loading jobs with filters:', filters);

      const response = await firstValueFrom(this.jobService.getJobs(filters));
      console.log('Jobs response:', response);
      
      if (response?.success && response.data) {
        const filteredJobs = response.data.filter(job => job.companyId === companyId);
        console.log(`Loaded ${response.data.length} jobs, filtered to ${filteredJobs.length} for company ${companyId}`);
        
        // Enhanced job mapping with application counts and similar jobs
        const jobsWithApplications = await Promise.all(
          filteredJobs.map(async (job) => {
            try {
              // Get applications for this specific job
              const applicationsResponse = await firstValueFrom(
                this.applicationService.getApplicationsByJob(job.id, 1, 999)
              );
              
              const applications = applicationsResponse?.data || [];
              const applicationStats = this.calculateApplicationStats(applications);
              
              // Load similar jobs for each job (for enhanced recommendations)
              try {
                const similarJobsResponse = await firstValueFrom(
                  this.jobService.getSimilarJobs(job.id, 3)
                );
                if (similarJobsResponse?.success && similarJobsResponse.data) {
                  this.similarJobs[job.id] = similarJobsResponse.data;
                }
              } catch (error) {
                console.error(`Error loading similar jobs for job ${job.id}:`, error);
              }
              
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
        });
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



  // Activate job status 
  async activateJob(job: JobWithApplications): Promise<void> {
    try {
      const response = await firstValueFrom(this.jobService.activateJob(job.id));
      if (response?.success) {
        job.isActive = true;
        this.showNotification('Job activated successfully', 'success');
        await this.loadEnhancedDashboardCards();
      }
    } catch (error) {
      console.error('Error activating job:', error);
      this.showNotification('Error activating job', 'error');
    }
  }
 // Desactivate job status
  async deactivateJob(job: JobWithApplications): Promise<void> {
    try {
      const response = await firstValueFrom(this.jobService.deactivateJob(job.id));
      if (response?.success) {
        job.isActive = false;
        this.showNotification('Job deactivated successfully', 'success');
        await this.loadEnhancedDashboardCards();
      }
    } catch (error) {
      console.error('Error deactivating job:', error);
      this.showNotification('Error deactivating job', 'error');
    }
  }

  // Use the specific status update 
  async updateJobStatus(job: JobWithApplications, isActive: boolean): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.jobService.updateJobStatus(job.id, isActive)
      );
      
      if (response?.success) {
        job.isActive = isActive;
        this.showNotification(
          `Job ${isActive ? 'activated' : 'deactivated'} successfully`, 
          'success'
        );
        await this.loadEnhancedDashboardCards();
      }
    } catch (error) {
      console.error('Error updating job status:', error);
      this.showNotification('Error updating job status', 'error');
    }
  }

  // Get job status 
  async checkJobStatus(jobId: number): Promise<void> {
    try {
      const response = await firstValueFrom(this.jobService.getJobStatus(jobId));
      if (response?.success && response.data) {
        console.log('Job status:', response.data);
        this.showNotification(
          `Job "${response.data.title}" is currently ${response.data.isActive ? 'active' : 'inactive'}`,
          'info'
        );
      }
    } catch (error) {
      console.error('Error checking job status:', error);
      this.showNotification('Error checking job status', 'error');
    }
  }

  // Bulk operations using enhanced API methods
  async bulkActivateJobs(): Promise<void> {
    if (this.jobsSelection.selected.length === 0) return;

    try {
      const jobIds = this.jobsSelection.selected.map(job => job.id);
      const response = await firstValueFrom(
        this.jobService.bulkUpdateJobStatus(jobIds, true)
      );
      
      if (response) {
        this.showNotification('Jobs activated successfully', 'success');
        this.jobsSelection.clear();
        await Promise.all([this.loadJobs(), this.loadEnhancedDashboardCards()]);
      }
    } catch (error) {
      console.error('Error bulk activating jobs:', error);
      this.showNotification('Error activating jobs', 'error');
    }
  }

  async bulkDeactivateJobs(): Promise<void> {
    if (this.jobsSelection.selected.length === 0) return;

    try {
      const jobIds = this.jobsSelection.selected.map(job => job.id);
      const response = await firstValueFrom(
        this.jobService.bulkUpdateJobStatus(jobIds, false)
      );
      
      if (response) {
        this.showNotification('Jobs deactivated successfully', 'success');
        this.jobsSelection.clear();
        await Promise.all([this.loadJobs(), this.loadEnhancedDashboardCards()]);
      }
    } catch (error) {
      console.error('Error bulk deactivating jobs:', error);
      this.showNotification('Error deactivating jobs', 'error');
    }
  }

  // Enhanced toggle using the toggle API method
  async toggleJobStatus(job: JobWithApplications): Promise<void> {
    try {
      const response = await firstValueFrom(
        this.jobService.toggleJobStatus(job)
      );
      
      if (response?.success) {
        job.isActive = !job.isActive;
        this.showNotification(
          `Job ${job.isActive ? 'activated' : 'deactivated'} successfully`, 
          'success'
        );
        await this.loadEnhancedDashboardCards();
      }
    } catch (error) {
      console.error('Error toggling job status:', error);
      this.showNotification('Error updating job status', 'error');
    }
  }

  // Load saved jobs for company users (if applicable)
  async loadSavedJobs(): Promise<void> {
    try {
      const response = await firstValueFrom(this.jobService.getSavedJobs());
      if (response?.success && response.data) {
        this.savedJobs = response.data;
      }
    } catch (error) {
      console.error('Error loading saved jobs:', error);
    }
  }

  // Search jobs using dedicated search API
  async searchJobs(searchTerm: string): Promise<void> {
    if (!searchTerm.trim()) {
      this.clearJobFilters();
      return;
    }

    try {
      const response = await firstValueFrom(
        this.jobService.searchJobs(searchTerm, 50)
      );
      
      if (response?.success && response.data) {
        // Filter results to show only jobs from current company
        const companyJobs = response.data.filter(
          job => job.companyId === parseInt(this.companyInfo?.id || '0')
        );
        
        // Update the data source with search results
        const jobsWithApplications = await Promise.all(
          companyJobs.map(async (job) => {
            const applicationsResponse = await firstValueFrom(
              this.applicationService.getApplicationsByJob(job.id, 1, 999)
            ).catch(() => null);
            
            const applications = applicationsResponse?.data || [];
            const applicationStats = this.calculateApplicationStats(applications);
            
            return {
              ...job,
              ...applicationStats
            } as JobWithApplications;
          })
        );

        this.jobsDataSource.data = jobsWithApplications;
        this.totalJobs = jobsWithApplications.length;
        this.totalPages = 1; // Search results are not paginated
        
        this.showNotification(`Found ${jobsWithApplications.length} jobs matching "${searchTerm}"`, 'success');
      }
    } catch (error) {
      console.error('Error searching jobs:', error);
      this.showNotification('Error searching jobs', 'error');
    }
  }

  // Get similar jobs for recommendations
  getSimilarJobs(job: JobWithApplications): JobOffer[] {
    return this.similarJobs[job.id] || [];
  }

  // View similar jobs
  viewSimilarJobs(job: JobWithApplications): void {
    const similarJobs = this.getSimilarJobs(job);
    if (similarJobs.length > 0) {
      console.log(`Similar jobs for "${job.title}":`, similarJobs);
      // You could show these in a modal or navigate to a detailed view
      this.showNotification(`Found ${similarJobs.length} similar jobs`, 'info');
    } else {
      this.showNotification('No similar jobs found', 'info');
    }
  }

  // Check if user has applied to job (for display purposes)
  async hasUserApplied(jobId: number): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.jobService.hasUserApplied(jobId)
      );
      return response?.success && response.data?.hasApplied || false;
    } catch (error) {
      console.error('Error checking application status:', error);
      return false;
    }
  }

  // Get job statistics for display
  async viewJobStatistics(): Promise<void> {
    try {
      const response = await firstValueFrom(this.jobService.getJobStatistics());
      if (response?.success && response.data) {
        console.log('Global Job Statistics:', response.data);
        // You could display this data in a modal or separate view
        this.showNotification('Job statistics loaded successfully', 'success');
      }
    } catch (error) {
      console.error('Error loading job statistics:', error);
      this.showNotification('Error loading job statistics', 'error');
    }
  }

  // filter applications
  applyJobFilters(): void {
    this.currentPage = 1;
    this.loadJobs();
  }

  // clear filters
  clearJobFilters(): void {
    this.searchTerm = '';
    this.selectedJobType = '';
    this.selectedJobStatus = '';
    this.selectedExperienceLevel = '';
    this.selectedLocation = '';
    this.selectedCategory = '';
    this.salaryMin = null;
    this.salaryMax = null;
    this.isRemoteFilter = null;
    this.currentPage = 1;
    this.loadJobs();
  }

  filterByJobType(jobType: string): void {
    this.selectedJobType = jobType;
    this.applyJobFilters();
  }

  filterByExperience(level: string): void {
    this.selectedExperienceLevel = level;
    this.applyJobFilters();
  }

  filterByLocation(location: string): void {
    this.selectedLocation = location;
    this.applyJobFilters();
  }

  filterBySalaryRange(min: number | null, max: number | null): void {
    this.salaryMin = min;
    this.salaryMax = max;
    this.applyJobFilters();
  }

  // Toggle remote filter
  toggleRemoteFilter(): void {
    if (this.isRemoteFilter === null) {
      this.isRemoteFilter = true;
    } else if (this.isRemoteFilter === true) {
      this.isRemoteFilter = false;
    } else {
      this.isRemoteFilter = null;
    }
    this.applyJobFilters();
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
      if (!this.companyInfo?.id) {
        await this.loadCompanyInfo();
      }

      if (!this.companyInfo?.id) {
        console.error('No company ID available for loading applications');
        this.showNotification('Unable to load company information', 'error');
        return;
      }

      const companyId = parseInt(this.companyInfo.id);
      console.log('Loading applications for company ID:', companyId);

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

      console.log('Applications response:', response);
      
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
        });
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
      
      console.log('Recent activities response:', response);
      
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

editJob(job: JobOffer): void {
  console.log('Editing job:', job);
  if (!job.id) {
    alert('Error: Job ID not found');
    return;
  }
  this.router.navigate(['/company/jobs/edit', job.id]);
}

  async deleteJob(job: JobWithApplications): Promise<void> {
    if (!confirm(`Are you sure you want to delete "${job.title}"?`)) {
      return;
    }

    try {
      const response = await firstValueFrom(this.jobService.deleteJob(job.id));
      if (response?.success) {
        this.showNotification('Job deleted successfully', 'success');
        await Promise.all([this.loadJobs(), this.loadEnhancedDashboardCards()]);
      }
    } catch (error) {
      console.error('Error deleting job:', error);
      this.showNotification('Error deleting job', 'error');
    }
  }

  viewApplications(job: JobOffer): void {
  console.log('Viewing applications for job:', job);
  this.router.navigate(['/company/jobs', job.id, 'applications']);
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

  // Enhanced bulk actions
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
      await Promise.all([this.loadJobs(), this.loadEnhancedDashboardCards()]);
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
        await Promise.all([this.loadApplications(), this.loadEnhancedDashboardCards()]);
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
        await this.loadEnhancedDashboardCards();
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      this.showNotification('Error updating application status', 'error');
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
        await Promise.all([this.loadApplications(), this.loadEnhancedDashboardCards()]);
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

 /* Load and calculate analytics data */
  private async loadAnalyticsData(): Promise<void> {
  try {
    if (!this.companyInfo?.id) {
      await this.loadCompanyInfo();
    }

    if (!this.companyInfo?.id) {
      console.error('No company ID available for analytics');
      return;
    }

    const companyId = parseInt(this.companyInfo.id);
    console.log(`Loading analytics data for company ID: ${companyId} (${this.companyInfo.companyName || 'Unknown Company'})`);

    // Load all jobs for this company using the jobs service with company filter
    const allJobsFilters: JobFilters = {
      companyId: companyId,
      page: 1,
      limit: 1000 // Get all jobs for this company
    };

    const jobsResponse = await firstValueFrom(
      this.jobService.getJobs(allJobsFilters)
    ).catch(() => null);

    let allJobs: JobOffer[] = [];
    if (jobsResponse?.success && jobsResponse.data) {
      // Filter jobs to ensure they belong to current company
      allJobs = jobsResponse.data.filter(job => job.companyId === companyId);
    }

    // Separate active and inactive jobs
    const activeJobs = allJobs.filter(job => job.isActive);
    const inactiveJobs = allJobs.filter(job => !job.isActive);

    console.log(`Found ${allJobs.length} total jobs (${activeJobs.length} active, ${inactiveJobs.length} inactive)`);

    // Load all applications for this company using the applications service
    const applicationsResponse = await firstValueFrom(
      this.applicationService.getAllApplications({
        companyId: companyId,
        page: 1,
        limit: 1000 // Get all applications for this company
      })
    ).catch(() => null);

    let allApplications: DetailedApplication[] = [];
    if (applicationsResponse?.success && applicationsResponse.data) {
      // Filter applications to ensure they're for jobs from current company
      allApplications = applicationsResponse.data.filter(app => 
        app.job && app.job.companyId === companyId
      );
    }

    console.log(`Found ${allApplications.length} applications for company jobs`);

    // Alternative: If the above doesn't work, try using getApplicationsByCompany
    if (allApplications.length === 0) {
      try {
        const companyAppsResponse = await firstValueFrom(
          this.applicationService.getApplicationsByCompany(companyId, 1, 1000)
        );
        
        if (companyAppsResponse?.success && companyAppsResponse.data) {
          allApplications = companyAppsResponse.data;
          console.log(`Found ${allApplications.length} applications using getApplicationsByCompany`);
        }
      } catch (error) {
        console.error('Error loading applications by company:', error);
      }
    }

    // Calculate application statistics by status
    const pendingApplications = allApplications.filter(app => app.status === 'pending');
    const reviewedApplications = allApplications.filter(app => app.status === 'reviewed');
    const acceptedApplications = allApplications.filter(app => app.status === 'accepted');
    const rejectedApplications = allApplications.filter(app => app.status === 'rejected');

    // Update analytics data with actual calculated values
    this.analyticsData = {
      totalJobs: allJobs.length,
      activeJobs: activeJobs.length,
      inactiveJobs: inactiveJobs.length,
      totalApplications: allApplications.length,
      pendingApplications: pendingApplications.length,
      reviewedApplications: reviewedApplications.length,
      acceptedApplications: acceptedApplications.length,
      rejectedApplications: rejectedApplications.length
    };

    console.log(`Analytics data calculated for company "${this.companyInfo.companyName || companyId}":`, {
      companyId,
      analyticsData: this.analyticsData,
      breakdown: {
        totalJobs: {
          active: activeJobs.length,
          inactive: inactiveJobs.length,
          total: allJobs.length
        },
        applications: {
          pending: pendingApplications.length,
          reviewed: reviewedApplications.length,
          accepted: acceptedApplications.length,
          rejected: rejectedApplications.length,
          total: allApplications.length
        }
      }
    });

    // Try to get additional statistics using the application statistics API
    try {
      const statsResponse = await firstValueFrom(
        this.applicationService.getApplicationStatistics(companyId)
      );
      
      if (statsResponse?.success && statsResponse.data) {
        console.log('Additional application statistics:', statsResponse.data);
        
        // If the API returns different data structure, merge it with our calculated data
        if (statsResponse.data.totalApplications !== undefined) {
          // Update with API data if it provides more accurate numbers
          this.analyticsData.totalApplications = statsResponse.data.totalApplications || this.analyticsData.totalApplications;
        }
        
        if (statsResponse.data.statusBreakdown) {
          const breakdown = statsResponse.data.statusBreakdown;
          this.analyticsData.pendingApplications = breakdown.pending || this.analyticsData.pendingApplications;
          this.analyticsData.reviewedApplications = breakdown.reviewed || this.analyticsData.reviewedApplications;
          this.analyticsData.acceptedApplications = breakdown.accepted || this.analyticsData.acceptedApplications;
          this.analyticsData.rejectedApplications = breakdown.rejected || this.analyticsData.rejectedApplications;
        }
      }
    } catch (error) {
      console.error('Error loading application statistics (using calculated data):', error);
    }

    // Try to get job statistics using the job statistics API
    try {
      const jobStatsResponse = await firstValueFrom(
        this.jobService.getCompanyJobStatistics(companyId)
      );
      
      if (jobStatsResponse?.success && jobStatsResponse.data) {
        console.log('Additional job statistics:', jobStatsResponse.data);
        
        // If the API returns different data structure, merge it with our calculated data
        if (jobStatsResponse.data.totalJobs !== undefined) {
          this.analyticsData.totalJobs = jobStatsResponse.data.totalJobs || this.analyticsData.totalJobs;
        }
        
        if (jobStatsResponse.data.activeJobs !== undefined) {
          this.analyticsData.activeJobs = jobStatsResponse.data.activeJobs || this.analyticsData.activeJobs;
        }
        
        if (jobStatsResponse.data.inactiveJobs !== undefined) {
          this.analyticsData.inactiveJobs = jobStatsResponse.data.inactiveJobs || this.analyticsData.inactiveJobs;
        }
      }
    } catch (error) {
      console.error('Error loading job statistics (using calculated data):', error);
    }

    console.log('Final analytics data:', this.analyticsData);

  } catch (error) {
    console.error('Error loading analytics data:', error);
    // Set default values to prevent errors
    this.analyticsData = {
      totalJobs: 0,
      activeJobs: 0,
      inactiveJobs: 0,
      totalApplications: 0,
      pendingApplications: 0,
      reviewedApplications: 0,
      acceptedApplications: 0,
      rejectedApplications: 0
    };
  }
}

  /* Get analytics statistic by key */
  getAnalyticsStat(key: string): number {
    return (this.analyticsData as any)[key] || 0;
}

  /*Get application percentage by status*/
  getApplicationPercentage(status: string): number {
    const total = this.analyticsData.totalApplications;
    if (total === 0) return 0;

    let count = 0;
    switch (status) {
      case 'pending':
        count = this.analyticsData.pendingApplications;
        break;
      case 'reviewed':
        count = this.analyticsData.reviewedApplications;
        break;
      case 'accepted':
        count = this.analyticsData.acceptedApplications;
        break;
      case 'rejected':
        count = this.analyticsData.rejectedApplications;
        break;
    }

    return Math.round((count / total) * 100);
  }

  /* Get average applications per job */
  getAverageApplicationsPerJob(): number {
    if (this.analyticsData.totalJobs === 0) return 0;
    return Math.round((this.analyticsData.totalApplications / this.analyticsData.totalJobs) * 10) / 10;
}

/* Get acceptance rate percentage */
getAcceptanceRate(): number {
  if (this.analyticsData.totalApplications === 0) return 0;
  return Math.round((this.analyticsData.acceptedApplications / this.analyticsData.totalApplications) * 100);
}

/* Get response rate (reviewed + accepted + rejected vs total)*/
getResponseRate(): number {
  if (this.analyticsData.totalApplications === 0) return 0;
  const responded = this.analyticsData.reviewedApplications + 
                   this.analyticsData.acceptedApplications + 
                   this.analyticsData.rejectedApplications;
  return Math.round((responded / this.analyticsData.totalApplications) * 100);
}

/* Get top performing jobs based on application count*/
getTopPerformingJobs(): JobWithApplications[] {
  return this.jobsDataSource.data
    .sort((a, b) => (b.applicationCount || 0) - (a.applicationCount || 0))
    .slice(0, 5);
}

/*Get job performance score (0-100) */
getJobScore(job: JobWithApplications): number {
  const maxApplications = Math.max(...this.jobsDataSource.data.map(j => j.applicationCount || 0));
  if (maxApplications === 0) return 0;
  return Math.round(((job.applicationCount || 0) / maxApplications) * 100);
}

/*Check if current month trend is positive */
isCurrentMonthTrendPositive(): boolean {
  // This would need actual trend data from your API
  // For now, return true if we have recent applications
  return this.recentActivities.length > 0;
}

/* Get current month applications count*/
getCurrentMonthApplications(): number {
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  
  return this.applicationsDataSource.data.filter(app => {
    const appDate = new Date(app.appliedAt);
    return appDate.getMonth() === currentMonth && appDate.getFullYear() === currentYear;
  }).length;
}

/* Get last week applications count */
getLastWeekApplications(): number {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  return this.applicationsDataSource.data.filter(app => {
    const appDate = new Date(app.appliedAt);
    return appDate >= oneWeekAgo;
  }).length;
}

/* Get job success rate (accepted / total applications for that job) */
getJobSuccessRate(job: JobWithApplications): number {
  const total = job.applicationCount || 0;
  if (total === 0) return 0;
  const accepted = job.acceptedApplications || 0;
  return Math.round((accepted / total) * 100);
}

/*Get days since job was created */
getDaysActive(job: JobWithApplications): number {
  const created = new Date(job.createdAt);
  const today = new Date();
  const diffTime = today.getTime() - created.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

async refreshAnalytics(): Promise<void> {
  this.loading = true;
  try {
    await Promise.all([
      this.loadAnalyticsData(),
      this.loadJobs(),
      this.loadApplications(),
      this.loadEnhancedDashboardCards() // Refresh dashboard cards too
    ]);
     
    this.showNotification('Analytics refreshed successfully', 'success');
  } catch (error) {
    console.error('Error refreshing analytics:', error);
    this.showNotification('Error refreshing analytics', 'error');
  } finally {
    this.loading = false;
  }
}

// refresh analytics when switching tabs
selectTabs(index: number): void {
  this.selectedTab = index;
  
  // If switching to analytics tab (index 2), ensure data is fresh
  if (index === 2) {
    this.loadAnalyticsData();
  }
}

/* Export analytics report */
exportAnalyticsReport(): void {
  const reportData = {
    generatedAt: new Date().toISOString(),
    companyId: this.companyInfo?.id,
    //companyName: this.companyInfo?.name,
    analytics: this.analyticsData,
    topJobs: this.getTopPerformingJobs().map(job => ({
      title: job.title,
      applications: job.applicationCount,
      successRate: this.getJobSuccessRate(job),
      daysActive: this.getDaysActive(job)
    })),
    performance: {
      averageApplicationsPerJob: this.getAverageApplicationsPerJob(),
      acceptanceRate: this.getAcceptanceRate(),
      responseRate: this.getResponseRate()
    }
  };

  const csvContent = this.generateAnalyticsCSV(reportData);
  this.downloadCSV(csvContent, `analytics-report-${new Date().toISOString().split('T')[0]}.csv`);
}

/* Generate analytics CSV report */
private generateAnalyticsCSV(reportData: any): string {
  const headers = ['Metric', 'Value'];
  const rows = [
    ['Total Jobs', reportData.analytics.totalJobs],
    ['Active Jobs', reportData.analytics.activeJobs],
    ['Inactive Jobs', reportData.analytics.inactiveJobs],
    ['Total Applications', reportData.analytics.totalApplications],
    ['Pending Applications', reportData.analytics.pendingApplications],
    ['Reviewed Applications', reportData.analytics.reviewedApplications],
    ['Accepted Applications', reportData.analytics.acceptedApplications],
    ['Rejected Applications', reportData.analytics.rejectedApplications],
    ['Average Apps per Job', reportData.performance.averageApplicationsPerJob],
    ['Acceptance Rate (%)', reportData.performance.acceptanceRate],
    ['Response Rate (%)', reportData.performance.responseRate]
  ];

  return [headers, ...rows].map(row => 
    row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(',')
  ).join('\n');
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
    const headers = ['Title', 'Type', 'Experience Level', 'Location', 'Remote', 'Salary Range', 'Applications', 'Status', 'Posted Date'];
    const rows = this.jobsDataSource.data.map(job => [
      job.title,
      this.formatJobType(job.jobType || ''),
      this.formatExperienceLevel(job.experienceLevel || ''),
      job.location,
      job.isRemote ? 'Yes' : 'No',
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
    const headers = ['Applicant Name', 'Email', 'Phone', 'Job Title', 'Status', 'Applied Date', 'Experience Years'];
    const rows = this.applicationsDataSource.data.map(app => [
      `${app.firstName} ${app.lastName}`,
      app.email,
      app.phone || '',
      app.job?.title || '',
      app.status,
      new Date(app.appliedAt).toLocaleDateString(),
      //app.experienceYears?.toString() || ''
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

  // Utility methods with enhanced functionality
  formatJobType(jobType: string): string {
    return this.jobService.formatJobType(jobType);
  }

  formatExperienceLevel(level: string): string {
    return this.jobService.formatExperienceLevel(level);
  }

  formatSalary(min?: number, max?: number, currency: string = 'TND'): string {
    return this.jobService.formatSalary(min, max, currency);
  }

  // Check if job is expired
  isJobExpired(deadline?: string): boolean {
    return this.jobService.isJobExpired(deadline);
  }

  // Get days until deadline
  getDaysUntilDeadline(deadline?: string): number | null {
    return this.jobService.getDaysUntilDeadline(deadline);
  }

  // Format days until deadline for display
  formatDeadline(deadline?: string): string {
    if (!deadline) return 'No deadline';
    
    const days = this.getDaysUntilDeadline(deadline);
    if (days === null) return 'No deadline';
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  }

  // Get deadline status class for styling
  getDeadlineClass(deadline?: string): string {
    if (!deadline) return '';
    
    const days = this.getDaysUntilDeadline(deadline);
    if (days === null) return '';
    if (days < 0) return 'expired';
    if (days <= 3) return 'urgent';
    if (days <= 7) return 'warning';
    return 'normal';
  }

  // Advanced search functionality
  async performAdvancedSearch(): Promise<void> {
    if (!this.searchTerm.trim() && !this.selectedJobType && !this.selectedExperienceLevel && 
        !this.selectedLocation && !this.selectedCategory && !this.salaryMin && !this.salaryMax) {
      this.showNotification('Please enter search criteria', 'info');
      return;
    }

    this.applyJobFilters();
  }

  // Reset all filters and search
  resetAllFilters(): void {
    this.clearJobFilters();
    this.clearApplicationFilters();
  }

  // Show job performance analytics
  showJobAnalytics(job: JobWithApplications): void {
    const analytics = {
      job: job.title,
      applicationRate: job.applicationCount,
      conversionRate: job.applicationCount > 0 ? (job.acceptedApplications / job.applicationCount * 100).toFixed(1) + '%' : '0%',
      averageTimeToHire: 'N/A', // Could be calculated from application dates
      topSources: 'Direct Application', // Could be enhanced with actual data
      skillsMatch: 'High' // Could be calculated based on requirements vs applicant skills
    };

    console.log('Job Analytics:', analytics);
    this.showNotification(`Analytics for "${job.title}" - ${job.applicationCount} applications, ${analytics.conversionRate} conversion rate`, 'info');
  }

  // Show company performance dashboard
  showCompanyDashboard(): void {
    if (this.jobStatistics) {
      const summary = `Company Performance:
        Total Jobs: ${this.jobStatistics.totalJobs}
        Active Jobs: ${this.jobStatistics.activeJobs}
        Total Applications: ${this.jobStatistics.totalApplications}
        Avg Applications per Job: ${this.jobStatistics.avgApplicationsPerJob}`;
      
      console.log('Company Dashboard:', this.jobStatistics);
      this.showNotification('Company performance data logged to console', 'info');
    }
  }

  // Enhanced notification system
  private showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    console.log(`${type.toUpperCase()}: ${message}`);
    
    // Enhanced notification with better styling and animation
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fas fa-${this.getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      min-width: 300px;
      max-width: 500px;
      padding: 16px;
      border-radius: 8px;
      color: white;
      background: ${this.getNotificationColor(type)};
      z-index: 10000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      animation: slideInRight 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    // Add CSS for animation if not exists
    if (!document.getElementById('notification-styles')) {
      const style = document.createElement('style');
      style.id = 'notification-styles';
      style.textContent = `
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .notification-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .notification-close {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          margin-left: auto;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `;
      document.head.appendChild(style);
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
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'exclamation-circle';
      case 'warning': return 'exclamation-triangle';
      default: return 'info-circle';
    }
  }

  private getNotificationColor(type: string): string {
    switch (type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  }
}