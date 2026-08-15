## Summary
Deconstruct the massive God Component `knowledge-view.jsx` to improve maintainability and adherence to React best practices.

Successfully extracted the following components into `src/components/knowledge/`:
- `ArticleCard`
- `KnowledgeSpaceView`
- `KnowledgeSearchView`

## Scope
Refactoring `works-frontend/src/views/knowledge-view.jsx` and extracting child components. No business logic or state mutations were altered.

## Validation
- Verified extraction locally via `npm run lint` and `npm run build` which passed without any regression errors.
- Verified that all variables, constants, and hooks remain strictly scoped to where they are needed.

<!-- bsmart-pr-evidence
{
  "protocol": "bsmart-pr/v1",
  "task": "GH-13",
  "planUrl": "https://github.com/akpdeepak/bsmart-works/issues/13",
  "acceptance": [
    {
      "id": "AC-1",
      "evidence": ["VAL-1"]
    }
  ],
  "validation": [
    {
      "id": "VAL-1",
      "description": "Lint passed without regression errors after extraction."
    }
  ],
  "tdd": {
    "applicable": false,
    "reason": "This is a purely structural refactoring of UI components. Existing functionality is preserved and verified by the linter/build without changing business logic."
  }
}
-->
