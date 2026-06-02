const { runCLI } = require('jest');
const path = require('path');
const fs = require('fs');

(async () => {
  try {
    const cwd = path.resolve(__dirname, '..');
    const result = await runCLI(
      {
        json: true,
        outputFile: path.join(cwd, 'jest-results.json'),
        runInBand: true,
        colors: false,
        silent: false,
      },
      [cwd],
    );

    const success = result.results.success;
    console.log('Jest finished. Success:', success);
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('Error running jest:', err);
    process.exit(2);
  }
})();