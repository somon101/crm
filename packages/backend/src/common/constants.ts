// A car's model year can't reasonably predate the automobile industry, and letting
// it drift arbitrarily far into the future is more likely a typo than a real value
// (next model year is the realistic upper bound).
export const MIN_CAR_YEAR = 1900;
export const MAX_CAR_YEAR = new Date().getFullYear() + 1;
