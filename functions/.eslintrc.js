module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "quotes": ["error", "single"],
    "indent": ["error", 4],
    "max-len": ["error", { "code": 120 }],
    "object-curly-spacing": ["error", "always"],
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "comma-dangle": "off",
    "camelcase": "off",
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
};
