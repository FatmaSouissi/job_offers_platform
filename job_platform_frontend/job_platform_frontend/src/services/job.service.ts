// services/job.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ApiResponse } from '../interfaces/loginRequest';
import { JobOffer } from '../interfaces/jobOffer';
//import { JobFilters } from '../interfaces/jobFilters';
import { JobApplication } from '../interfaces/jobApplication';


// Interface for API response
export interface JobOffersResponse {
  success: boolean;
  data: JobOffer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Interface for filter parameters
export interface JobFilters {
  page?: number;
  limit?: number;
  search?: string;
  jobType?: string;
  experienceLevel?: string;
  categoryId?: number;
  location?: string;
  isRemote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  companyId?: number;
  isActive?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class JobService {
  private readonly API_URL = 'http://localhost:3000/api'; // Adjust to your backend URL

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Get all job offers with filters
  getJobs(filters?: JobFilters): Observable<JobOffersResponse> {
    let params = new HttpParams();

    if (filters) {
      // Add pagination parameters
      if (filters.page !== undefined) {
        params = params.set('page', filters.page.toString());
      }
      if (filters.limit !== undefined) {
        params = params.set('limit', filters.limit.toString());
      }

      // Add search parameter
      if (filters.search) {
        params = params.set('search', filters.search);
      }

      // Add filter parameters
      if (filters.jobType) {
        params = params.set('jobType', filters.jobType);
      }
      if (filters.experienceLevel) {
        params = params.set('experienceLevel', filters.experienceLevel);
      }
      if (filters.categoryId !== undefined) {
        params = params.set('categoryId', filters.categoryId.toString());
      }
      if (filters.location) {
        params = params.set('location', filters.location);
      }
      if (filters.isRemote !== undefined) {
        params = params.set('isRemote', filters.isRemote.toString());
      }
      if (filters.salaryMin !== undefined) {
        params = params.set('salaryMin', filters.salaryMin.toString());
      }
      if (filters.salaryMax !== undefined) {
        params = params.set('salaryMax', filters.salaryMax.toString());
      }
      // IMPORTANT: Add company ID filter
      if (filters.companyId !== undefined) {
        params = params.set('companyId', filters.companyId.toString());
      }
      if (filters.isActive !== undefined) {
        params = params.set('isActive', filters.isActive.toString());
      }
    }

    console.log('JobService: Making request with params:', params.toString()); // Debug log

    return this.http.get<JobOffersResponse>(this.API_URL + '/jobs', { params })
      .pipe(
        map(response => {
          console.log('JobService: Received response:', response); // Debug log
          return response;
        }),
        catchError(error => {
          console.error('JobService: Error fetching jobs:', error);
          return throwError(() => error);
        })
      );
  }

  // Get jobs for current company (company users only)
  getMyCompanyJobs(filters?: Omit<JobFilters, 'companyId'>): Observable<JobOffersResponse> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || currentUser.userType !== 'company') {
      return throwError(() => new Error('Unauthorized: Company access required'));
    }

