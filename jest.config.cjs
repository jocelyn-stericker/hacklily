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
    "vendor/goatcounter-count\\.js(\\?url)?$": "<rootDir>/src/__mocks__/staticFile.js",
  },
};
