import { formatCurrency, formatNumber } from './format';

describe('formatCurrency', () => {
  it('formats USD values', () => {
    expect(formatCurrency(12.5)).toBe('$12.50');
    expect(formatCurrency(0)).toBe('$0.00');
  });
});

describe('formatNumber', () => {
  it('adds thousands separators', () => {
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
});
