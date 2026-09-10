// Mirrors packages/backend/src/common/constants.ts — keeps the year input's
// min/max in sync with what the server will actually accept.
export const MIN_CAR_YEAR = 1900;
export const MAX_CAR_YEAR = new Date().getFullYear() + 1;
