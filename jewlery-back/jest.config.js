/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  transform: {},
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "src/utils/**/*.js",
    "src/providers/categoryTrends.utils.js",
    "src/config/cors.js",
    "src/observability/**/*.js",
  ],
  coverageThreshold: {
    global: {
      lines: 75,
      branches: 75,
      functions: 75,
      statements: 75,
    },
  },
  coverageReporters: ["text", "lcov", "json-summary"],
};
