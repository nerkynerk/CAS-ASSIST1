export interface TriangularSummary {
  minimumMinutes: number;
  maximumMinutes: number;
  mostLikelyMinutes: number;
  expectedMinutes: number;
}

export function littleLawWaitMinutes(activeLoad: number, arrivalsPerHour: number): number | null {
  if (!Number.isFinite(activeLoad) || !Number.isFinite(arrivalsPerHour)) return null;
  if (activeLoad < 0 || arrivalsPerHour <= 0) return null;
  return (activeLoad / arrivalsPerHour) * 60;
}

export function triangularSummary(durationsMinutes: number[]): TriangularSummary | null {
  const values = durationsMinutes.filter(value => Number.isFinite(value) && value >= 0);
  if (values.length < 3) return null;

  const roundedCounts = new Map<number, number>();
  for (const value of values) {
    const rounded = Math.round(value);
    roundedCounts.set(rounded, (roundedCounts.get(rounded) ?? 0) + 1);
  }

  const mostLikelyMinutes = [...roundedCounts.entries()]
    .sort(([firstValue, firstCount], [secondValue, secondCount]) =>
      secondCount - firstCount || firstValue - secondValue)[0]?.[0];
  if (mostLikelyMinutes === undefined) return null;

  const minimumMinutes = Math.min(...values);
  const maximumMinutes = Math.max(...values);
  return {
    minimumMinutes,
    maximumMinutes,
    mostLikelyMinutes,
    expectedMinutes: (minimumMinutes + maximumMinutes + mostLikelyMinutes) / 3,
  };
}
