try {
  const pkg = require('jest/package.json');
  console.log('jest version:', pkg.version);
} catch (err) {
  console.error('require jest failed:', err && err.message);
  process.exit(2);
}
