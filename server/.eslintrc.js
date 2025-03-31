module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true, // Specify node environment
    es2021: true // Specify ES version
  },
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    project: './tsconfig.json', // Point to your tsconfig.json
  },
  rules: {
    // Add any specific rule overrides here
    // Example: '@typescript-eslint/no-unused-vars': 'warn',
    'no-console': 'warn', // Example: Warn about console.log
    '@typescript-eslint/no-explicit-any': 'warn', // Warn about using 'any' type
    '@typescript-eslint/no-unused-vars': ['warn', { 'argsIgnorePattern': '^_|next' }], // Allow unused vars starting with _ or named next
  },
  ignorePatterns: ['dist/**', 'node_modules/**', '.eslintrc.js'], // Ignore dist, node_modules, and this file
};
