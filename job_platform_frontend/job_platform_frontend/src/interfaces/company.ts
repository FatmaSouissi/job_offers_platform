export interface Company {
  id: string;
  companyName: string;
  email: string;
  profile: {
    companyName?: string;
    industry?: string;
    website?: string;
    description?: string;
    address?: string;
    logo?: string;
    foundedYear?: number;
  };
  jobCount?: number;
  activeJobCount?: number;
  totalApplications?: number;
  companySize?: string;
  createdAt?: string;
  updatedAt?: string;
  isActive?: boolean;
  verificationStatus?: string;
}