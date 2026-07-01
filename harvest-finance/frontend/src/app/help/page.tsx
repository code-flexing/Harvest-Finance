"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { searchHelp, getAllArticles, Article } from '../../../lib/help-search';

const NO_RESULTS_KEY = 'help_no_results';

function saveHelpful(articleId: string, helpful: boolean) {
  const key = `helpful_${articleId}`;
  try {
    localStorage.setItem(key, helpful ? '1' : '0');
  } catch (e) {}
}

function getHelpful(articleId: string) {
  try {
    const v = localStorage.getItem(`helpful_${articleId}`);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch (e) {}
  return undefined;
}

function recordNoResults(query: string) {
  try {
    const raw = localStorage.getItem(NO_RESULTS_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    obj[query] = (obj[query] || 0) + 1;
    localStorage.setItem(NO_RESULTS_KEY, JSON.stringify(obj));
  } catch (e) {}
}

export default function HelpPage() {
  const all = useMemo(() => getAllArticles(), []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Article[] | null>(null);

  useEffect(() => {
    if (!query) {
      setResults(null);
      return;
    }
    const r = searchHelp(query, 20);
    setResults(r);
    if (r.length === 0) recordNoResults(query);
  }, [query]);

  const categories = useMemo(() => {
    const map = new Map<string, Article[]>();
    all.forEach(a => {
      if (!map.has(a.category)) map.set(a.category, []);
      map.get(a.category)!.push(a);
    });
    return Array.from(map.entries());
  }, [all]);

  return (
    <div style={{ padding: 20 }}>
      <h1>Help Centre</h1>
      <p>Search our FAQs or browse by category.</p>
      <input
        aria-label="Search help"
        placeholder="Search help articles"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{ width: '100%', padding: 8, marginBottom: 12 }}
      />

      {results !== null ? (
        <div>
          <h2>Search results</h2>
          {results.length === 0 ? (
            <p>No results found for "{query}"</p>
          ) : (
            results.map(a => <ArticleCard key={a.id} article={a} />)
          )}
        </div>
      ) : (
        <div>
          {categories.map(([cat, arts]) => (
            <section key={cat} style={{ marginBottom: 16 }}>
              <h3>{cat}</h3>
              {arts.map(a => (
                <ArticleCard key={a.id} article={a} />
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ArticleCard({ article }: { article: Article }) {
  const [helpful, setHelpful] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    setHelpful(getHelpful(article.id));
  }, [article.id]);

  return (
    <div style={{ border: '1px solid #eee', padding: 12, marginBottom: 8 }}>
      <h4>{article.title}</h4>
      <p>{article.body}</p>
      <div style={{ marginTop: 8 }}>
        <span>Was this helpful? </span>
        <button
          onClick={() => {
            saveHelpful(article.id, true);
            setHelpful(true);
          }}
          style={{ marginRight: 8 }}
          aria-label={`helpful-yes-${article.id}`}
        >
          Yes
        </button>
        <button
          onClick={() => {
            saveHelpful(article.id, false);
            setHelpful(false);
          }}
          aria-label={`helpful-no-${article.id}`}
        >
          No
        </button>
        {helpful === true && <span style={{ marginLeft: 8 }}>Thanks — helpful</span>}
        {helpful === false && <span style={{ marginLeft: 8 }}>Thanks — we'll improve</span>}
      </div>
    </div>
  );
}
