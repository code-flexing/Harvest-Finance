import { searchHelp, getAllArticles } from '../lib/help-search';

describe('help search', () => {
  it('returns articles for common queries', () => {
    const all = getAllArticles();
    expect(all.length).toBeGreaterThan(0);

    const res = searchHelp('deposit');
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].title.toLowerCase()).toContain('deposit');
  });

  it('returns empty for unknown query', () => {
    const res = searchHelp('qwertyuiopzz');
    expect(res.length).toBe(0);
  });
});
