import { User } from "./user";

export interface LoginRequest {
  email: string;
  password: string;
}


export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  userType: 'job_seeker' | 'company';
}