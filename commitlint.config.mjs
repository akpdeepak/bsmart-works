/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Conventional Commits: type(scope): description
    // Types from the config-conventional set cover all normal work.
    // body-max-line-length is relaxed — commit bodies can be long (multi-line change sets).
    'body-max-line-length': [1, 'warn', 200],
    // Subject line stays tight. 100 chars is generous for the "what & why" summary.
    'header-max-length': [2, 'always', 100],
  },
};
