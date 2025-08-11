import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompanyDash } from './company-dash';

describe('CompanyDash', () => {
  let component: CompanyDash;
  let fixture: ComponentFixture<CompanyDash>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [CompanyDash]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CompanyDash);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
