// bSmart Works — pagination constants. The single frontend source for list page sizes.
// Mirrors the backend `ListPaging` (DEFAULT_SIZE = 50, MAX_SIZE = 200); keep these in sync so
// the UI never hardcodes a magic page size that drifts from the server contract (CLAUDE.md §0,
// RB-10 §4 pagination). Import these instead of writing a literal `50`.

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;
