import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Companies } from './companies';

describe('Companies', () => {
  let component: Companies;
  let fixture: ComponentFixture<Companies>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [Companies]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Companies);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
