module.exports = {
    // Vendored third-party code, kept byte-identical to upstream so it can be
    // diffed directly -- see src/vendor/goatcounter-count.js. Only the .js is
    // verbatim; our own .d.ts shims alongside it stay linted.
    "ignorePatterns": ["src/vendor/*.js"],
    "env": {
        "browser": true,
        "es6": true
    },
    "settings": {
        "react": {
            "version": "detect",
        },
    },
    "extends": [
        "eslint:recommended",
        "plugin:react/recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "prettier",
        "plugin:prettier/recommended"
    ],
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaFeatures": {
            "jsx": true
        },
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "plugins": [
        "react",
        "@typescript-eslint",
        "react-hooks"
    ],
    "rules": {
        "no-unused-vars": "off",
        "@typescript-eslint/no-unused-vars": ["error", {"varsIgnorePattern": "^_", "argsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_"}],
        "react-hooks/rules-of-hooks": "error",
        "react-hooks/exhaustive-deps": "error"
    },
    "overrides": [
        {
            "files": ["**/*.test.ts", "**/*.test.tsx"],
            "extends": ["plugin:jest/recommended"]
        }
    ]
};
