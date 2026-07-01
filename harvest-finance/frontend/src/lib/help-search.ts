let Fuse: any = null;
try {
  // try dynamic require so tests can run without installing fuse.js
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  // @ts-ignore
  Fuse = require('fuse.js');
} catch (e) {
  Fuse = null;
}
import articles from '../content/help/articles.json';

export type Article = {
  id: string;
  title: string;
  category: string;
  body: string;
  keywords?: string[];
};

const options = {
  keys: ['title', 'body', 'keywords', 'category'],
  includeScore: true,
  threshold: 0.4,
};

export function searchHelp(query: string, limit = 10) {
  if (!query || query.trim() === '') return [] as Article[];
  if (Fuse) {
    const fuse = new Fuse(articles as Article[], options);
    const results = fuse.search(query, { limit });
    return results.map((r: any) => r.item as Article);
  }
  // fallback simple substring search
  const q = query.toLowerCase();
  const out = (articles as Article[]).filter(a => {
    return (
      a.title.toLowerCase().includes(q) ||
      a.body.toLowerCase().includes(q) ||
      (a.keywords || []).some(k => k.toLowerCase().includes(q)) ||
      a.category.toLowerCase().includes(q)
    );
  });
  return out.slice(0, limit);
}

export function getAllArticles(): Article[] {
  return articles as Article[];
}

export default { searchHelp, getAllArticles };
