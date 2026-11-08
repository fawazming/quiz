export function speedFraction(startedAt, deadlineAt, now = Date.now()) {
  const total = Math.max(1, deadlineAt - startedAt);
  const left = Math.max(0, deadlineAt - now);
  return Math.max(0, Math.min(1, left / total));
}

export function round2Points({ isCorrect, startedAt, deadlineAt, now = Date.now(), basePoints, speedBonus }) {
  if (!isCorrect) return 0;
  return Math.round(basePoints + speedBonus * speedFraction(startedAt, deadlineAt, now));
}

export function round3Points({ isCorrect, startedAt, deadlineAt, now = Date.now(), basePoints, speedBonus, wrongPenalty = 0 }) {
  if (!isCorrect) return -Math.abs(wrongPenalty || 0);
  return Math.round(basePoints + speedBonus * speedFraction(startedAt, deadlineAt, now));
}

export function responseMs(startedAt, now = Date.now()) {
  return Math.max(0, now - startedAt);
}

export function nextTurnIndex(order, turnIndex, remainingNumbers) {
  if (!order.length || remainingNumbers <= 0) return turnIndex;
  return (turnIndex + 1) % order.length;
}
