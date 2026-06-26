// energyHistory.ts — Simulated energy history generator
import type { EnergyDataPoint, EnergyHistory } from '../types';

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function addVariation(base: number, seed: number, variance = 0.15): number {
  return base * (1 + (seededRandom(seed) - 0.5) * variance * 2);
}

const HOURLY_PATTERN: number[] = [
  1500, 1500, 1500, 1500, 1500, 1500, // 0-5AM: AC only
  2500, 2800, 2600,                    // 6-8AM: morning rush
  400, 200, 150, 100, 150, 200, 300,   // 9AM-3PM: daytime low
  500, 800, 1200,                      // 4-6PM: building up
  2800, 2900, 2700, 2400, 1800,        // 7-11PM: peak evening
];

export function generateHourlyHistory(): EnergyDataPoint[] {
  const now = new Date();
  const points: EnergyDataPoint[] = [];

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(d.getHours() - i);
    d.setMinutes(0, 0, 0);
    const hour = d.getHours();
    const base = HOURLY_PATTERN[hour] || 1000;
    const totalWatts = Math.round(addVariation(base, hour + i * 7));

    points.push({
      timestamp: d.getTime(),
      totalWatts,
      byRoom: {
        1: Math.round(totalWatts * 0.35),
        2: Math.round(totalWatts * 0.15),
        3: Math.round(totalWatts * 0.30),
        4: Math.round(totalWatts * 0.10),
        5: Math.round(totalWatts * 0.10),
      },
      byDevice: {},
    });
  }
  return points;
}

export function generateDailyHistory(): EnergyDataPoint[] {
  const now = new Date();
  const points: EnergyDataPoint[] = [];
  const avgHourly = HOURLY_PATTERN.reduce((a, b) => a + b, 0) / HOURLY_PATTERN.length;

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);

    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const weekendFactor = isWeekend ? 1.2 : 1.0;
    const trendFactor = 1 - (i / 30) * 0.1;
    const dailyKwh = (avgHourly / 1000) * 24 * weekendFactor * trendFactor;
    const totalWatts = Math.round(addVariation(dailyKwh * 1000 / 24, i * 13));

    points.push({
      timestamp: d.getTime(),
      totalWatts,
      byRoom: {
        1: Math.round(totalWatts * 0.35),
        2: Math.round(totalWatts * 0.15),
        3: Math.round(totalWatts * 0.30),
        4: Math.round(totalWatts * 0.10),
        5: Math.round(totalWatts * 0.10),
      },
      byDevice: {},
    });
  }
  return points;
}

export function getEnergyHistory(): EnergyHistory {
  return {
    hourly: generateHourlyHistory(),
    daily: generateDailyHistory(),
  };
}
