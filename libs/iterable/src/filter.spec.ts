import { filter } from './filter';

describe('filter', () => {
  it('should filter items which are not matching with predicate', () => {
    const result = filter([1, 2, 3, 4], (value) => value < 3);
    expect([...result]).toEqual([1, 2]);
  });
});
