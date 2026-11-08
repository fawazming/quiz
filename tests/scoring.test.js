import { describe, it, expect } from 'vitest';
import { speedFraction, round2Points, round3Points, nextTurnIndex } from '../server/scoring.js';

describe('speedFraction', () => {
  it('is 1 at the start and 0 at the deadline', () => {
    expect(speedFraction(1000, 11000, 1000)).toBe(1);
    expect(speedFraction(1000, 11000, 11000)).toBe(0);
  });
  it('never goes below zero after the deadline', () => {
    expect(speedFraction(1000, 11000, 15000)).toBe(0);
  });
});

describe('round2Points', () => {
  const base = { startedAt: 0, deadlineAt: 10000, basePoints: 50, speedBonus: 25 };
  it('awards base plus full bonus at the first instant', () => {
    expect(round2Points({ ...base, isCorrect: true, now: 0 })).toBe(75);
  });
  it('awards base only at the deadline', () => {
    expect(round2Points({ ...base, isCorrect: true, now: 10000 })).toBe(50);
  });
  it('awards zero for a wrong answer', () => {
    expect(round2Points({ ...base, isCorrect: false, now: 0 })).toBe(0);
  });
});

describe('round3Points', () => {
  const base = { startedAt: 0, deadlineAt: 30000, basePoints: 50, speedBonus: 25, wrongPenalty: 10 };
  it('awards a speed bonus for a fast correct answer', () => {
    expect(round3Points({ ...base, isCorrect: true, now: 0 })).toBe(75);
  });
  it('applies the configured wrong-answer penalty', () => {
    expect(round3Points({ ...base, isCorrect: false, now: 1000 })).toBe(-10);
  });
});

describe('nextTurnIndex', () => {
  it('wraps around while numbers remain', () => {
    expect(nextTurnIndex([1,2,3], 2, 1)).toBe(0);
  });
  it('stops when no numbers remain', () => {
    expect(nextTurnIndex([1,2,3], 1, 0)).toBe(1);
  });
});
