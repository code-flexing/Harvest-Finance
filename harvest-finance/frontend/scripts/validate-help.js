const fs = require('fs');
const path = require('path');

const articles = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/content/help/articles.json'), 'utf8'));

function simpleSearch(query, limit = 10) {
  if (!query || query.trim() === '') return [];
  const q = query.toLowerCase();
  const out = articles.filter(a => {
    return (
      a.title.toLowerCase().includes(q) ||
      a.body.toLowerCase().includes(q) ||
      (a.keywords || []).some(k => k.toLowerCase().includes(q)) ||
      a.category.toLowerCase().includes(q)
    );
  });
  return out.slice(0, limit);
}

function assert(condition, msg) {
  if (!condition) {
    console.error('FAIL:', msg);
    process.exitCode = 2;
    return;
  }
  console.log('OK:', msg);
}

console.log('Validating help search...');
assert(articles.length > 0, 'articles loaded');
const r1 = simpleSearch('deposit');
assert(r1.length > 0, 'deposit query returns results');
assert(r1[0].title.toLowerCase().includes('deposit'), 'first result likely deposit article');
const r2 = simpleSearch('qwertyuiopzz');
assert(r2.length === 0, 'nonsense query returns no results');

console.log('All validations passed.');
