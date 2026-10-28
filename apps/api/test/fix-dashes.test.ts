import { describe, it, expect } from 'vitest';
import { withoutEmDashes } from '../src/scripts/fix-dashes';

describe('withoutEmDashes', () => {
  it('turns a spaced em dash into a comma', () => {
    expect(withoutEmDashes('Birla Solid Concrete Block 8 inch — Heavy Duty')).toBe('Birla Solid Concrete Block 8 inch, Heavy Duty');
    expect(withoutEmDashes('BuildX Demo Supplier (placeholder — not a real business)')).toBe('BuildX Demo Supplier (placeholder, not a real business)');
  });

  it('turns a dash between words into a comma and drops leading or trailing ones', () => {
    expect(withoutEmDashes('river—sand')).toBe('river, sand');
    expect(withoutEmDashes('— Grade A')).toBe('Grade A');
    expect(withoutEmDashes('Grade A —')).toBe('Grade A');
  });

  it('leaves text without em dashes alone', () => {
    expect(withoutEmDashes('TMT bars 8mm–32mm, Fe 550D')).toBe('TMT bars 8mm–32mm, Fe 550D');
  });
});
