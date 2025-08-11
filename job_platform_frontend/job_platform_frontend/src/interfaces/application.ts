export interface Application {
  _id: string;
  jobId: string;
  userId: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
  appliedAt: Date;
  coverLetter?: string;
  resume?: string;
}