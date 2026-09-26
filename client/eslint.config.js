import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  { ignores: ['dist', 'node_modules'] },

  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      }
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,

      // PropTypes aren't used in this codebase; the rule has nothing to check.
      'react/prop-types': 'off',

      // Unused vars are a real signal here, but allow the leading-underscore
      // convention for intentionally-ignored bindings.
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none'
      }],

      // Display-name is unreliable for anonymous default-exported components.
      'react/display-name': 'off'
    }
  },

  // Only the top-level entry files may use the fast-refresh HMR contract.
  {
    files: ['src/main.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' }
  }
];
