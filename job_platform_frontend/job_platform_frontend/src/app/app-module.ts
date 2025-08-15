import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Routes } from '@angular/router';
import { DatePipe, CommonModule } from '@angular/common';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { AuthInterceptor } from '../services/auth.interceptor';

import { AppComponent } from './app';
import { JobsComponent } from './components/jobs/jobs';
import { JobDetailsComponent } from './components/job-details/job-details';
import { RegisterComponent } from './components/register/register';
import { LoginComponent } from './components/login/login';
import { Header } from './components/header/header';
import { Footer } from './components/footer/footer';
import { HomeComponent } from './components/home/home';
import { CtaSection } from './components/cta-section/cta-section';
import { Profile } from './components/profile/profile';
import { CompanyDetails } from './components/company-details/company-details';
import { Companies } from './components/companies/companies';
import { ApplicationComponent } from './components/application/application';
import { AdminDash } from './components/admin-dash/admin-dash';
import { MatIconModule } from '@angular/material/icon';
import { JobSeekerDash } from './components/job-seeker-dash/job-seeker-dash';
import { CompanyDash } from './components/company-dash/company-dash';
import { AuthGuard } from '../guards/auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { EditJob } from './components/edit-job/edit-job';
import { Applicants } from './components/applicants/applicants';

// Define your routes
const routes: Routes = [
  { path: '', redirectTo: '', pathMatch: 'full' },
  { path: '', component: HomeComponent },
  { path: 'jobs', component: JobsComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'job-details/:id', component: JobDetailsComponent },
  { path: 'companies', component: Companies },
  { path: 'company/:id', component: CompanyDetails },
  { path: 'jobs/:id/apply',component: ApplicationComponent},
   {
    path: 'profile',
    component: Profile,
    canActivate: [AuthGuard],
    data: { 
      title: 'Profile',
      requiresAuth: true 
    }
  },
  {
    path: 'admin-dash',
    component: AdminDash,
    canActivate: [AuthGuard, AdminGuard],
    data: { 
      title: 'Admin Dashboard',
      requiresAuth: true,
      roles: ['admin'] 
    }
  },

  {
    path: 'dashboard',
    component: JobSeekerDash, 
    canActivate: [AuthGuard],
    data: { 
      title: 'Dashboard',
      requiresAuth: true,
      roles: ['job_seeker'] 
    }
  },
  {
    path: 'company-dash',
    component: CompanyDash, 
    canActivate: [AuthGuard],
    data: { 
      title: 'Company Dashboard',
      requiresAuth: true,
      roles: ['company'] 
    }
  },
   {
    path: 'company/jobs/edit/:id',
    component: EditJob,
    canActivate: [AuthGuard]
  },

   {
    path: 'company/jobs/:jobId/applications',
    component: Applicants,
    canActivate: [AuthGuard]
  },
  
  
  { path: '**', redirectTo: '' } 
];

@NgModule({
  declarations: [
    AppComponent,
    Header,
    Footer,
    HomeComponent,
    CtaSection,
    Profile,
    CompanyDetails,
    Companies,
    JobDetailsComponent,
    ApplicationComponent,
    JobSeekerDash,
    EditJob,
    Applicants,
    
    
  ],
  imports: [
    BrowserModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    HttpClientModule,
    RegisterComponent,    
    LoginComponent,  
    JobsComponent, 
    AdminDash,
    CompanyDash,
    
    RouterModule.forRoot(routes),
  ],
  providers: [
    DatePipe,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }