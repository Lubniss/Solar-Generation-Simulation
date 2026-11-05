export type Weather = "sunny" | "partly" | "overcast";
export type Location = "equator" | "summer" | "winter";

export const WEATHER: Record<Weather, { label: string; peak: number; noise: number }> = {
  sunny: { label: "Clear Sunny", peak: 100, noise: 0.03 },
  partly: { label: "Partly Cloudy", peak: 78, noise: 0.25 },
  overcast: { label: "Heavy Overcast", peak: 38, noise: 0.12 },
};

export const LOCATION: Record<Location, { label: string; sunrise: number; sunset: number }> = {
  equator: { label: "Equator (12h/12h)", sunrise: 6, sunset: 18 },
  summer: { label: "Northern Summer (Long Days)", sunrise: 4.5, sunset: 20.5 },
  winter: { label: "Northern Winter (Short Days)", sunrise: 8, sunset: 16 },
};

export const THRESHOLD = 50;
const STEP = 0.5;

// deterministic pseudo-random
function rand(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export interface Point {
  t: number;
  power: number;
  measured: number | null;
  reconstructed: number | null;
}

/** Linear interpolation between nearest known neighbours. */
export function interpolate(values: (number | null)[]): number[] {
  return values.map((v, i) => {
    if (v !== null) return v;
    let l = i - 1;
    while (l >= 0 && values[l] === null) l--;
    let r = i + 1;
    while (r < values.length && values[r] === null) r++;
    const lv = l >= 0 ? (values[l] as number) : 0;
    const rv = r < values.length ? (values[r] as number) : 0;
    const li = l >= 0 ? l : 0;
    const ri = r < values.length ? r : values.length - 1;
    return ri === li ? lv : lv + ((rv - lv) * (i - li)) / (ri - li);
  });
}

/** Trapezoidal rule. */
export function trapezoid(ys: number[], h: number): number {
  let s = 0;
  for (let i = 1; i < ys.length; i++) s += ((ys[i - 1]! + ys[i]!) * h) / 2;
  return s;
}

/** Bisection on a piecewise-linear curve for f(t) = target. */
export function bisect(f: (t: number) => number, a: number, b: number, target: number) {
  let lo = a, hi = b;
  const sLo = f(lo) - target;
  for (let k = 0; k < 50; k++) {
    const mid = (lo + hi) / 2;
    if ((f(mid) - target) * sLo > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function analyze(weather: Weather, location: Location) {
  const w = WEATHER[weather];
  const loc = LOCATION[location];
  const len = loc.sunset - loc.sunrise;
  const n = 24 / STEP + 1;
  const truth: number[] = [];
  const raw: (number | null)[] = [];
  for (let i = 0; i < n; i++) {
    const t = i * STEP;
    let p = 0;
    if (t > loc.sunrise && t < loc.sunset) {
      const base = Math.pow(Math.sin((Math.PI * (t - loc.sunrise)) / len), 1.4);
      const cloud = 1 - w.noise * rand(i + weather.length * 7);
      p = w.peak * base * cloud;
    }
    truth.push(p);
    const missing = p > 0 && rand(i * 3.1 + 11) < 0.18;
    raw.push(missing ? null : p);
  }
  const filled = interpolate(raw);
  const points: Point[] = filled.map((p, i) => ({
    t: i * STEP,
    power: +p.toFixed(2),
    measured: raw[i] === null ? null : +p.toFixed(2),
    reconstructed: raw[i] === null ? +p.toFixed(2) : null,
  }));
  const missingCount = raw.filter((v) => v === null).length;
  const daylight = filled.filter((_, i) => truth[i]! > 0).length || 1;

  const f = (t: number) => {
    const i = Math.min(Math.floor(t / STEP), n - 2);
    const fr = t / STEP - i;
    return filled[i]! + (filled[i + 1]! - filled[i]!) * fr;
  };
  const crossings: number[] = [];
  for (let i = 1; i < n; i++) {
    const a = filled[i - 1]! - THRESHOLD, b = filled[i]! - THRESHOLD;
    if (a * b < 0) crossings.push(bisect(f, (i - 1) * STEP, i * STEP, THRESHOLD));
  }

  return {
    points,
    energy: trapezoid(filled, STEP),
    peak: Math.max(...filled),
    missingCount,
    reconstructedPct: (missingCount / daylight) * 100,
    crossings,
    daylightHours: len,
  };
}

export interface Equivalent {
  id: "bulbs" | "homes" | "evs" | "phones";
  title: string;
  value: string;
  sub: string;
}

/** Real-world equivalents of a total energy figure E (kWh). */
export function equivalents(E: number): Equivalent[] {
  const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
  return [
    { id: "bulbs", title: "Light Bulbs", value: `${fmt(E * 100)} hours`, sub: "lit by a 10 W LED bulb" },
    { id: "homes", title: "Average Homes", value: `${fmt(E / 30)} days`, sub: "of power for an average home" },
    { id: "evs", title: "Electric Vehicles", value: `${fmt(E * 3.5)} miles`, sub: "of driving in a standard EV" },
    { id: "phones", title: "Smartphones", value: `${fmt(E / 0.015)} charges`, sub: "full smartphone charges" },
  ];
}

export function fmtTime(t: number) {
  const h = Math.floor(t);
  const m = Math.round((t - h) * 60);
  return `${String(h + (m === 60 ? 1 : 0)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
