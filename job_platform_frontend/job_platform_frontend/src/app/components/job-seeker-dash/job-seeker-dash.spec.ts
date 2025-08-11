import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobSeekerDash } from './job-seeker-dash';

describe('JobSeekerDash', () => {
  let component: JobSeekerDash;
  let fixture: ComponentFixture<JobSeekerDash>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [JobSeekerDash]
    })
    .compileComponents();

    fixture = TestBed.createComponent(JobSeekerDash);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
