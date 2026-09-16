/**
 * Lint configuration.
 *
 * Deliberately narrow. The point is not style enforcement -- it is catching the
 * class of mistake the build cannot: an identifier used inside a function body
 * that nothing defines. Vite happily bundles that, and it only fails when a
 * user clicks the thing. One such bug (a stale `bossardDb` reference left
 * behind by the Phase 3 catalog migration) shipped before this was added.
 */
export default [
  {
    files: ['src/**/*.js', 'tools/**/*.mjs', 'test/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        // Browser
        document: 'readonly', window: 'readonly', navigator: 'readonly',
        localStorage: 'readonly', Blob: 'readonly', URL: 'readonly',
        FileReader: 'readonly', Image: 'readonly', alert: 'readonly',
        confirm: 'readonly', prompt: 'readonly', getComputedStyle: 'readonly',
        requestAnimationFrame: 'readonly', setTimeout: 'readonly',
        clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
        matchMedia: 'readonly', CustomEvent: 'readonly', Event: 'readonly',
        DOMParser: 'readonly', XMLSerializer: 'readonly', btoa: 'readonly',
        atob: 'readonly', crypto: 'readonly', structuredClone: 'readonly',
        console: 'readonly', fetch: 'readonly', performance: 'readonly',
        // Node (tools and tests)
        process: 'readonly', Buffer: 'readonly', __dirname: 'readonly',
      },
    },
    rules: {
      // The rule this exists for.
      'no-undef': 'error',
      // Dead imports and bindings left behind by a refactor.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Real hazards, not style.
      'no-dupe-keys': 'error',
      'no-unreachable': 'error',
      'no-self-assign': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],
      // Noise for this codebase.
      'no-empty': 'off',
    },
  },
]
