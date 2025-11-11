import { TestBed } from '@angular/core/testing';

import { Family } from './family';

describe('Family', () => {
  let service: Family;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Family);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
