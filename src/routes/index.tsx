import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer,
  Scatter, ComposedChart, Tooltip, XAxis, YAxis, Line,
} from "recharts";
import { Sun, Battery, Activity, Clock, Lightbulb, Home, Car, Smartphone } from "lucide-react";
import {
  analyze, fmtTime, equivalents, LOCATION, THRESHOLD, WEATHER, type Location, type Weather,
} from "@/lib/solar";

const EQUIV_ICONS = { bulbs: Lightbulb, homes: Home, evs: Car, phones: Smartphone } as const;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Solar Energy Generation Analysis System" },
      { name: "description", content: "Analyze solar power: interpolate missing data, integrate energy, find threshold-crossing times." },
      { property: "og:title", content: "Solar Energy Generation Analysis System" },
      { property: "og:description", content: "Interpolation, numerical integration and root finding on solar power data." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Toggle<T extends string>({ title, value, options, onChange }: {
  title: string; value: T; options: Record<T, { label: string }>; onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="flex flex-col gap-2">
        {(Object.keys(options) as T[]).map((k) => (
          <button
            key={k}
            onClick={() => onChange(k)}
            className={`rounded-lg border px-4 py-2.5 text-left transition-all ${
              value === k
                ? "border-primary bg-primary/10 text-foreground shadow-sm"
                : "border-border bg-card hover:bg-secondary"
            }`}
          >
            {options[k].label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, sub }: { icon: typeof Sun; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4 text-sun" /> <span className="text-sm">{label}</span>
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="mt-1 text-sm text-muted-foreground">{sub}</div>
    </div>
  );
}

function Equivalent({ icon: Icon, title, value, sub }: { icon: typeof Sun; title: string; value: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-secondary/50 p-4">
      <div className="rounded-full bg-sun/20 p-2.5"><Icon className="h-5 w-5 text-sun" /></div>
      <div>
        <div className="text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-2xl font-bold leading-tight">{value}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{sub}</div>
      </div>
    </div>
  );
}

function Index() {
  const [weather, setWeather] = useState<Weather>("sunny");
  const [location, setLocation] = useState<Location>("equator");
  const r = useMemo(() => analyze(weather, location), [weather, location]);
  const [start, end] = [r.crossings[0], r.crossings[r.crossings.length - 1]];

  return (
    <div className="min-h-screen bg-[image:var(--gradient-sky)]">
      <header className="border-b bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-6">
          <div className="rounded-full bg-sun/20 p-2"><Sun className="h-7 w-7 text-sun" /></div>
          <div>
            <h1 className="text-3xl font-bold">Solar Energy Generation Analysis System</h1>
            <p className="text-muted-foreground">Interpolation · Numerical Integration · Root Finding</p>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-6 rounded-xl border bg-card p-5 shadow-[var(--shadow-soft)]">
          <Toggle title="Weather" value={weather} options={WEATHER} onChange={setWeather} />
          <Toggle title="Location / Day Cycle" value={location} options={LOCATION} onChange={setLocation} />
        </aside>

        <section className="space-y-6">
          <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xl font-semibold">Power Generation over 24 Hours (kW)</h2>
              <div className="flex gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-full bg-primary" />Measured</span>
                <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-full bg-sun" />Reconstructed</span>
                <span className="flex items-center gap-1"><i className="h-3 w-3 rounded-full bg-destructive" />Threshold crossing</span>
              </div>
            </div>
            <div className="h-[420px]">
              <ResponsiveContainer>
                <ComposedChart data={r.points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--sun)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="t" type="number" domain={[0, 24]} ticks={[0, 3, 6, 9, 12, 15, 18, 21, 24]} tickFormatter={fmtTime} stroke="var(--muted-foreground)" />
                  <YAxis domain={[0, 110]} stroke="var(--muted-foreground)" unit=" kW" width={60} />
                  <Tooltip
                    labelFormatter={(t) => fmtTime(Number(t))}
                    formatter={(v: number, n: string) => [`${v} kW`, n]}
                    contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontFamily: "inherit" }}
                  />
                  <ReferenceLine y={THRESHOLD} stroke="var(--destructive)" strokeDasharray="6 4" label={{ value: `${THRESHOLD} kW threshold`, position: "insideTopRight", fill: "var(--destructive)" }} />
                  <Area type="monotone" dataKey="power" name="Power" stroke="var(--primary)" strokeWidth={2.5} fill="url(#fill)" animationDuration={700} />
                  <Line dataKey="measured" name="Measured" stroke="none" dot={{ r: 2.5, fill: "var(--primary)" }} isAnimationActive={false} legendType="none" />
                  <Scatter dataKey="reconstructed" name="Reconstructed" fill="var(--sun)" shape="diamond" />
                  {r.crossings.map((c) => (
                    <ReferenceDot key={c} x={c} y={THRESHOLD} r={7} fill="var(--destructive)" stroke="var(--card)" strokeWidth={2} />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={Battery} label="Total Energy Generated" value={`${r.energy.toFixed(1)} kWh`} sub="Trapezoidal rule integration" />
            <Metric icon={Activity} label="Data Health" value={`${r.reconstructedPct.toFixed(1)}%`} sub={`${r.missingCount} daylight readings reconstructed`} />
            <Metric icon={Clock} label={`Crosses ${THRESHOLD} kW`} value={start !== undefined ? `${fmtTime(start)} – ${fmtTime(end!)}` : "Not reached"} sub="Bisection root finding" />
            <Metric icon={Sun} label="Peak Output" value={`${r.peak.toFixed(1)} kW`} sub={`${r.daylightHours} h of daylight`} />
          </div>
        </section>
      </main>
    </div>
  );
}
