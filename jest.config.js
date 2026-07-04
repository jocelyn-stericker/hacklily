// jest config. The frontend has no test harness by default; this wires up
// jest + jest-environment-jsdom for the src/*.sanitize.test.ts regression
// tests (DOMPurify sanitization behavior Preview.tsx depends on). `npm test`
// runs both the jest suite and the existing eslint+tsc gate.
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts", "**/*.test.tsx"],
  transform: {
    "^.+\\.[jt]sx?$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.svg$": "<rootDir>/src/__mocks__/staticFile.js",
    "\\.(png|jpg|jpeg|gif|webp|woff|woff2)$": "<rootDir>/src/__mocks__/staticFile.js",
    // Vendored scripts under src/vendor are imported for their bundled URL
    // (see webpack.config.js's asset/resource rule) -- stub them the same
    // way, so jest doesn't execute third-party code as a side effect of
    // importing src/analytics.ts. Matched by exact filename (jest applies
    // moduleNameMapper to the import request string, so a broad /vendor/.*
    // pattern would also swallow dependencies' own ./vendor/*.js requires).
    "vendor/goatcounter-count\\.js$": "<rootDir>/src/__mocks__/staticFile.js",
  },
};