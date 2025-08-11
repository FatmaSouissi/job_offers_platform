export interface JobFilters {
  type?: string;
  location?: string;
  skills?: string;
  page?: number;
  limit?: number;
  search?: string;
  jobType?: string;
  experienceLevel?: string;
  categoryId?: number;
  applicationDeadline?: string;
  isRemote?: boolean;
  salaryMin?: number;
  salaryMax?: number;
  companyId?: number;
  isActive?: boolean;
}