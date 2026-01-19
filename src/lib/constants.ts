// lib/constants.ts

export const GRAMS_PER_BAG = 50000; // 50kg * 1000g

export const FEED_SCHEDULE: Record<number, number> = {
  1: 16, 2: 20, 3: 24, 4: 28, 5: 32, 
  6: 36, 7: 40, 8: 44, 9: 48, 10: 52,
  11: 56, 12: 60, 13: 64, 14: 68, 15: 72,
  16: 76, 17: 80, 18: 84, 19: 88, 20: 92,
  21: 96, 22: 100, 23: 104, 24: 108, 25: 112,
  26: 116, 27: 120, 28: 124, 29: 128, 30: 132,
  31: 140, 32: 150, 33: 165, 34: 175
};

export const getFeedForDay = (day: number) => {
  if (day > 34) return 175;
  return FEED_SCHEDULE[day] || 0;
};