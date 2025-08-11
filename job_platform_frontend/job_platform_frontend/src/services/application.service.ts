import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from './auth.service'; // Assuming AuthService is in the same 'services' folder
import { JobOffer } from '../interfaces/jobOffer';
import { ApiResponse } from '../interfaces/loginRequest';
import { JobApplication } from '../interfaces/jobApplication';

// --- Interfaces for Application Data ---

// Base Application interface (aligned with your backend model)

// Interface for detailed application (with job, company, applicant info from backend joins)
export interface DetailedApplication extends JobApplication {
  job: JobOffer;
  applicant: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    profileResumeUrl?: string;
    bio?: string;
    skills?: string[]; // Parsed from JSON in backend
    experienceYears?: number;
    linkedinUrl?: string;
    portfolioUrl?: string;
  };
}



@Injectable({
  providedIn: 'root'
})
export class ApplicationService {
  private readonly API_URL = 'http://localhost:3000/api/applications'; // Base URL for application routes

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json'
    });
  }

  private getAuthHeadersForFileUpload(): HttpHeaders {
    const token = this.authService.getToken();
    // For file uploads, Content-Type is typically set automatically by FormData
    return new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  private handleError(error: any): Observable<never> {
    console.error('An error occurred in ApplicationService:', error);
    let errorMessage = 'Une erreur inconnue est survenue.';
    if (error.error && error.error.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    return throwError(() => new Error(errorMessage));
  }

  /*
   * Submits a new job application.
   * Corresponds to: POST /api/applications
   */
  createApplication(payload: JobApplication): Observable<ApiResponse<JobApplication>> {
    return this.http.post<ApiResponse<JobApplication>>(this.API_URL, payload, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

 /* upload resume file */
uploadResume(file: File): Observable<ApiResponse<{ url: string }>> {
    // Validate file size
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
        return throwError(() => new Error('File size exceeds 5MB limit'));
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
        return throwError(() => new Error('Invalid file type. Only PDF and DOC files are allowed.'));
    }

    const formData = new FormData();
    formData.append('resume', file);

    return this.http.post<ApiResponse<{ url: string }>>(
        'http://localhost:3000/api/upload/resume',
        formData,
        {
            headers: this.getAuthHeadersForFileUpload()
        }
    ).pipe(
        catchError(error => {
            console.error('Upload error:', error);
            return throwError(() => new Error('Error uploading file'));
        })
    );
}

  /*Get all applications with filters (Admin, Company).
    Corresponds to: GET /api/applications
   */
  getAllApplications(filters?: {
    page?: number;
    limit?: number;
    userId?: number;
    jobOfferId?: number;
    companyId?: number;
    status?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
  }): Observable<ApiResponse<DetailedApplication[]>> {
    return this.http.get<ApiResponse<DetailedApplication[]>>(this.API_URL, {
      headers: this.getAuthHeaders(),
      params: filters as any // Cast to any to allow flexible params for HttpClient
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get current user's applications (Job Seeker).
   * Corresponds to: GET /api/applications/my
   */
  getMyApplications(page: number = 1, limit: number = 10): Observable<ApiResponse<DetailedApplication[]>> {
    return this.http.get<ApiResponse<DetailedApplication[]>>(`${this.API_URL}/my`, {
      headers: this.getAuthHeaders(),
      params: { page: page.toString(), limit: limit.toString() }
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get applications for a specific job (Company, Admin).
   * Corresponds to: GET /api/applications/job/:jobId
   */
  getApplicationsByJob(jobId: number, page: number = 1, limit: number = 10): Observable<ApiResponse<DetailedApplication[]>> {
    return this.http.get<ApiResponse<DetailedApplication[]>>(`${this.API_URL}/job/${jobId}`, {
      headers: this.getAuthHeaders(),
      params: { page: page.toString(), limit: limit.toString() }
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get applications for a specific company (Company, Admin).
   * Corresponds to: GET /api/applications/company/:companyId
   */
  getApplicationsByCompany(companyId: number, page: number = 1, limit: number = 10, status?: string): Observable<ApiResponse<DetailedApplication[]>> {
    const params: any = { page: page.toString(), limit: limit.toString() };
    if (status) {
      params.status = status;
    }
    return this.http.get<ApiResponse<DetailedApplication[]>>(`${this.API_URL}/company/${companyId}`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get application statistics (Company, Admin, Job Seeker).
   * Corresponds to: GET /api/applications/statistics
   */
  getApplicationStatistics(companyId?: number, userId?: number): Observable<ApiResponse<any>> { // 'any' can be replaced with a specific stats interface
    const params: any = {};
    if (companyId) params.companyId = companyId.toString();
    if (userId) params.userId = userId.toString();

    return this.http.get<ApiResponse<any>>(`${this.API_URL}/statistics`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get recent applications (Company, Admin).
   * Corresponds to: GET /api/applications/recent
   */
  getRecentApplications(limit: number = 10, companyId?: number): Observable<ApiResponse<DetailedApplication[]>> {
    const params: any = { limit: limit.toString() };
    if (companyId) params.companyId = companyId.toString();

    return this.http.get<ApiResponse<DetailedApplication[]>>(`${this.API_URL}/recent`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get application trends (Company, Admin).
   * Corresponds to: GET /api/applications/trends
   */
  getApplicationTrends(months: number = 6, companyId?: number): Observable<ApiResponse<any[]>> { // 'any[]' can be replaced with a specific trend data interface
    const params: any = { months: months.toString() };
    if (companyId) params.companyId = companyId.toString();

    return this.http.get<ApiResponse<any[]>>(`${this.API_URL}/trends`, {
      headers: this.getAuthHeaders(),
      params
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get application by ID with details.
   * Corresponds to: GET /api/applications/:id
   */
  getApplicationById(id: number): Observable<ApiResponse<DetailedApplication>> {
    return this.http.get<ApiResponse<DetailedApplication>>(`${this.API_URL}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Update application status.
   * Corresponds to: PUT /api/applications/:id/status
   */
  updateApplicationStatus(id: number, status: string): Observable<ApiResponse<JobApplication>> {
    return this.http.put<ApiResponse<JobApplication>>(`${this.API_URL}/${id}/status`, { status }, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  /* Update application details (Job Seeker - own applications only) */
  
  updateApplication(id: number, updateData: Partial<JobApplication>): Observable<ApiResponse<JobApplication>> {
    return this.http.put<ApiResponse<JobApplication>>(`${this.API_URL}/${id}`, updateData, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  /*Bulk update application statuses (Company, Admin). */
  bulkUpdateApplicationStatus(applicationIds: number[], status: string): Observable<ApiResponse> {
    return this.http.put<ApiResponse>(`${this.API_URL}/bulk/status`, { applicationIds, status }, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  /* Delete application (Job Seeker - own applications only)*/
  deleteApplication(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.API_URL}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }

  /* Check if user can apply to a job (Job Seekers).
   * Corresponds to: GET /api/applications/check/:jobId 
   */
  canUserApply(jobId: number): Observable<ApiResponse<{ canApply: boolean }>> {
    return this.http.get<ApiResponse<{ canApply: boolean }>>(`${this.API_URL}/check/${jobId}`, { headers: this.getAuthHeaders() })
      .pipe(
        catchError(this.handleError)
      );
  }
}