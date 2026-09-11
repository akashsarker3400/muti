"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/** Applications per day for the last 30 days (section 7.1). */
export function ApplicationsChart({
  data,
}: {
  data: Array<{ date: string; label: string; count: number }>;
}) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="muti-applications" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1B2A6B" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#1B2A6B" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#E3E7EE" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#5B6472" }}
            tickLine={false}
            axisLine={{ stroke: "#E3E7EE" }}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#5B6472" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ stroke: "#1B2A6B", strokeOpacity: 0.2 }}
            contentStyle={{
              borderRadius: 10,
              border: "1px solid #E3E7EE",
              fontSize: 12,
            }}
            labelFormatter={(label) => String(label)}
            formatter={(value) => [Number(value ?? 0), "Applications"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#1B2A6B"
            strokeWidth={2}
            fill="url(#muti-applications)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