    // Get the company ID from the user context or make a request to get it
    // For now, we'll assume the backend handles company filtering based on the auth token
    return this.http.get<JobOffersResponse>(`${this.API_URL}/jobs/my-company`, { 
      params: this.buildHttpParams(filters),
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error fetching company jobs:', error);
        return throwError(() => error);
      })
    );
  }

  private buildHttpParams(filters?: Partial<JobFilters>): HttpParams {
    let params = new HttpParams();

    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return params;
  }

  // Get job by ID with full details
  getJobById(id: number): Observable<ApiResponse<JobOffer>> {
    return this.http.get<ApiResponse<JobOffer>>(`${this.API_URL}/jobs/${id}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching job:', error);
          return throwError(() => error);
        })
      );
  }

  // Create new job offer (company only)
  createJob(jobData: Partial<JobOffer>): Observable<ApiResponse<JobOffer>> {
    return this.http.post<ApiResponse<JobOffer>>(`${this.API_URL}/jobs`, jobData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error creating job:', error);
        return throwError(() => error);
      })
    );
  }

  // Update job offer (company only)
  updateJob(id: number, jobData: Partial<JobOffer>): Observable<ApiResponse<JobOffer>> {
    return this.http.put<ApiResponse<JobOffer>>(`${this.API_URL}/jobs/${id}`, jobData, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error updating job:', error);
        return throwError(() => error);
      })
    );
  }


 // Activate job offer 
  activateJob(id: number): Observable<ApiResponse<JobOffer>> {
    return this.http.patch<ApiResponse<JobOffer>>(`${this.API_URL}/jobs/${id}/activate`, {}, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error activating job:', error);
        return throwError(() => error);
      })
    );
  }

  // Deactivate job offer
  deactivateJob(id: number): Observable<ApiResponse<JobOffer>> {
    return this.http.patch<ApiResponse<JobOffer>>(`${this.API_URL}/jobs/${id}/deactivate`, {}, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error deactivating job:', error);
        return throwError(() => error);
      })
    );
  }


  // Update job status: method for activate/deactivate
  updateJobStatus(id: number, isActive: boolean): Observable<ApiResponse<JobOffer>> {
    return this.http.patch<ApiResponse<JobOffer>>(`${this.API_URL}/jobs/${id}/status`, 
      { isActive }, 
      {
        headers: this.authService.getAuthHeaders()
      }
    ).pipe(
      catchError(error => {
        console.error('Error updating job status:', error);
        return throwError(() => error);
      })
    );
  }

 // Get job status
  getJobStatus(id: number): Observable<ApiResponse<{id: number; title: string; isActive: boolean; updatedAt: string}>> {
    return this.http.get<ApiResponse<{id: number; title: string; isActive: boolean; updatedAt: string}>>(`${this.API_URL}/jobs/${id}/status`)
      .pipe(
        catchError(error => {
          console.error('Error fetching job status:', error);
          return throwError(() => error);
        })
      );
  }

  // Get all active jobs for a company
  getCompanyActiveJobs(companyId: number): Observable<ApiResponse<JobOffer[]>> {
    return this.http.get<ApiResponse<JobOffer[]>>(`${this.API_URL}/jobs/company/${companyId}/active`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error fetching company active jobs:', error);
        return throwError(() => error);
      })
    );
  }

  // Get all inactive jobs for a company
  getCompanyInactiveJobs(companyId: number): Observable<ApiResponse<JobOffer[]>> {
    return this.http.get<ApiResponse<JobOffer[]>>(`${this.API_URL}/jobs/company/${companyId}/inactive`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error fetching company inactive jobs:', error);
        return throwError(() => error);
      })
    );
  }

  // Toggle job status (convenience method)
  toggleJobStatus(job: JobOffer): Observable<ApiResponse<JobOffer>> {
    return job.isActive ? this.deactivateJob(job.id) : this.activateJob(job.id);
  }

  // Bulk activate/deactivate jobs
  bulkUpdateJobStatus(jobIds: number[], isActive: boolean): Observable<ApiResponse[]> {
    const requests = jobIds.map(id => this.updateJobStatus(id, isActive));
    // Using forkJoin would be better for parallel requests, but this is simpler
    return new Observable(observer => {
      Promise.all(requests.map(req => req.toPromise()))
        .then(results => {
          observer.next(results as ApiResponse[]);
          observer.complete();
        })
        .catch(error => observer.error(error));
    });
  }

  // Delete job offer (company only)
  deleteJob(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API_URL}/jobs/${id}`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error deleting job:', error);
        return throwError(() => error);
      })
    );
  }


  // Apply to job (job seeker only)
  applyToJob(jobId: number, applicationData?: any): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/jobs/${jobId}/apply`, applicationData || {}, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error applying to job:', error);
        return throwError(() => error);
      })
    );
  }

  // Get job applications (company view)
  getJobApplications(jobId: number, status?: string): Observable<ApiResponse<JobApplication[]>> {
    let params = new HttpParams();
    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<ApiResponse<JobApplication[]>>(`${this.API_URL}/jobs/${jobId}/applications`, {
      headers: this.authService.getAuthHeaders(),
      params
    }).pipe(
      catchError(error => {
        console.error('Error fetching applications:', error);
        return throwError(() => error);
      })
    );
  }

  // Get user's applications (job seeker view)
  getUserApplications(): Observable<ApiResponse<JobApplication[]>> {
    return this.http.get<ApiResponse<JobApplication[]>>(`${this.API_URL}/users/me/applications`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error fetching user applications:', error);
        return throwError(() => error);
      })
    );
  }

  // Save job to favorites
  saveJob(jobId: number): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.API_URL}/jobs/${jobId}/save`, {}, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error saving job:', error);
        return throwError(() => error);
      })
    );
  }

  // Remove job from favorites
  unsaveJob(jobId: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API_URL}/jobs/${jobId}/save`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error removing saved job:', error);
        return throwError(() => error);
      })
    );
  }

  // Get user's saved jobs
  getSavedJobs(): Observable<ApiResponse<JobOffer[]>> {
    return this.http.get<ApiResponse<JobOffer[]>>(`${this.API_URL}/users/me/saved-jobs`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error fetching saved jobs:', error);
        return throwError(() => error);
      })
    );
  }

  /*Get job skills
  getJobSkills(jobId: number): Observable<ApiResponse<JobSkill[]>> {
    return this.http.get<ApiResponse<JobSkill[]>>(`${this.API_URL}/jobs/${jobId}/skills`)
      .pipe(
        catchError(error => {
          console.error('Error fetching job skills:', error);
          return throwError(() => error);
        })
      );
  }
*/
  // Get similar jobs
  getSimilarJobs(jobId: number, limit: number = 5): Observable<ApiResponse<JobOffer[]>> {
    const params = new HttpParams().set('limit', limit.toString());
    
    return this.http.get<ApiResponse<JobOffer[]>>(`${this.API_URL}/jobs/${jobId}/similar`, { params })
      .pipe(
        catchError(error => {
          console.error('Error fetching similar jobs:', error);
          return throwError(() => error);
        })
      );
  }

  // Check if user has applied to job
  hasUserApplied(jobId: number): Observable<ApiResponse<{hasApplied: boolean}>> {
    return this.http.get<ApiResponse<{hasApplied: boolean}>>(`${this.API_URL}/jobs/${jobId}/check-application`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error checking application status:', error);
        return throwError(() => error);
      })
    );
  }

  // Get job statistics (admin)
  getJobStatistics(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.API_URL}/jobs/statistics`, {
      headers: this.authService.getAuthHeaders()
    }).pipe(
      catchError(error => {
        console.error('Error fetching job statistics:', error);
        return throwError(() => error);
      })
    );
  }

  // Get job statistics for specific company (company users)
  getCompanyJobStatistics(companyId?: number): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (companyId) {
      params = params.set('companyId', companyId.toString());
    }

    return this.http.get<ApiResponse<any>>(`${this.API_URL}/jobs/statistics/company`, {
      headers: this.authService.getAuthHeaders(),
      params
    }).pipe(
      catchError(error => {
        console.error('Error fetching company job statistics:', error);
        return throwError(() => error);
      })
    );
  }

  // Search jobs by term
  searchJobs(searchTerm: string, limit: number = 10): Observable<ApiResponse<JobOffer[]>> {
    const params = new HttpParams()
      .set('searchTerm', searchTerm)
      .set('limit', limit.toString());

    return this.http.get<ApiResponse<JobOffer[]>>(`${this.API_URL}/jobs/search`, { params })
      .pipe(
        catchError(error => {
          console.error('Error searching jobs:', error);
          return throwError(() => error);
        })
      );
  }

  // Get job categories (for filters)
  getJobCategories(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/job-categories`)
      .pipe(
        catchError(error => {
          console.error('Error fetching job categories:', error);
          return throwError(() => error);
        })
      );
  }

  // Get unique locations (for filters)
  getLocations(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.API_URL}/jobs/locations`)
      .pipe(
        catchError(error => {
          console.error('Error fetching locations:', error);
          return throwError(() => error);
        })
      );
  }

  // Helper methods for formatting
  formatSalary(min?: number, max?: number, currency: string = 'TND'): string {
    if (!min && !max) return 'Salaire non spécifié';
    if (min && max) return `${min} - ${max} ${currency}`;
    if (min) return `À partir de ${min} ${currency}`;
    if (max) return `Jusqu'à ${max} ${currency}`;
    return 'Salaire non spécifié';
  }

  formatJobType(jobType: string): string {
    const types: { [key: string]: string } = {
      'full-time': 'Temps plein',
      'part-time': 'Temps partiel',
      'contract': 'Contrat',
      'internship': 'Stage'
    };
    return types[jobType] || jobType;
  }

  formatExperienceLevel(level: string): string {
    const levels: { [key: string]: string } = {
      'entry': 'Débutant',
      'mid': 'Intermédiaire',
      'senior': 'Expérimenté',
      'executive': 'Cadre supérieur'
    };
    return levels[level] || level;
  }

  isJobExpired(deadline?: string): boolean {
    if (!deadline) return false;
    return new Date(deadline) < new Date();
  }

  getDaysUntilDeadline(deadline?: string): number | null {
    if (!deadline) return null;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}