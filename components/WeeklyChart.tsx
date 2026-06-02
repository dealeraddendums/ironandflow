'use client';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import type { Athlete } from '@/lib/athletes';
import type { GymSet } from '@/lib/supabase';

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeeklyChart({
  athlete,
  sets,
  mode,
}: {
  athlete: Athlete;
  sets: GymSet[];
  mode: 'volume' | 'sets';
}) {
  const today = startOfDay();
  const days: { day: string; value: number; key: string }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push({
      day: DAY_LABELS[d.getDay()],
      key: d.toISOString().slice(0, 10),
      value: 0,
    });
  }
  for (const s of sets) {
    const k = startOfDay(new Date(s.logged_at)).toISOString().slice(0, 10);
    const slot = days.find((d) => d.key === k);
    if (!slot) continue;
    if (mode === 'volume') {
      slot.value += (s.sets || 0) * (s.reps || 0) * (s.weight || 0);
    } else {
      slot.value += s.sets || 0;
    }
  }

  return (
    <div style={{ height: 160, marginTop: 6 }}>
      <ResponsiveContainer>
        <BarChart data={days} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#666', fontSize: 11 }}
          />
          <YAxis hide />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.04)' }}
            contentStyle={{
              background: '#121212',
              border: '1px solid #1f1f1f',
              borderRadius: 6,
              fontSize: 12,
            }}
            labelStyle={{ color: '#888' }}
            formatter={(value) => {
              const v = typeof value === 'number' ? value : Number(value ?? 0);
              return mode === 'volume'
                ? [`${v.toLocaleString()} lbs`, 'Volume']
                : [String(v), 'Sets'];
            }}
          />
          <Bar dataKey="value" fill={athlete.accent} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
