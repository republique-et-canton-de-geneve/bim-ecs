import { map } from './map';

describe('map', () => {
  it('should project items according to selector', () => {
    const result = map([1, 2, 3, 4], (value) => value < 3);
    expect([...result]).toEqual([true, true, false, false]);
  });
});
