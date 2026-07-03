/* eslint-env node */
// Jest mock for static file imports (SVG, images, fonts, etc.)
// When webpack imports these, it returns a URL string; Jest gets this stub.
module.exports = "mock-static-file";
