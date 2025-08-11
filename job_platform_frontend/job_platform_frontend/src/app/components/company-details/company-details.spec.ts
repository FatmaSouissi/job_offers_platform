import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyDetails } from './company-details';

describe('CompanyDetails', () => {
  let component: CompanyDetails;
  let fixture: ComponentFixture<CompanyDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CompanyDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
