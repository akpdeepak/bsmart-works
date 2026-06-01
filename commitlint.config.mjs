/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Commitlint rule format: [level, applicable, value]
    // level: 0 = off, 1 = warn, 2 = error | applicable: 'always' | 'never'
    //
    // Relax body-max-line-length to warn only — commit bodies can be long (multi-line change sets).
    'body-max-line-length': [1, 'always', 200],
    // Subject line stays tight. 100 chars is generous for the "what & why" summary.
    'header-max-length': [2, 'always', 100],
  },
};
