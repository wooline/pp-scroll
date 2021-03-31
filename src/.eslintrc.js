module.exports = {
  root: true,
  extends: ['plugin:@medux/recommended/react'],
  env: {
    browser: false,
    node: false,
  },
  parserOptions: {
    project: `${__dirname}/tsconfig.json`,
  },
  rules: {
  },
  ignorePatterns: [],
};
