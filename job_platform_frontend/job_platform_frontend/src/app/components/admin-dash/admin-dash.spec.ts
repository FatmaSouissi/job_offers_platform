import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminDash } from './admin-dash';

describe('AdminDash', () => {
  let component: AdminDash;
  let fixture: ComponentFixture<AdminDash>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminDash]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminDash);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
