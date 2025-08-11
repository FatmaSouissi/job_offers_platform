import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Company } from '../interfaces/company';
import { CompanyFilters } from '../interfaces/companyFilters';

export interface CompanyResponse {
  success: boolean;
  data: Company[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  message?: string;
}

export interface SingleCompanyResponse {
  success: boolean;
  data: Company;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class CompanyService {
  private apiUrl = 'http://localhost:3000/api/companies'; // Adjust this to match your backend URL

  constructor(private http: HttpClient) {}

  /**
   * Get all companies with pagination and filters
   */
  getCompanies(filters: CompanyFilters = {}): Observable<CompanyResponse> {
    let params = new HttpParams();
    
    if (filters.page) {
      params = params.set('page', filters.page.toString());
    }
    if (filters.limit) {
      params = params.set('limit', filters.limit.toString());
    }
    if (filters.searchTerm) {
      params = params.set('search', filters.searchTerm);
    }
    if (filters.industry) {
      params = params.set('industry', filters.industry);
    }
    if (filters.companySize) {
      params = params.set('companySize', filters.companySize);
    }

    return this.http.get<CompanyResponse>(this.apiUrl, { params });
  }

  /**
   * Get company by ID
   */
  getCompanyById(id: string): Observable<SingleCompanyResponse> {
    return this.http.get<SingleCompanyResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Search companies
   */
  searchCompanies(searchTerm: string, limit: number = 10): Observable<CompanyResponse> {
    const params = new HttpParams()
      .set('q', searchTerm)
      .set('limit', limit.toString());

    return this.http.get<CompanyResponse>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Get unique industries
   */
  getIndustries(): Observable<{ success: boolean; data: string[] }> {
    return this.http.get<{ success: boolean; data: string[] }>(`${this.apiUrl}/industries`);
  }

  /**
   * Get company's job offers
   */
  getCompanyJobs(companyId: string, status: string = 'active'): Observable<any> {
    const params = new HttpParams().set('status', status);
    return this.http.get(`${this.apiUrl}/${companyId}/jobs`, { params });
  }

  /**
   * Create new company (for authenticated company users)
   */
  createCompany(companyData: any): Observable<SingleCompanyResponse> {
    return this.http.post<SingleCompanyResponse>(this.apiUrl, companyData);
  }

  /**
   * Update company (for authenticated company users)
   */
  updateCompany(id: string, companyData: any): Observable<SingleCompanyResponse> {
    return this.http.put<SingleCompanyResponse>(`${this.apiUrl}/${id}`, companyData);
  }

  /**
   * Delete company (for authenticated company users)
   */
  deleteCompany(id: string): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get current user's company (for authenticated company users)
   */
  getMyCompany(): Observable<SingleCompanyResponse> {
    return this.http.get<SingleCompanyResponse>(`${this.apiUrl}/my`);
  }
}