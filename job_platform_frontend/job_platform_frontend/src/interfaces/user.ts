export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: 'job_seeker' | 'company' | 'admin';
  profilePicture?: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}