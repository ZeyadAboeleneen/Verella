"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ── Revenue Bar Chart ──────────────────────────────────────────────────────
interface RevenueDataPoint {
  day: string;
  revenue: number;
}

export function RevenueBarChart({ data }: { data: RevenueDataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0e8de" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#8E7B6A" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#8E7B6A" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 100).toFixed(0)}`}
        />
        <Tooltip
          formatter={(value) => {
            const num = typeof value === "number" ? value : 0;
            return [`EGP ${(num / 100).toFixed(2)}`, "Revenue"];
          }}
          contentStyle={{
            borderRadius: "10px",
            border: "1px solid #e8d5bc",
            fontSize: 12,
          }}
        />
        <Bar dataKey="revenue" fill="#57392D" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Order Status Donut Chart ───────────────────────────────────────────────
interface StatusDataPoint {
  name: string;
  value: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending:           "#f59e0b",
  confirmed:         "#3b82f6",
  preparing:         "#8b5cf6",
  out_for_delivery:  "#06b6d4",
  ready_for_pickup:  "#10b981",
  completed:         "#57392D",
  cancelled:         "#ef4444",
};

const STATUS_LABEL: Record<string, string> = {
  pending:           "Pending",
  confirmed:         "Confirmed",
  preparing:         "Preparing",
  out_for_delivery:  "Out for Delivery",
  ready_for_pickup:  "Ready for Pickup",
  completed:         "Completed",
  cancelled:         "Cancelled",
};

export function OrderStatusDonut({ data }: { data: StatusDataPoint[] }) {
  if (data.every((d) => d.value === 0)) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-[#8E7B6A]">
        No orders yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={STATUS_COLORS[entry.name] ?? "#8E7B6A"}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [
            value,
            STATUS_LABEL[String(name)] ?? String(name),
          ]}
          contentStyle={{
            borderRadius: "10px",
            border: "1px solid #e8d5bc",
            fontSize: 12,
          }}
        />
        <Legend
          formatter={(value) => STATUS_LABEL[value] ?? value}
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
