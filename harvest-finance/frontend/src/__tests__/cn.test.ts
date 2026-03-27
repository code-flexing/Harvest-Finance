import { cn } from '@/components/ui/types';

describe('cn utility', () => {
  it('joins class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', null, 'bar', undefined, false, 'baz')).toBe('foo bar baz');
  });

  it('returns empty string for all falsy', () => {
    expect(cn(null, undefined, false)).toBe('');
  });

  it('handles single class', () => {
    expect(cn('only')).toBe('only');
  });
});
