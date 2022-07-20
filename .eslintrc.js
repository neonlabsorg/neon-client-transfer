module.exports = {
  env: {
    browser: true,
    node: true,
    es2020: true,
  },
  parserOptions: {
    sourceType: "module",
  },

  extends: ["eslint:recommended"],

  plugins: ["prettier"],
  rules: {
    "prettier/prettier": "error",
    "newline-before-return": "error",
    "curly": ["error", "multi-line"],
  },
}
