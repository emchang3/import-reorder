module.exports = {
  collectCoverage: true,
  collectCoverageFrom: ['**/import-reorder.js', '!**/node_modules/**', '!**/vendor/**'],
  coverageDirectory: 'coverage',
  coverageReporters: ['html', 'json', 'text']
};
