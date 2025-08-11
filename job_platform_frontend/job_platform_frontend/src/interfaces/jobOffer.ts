import { CompanyDetails } from "./companyDetails";

export interface JobOffer {
  id: number;
  companyId: number;
  title: string;
  description: string;
  requirements: string;
  responsibilities: string;
  jobType: 'full-time' | 'part-time' | 'contract' | 'internship';
  experienceLevel: 'entry' | 'mid' | 'senior' | 'executive';
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency: string;
  location: string;
  isRemote: boolean;
  categoryId?: number;
  applicationDeadline?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Extended fields from joins
  companyName?: string;
  companyLogo?: string;
  categoryName?: string;
  applicationCount?: number;
  company?: CompanyDetails;
  website?: string;
}