export interface JobApplication {
  id: number;
  jobOfferId: number;
  userId: number;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  resumeFile: string;
  appliedAt: string;
}