import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, type TooltipProps,
} from "recharts";
import { type ValueType, type NameType } from "recharts/types/component/DefaultTooltipContent";
import { ArrowLeft, TrendingUp, Package, DollarSign, BarChart3, Layers } from "lucide-react";
import type { AnalyticsResponse, AnalyticsRange } from "@shared/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtShort(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const PURPLE = "#9C27B0";
const PURPLE_LIGHT = "#CE93D8";
const RANGE_LABELS: Record<AnalyticsRange, string> = {
  week: "This Week",
  month: "This Month",
  alltime: "All Time",
};

const CATEGORY_COLORS: Record<string, string> = {
  Sprays: "#2196F3",
  "Cloths & Wipes": "#4CAF50",
  Bathroom: "#9C27B0",
  Floors: "#FF9800",
  Supplies: "#F44336",
};

function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "#607D8B";
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const value = typeof entry.value === "number" ? entry.value : Number(entry.value ?? 0);
  return (
    <div
      className="text-sm rounded-xl px-3 py-2"
      style={{
        background: "rgba(255,255,255,0.95)",
        border: "1px solid rgba(156,39,176,0.18)",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
      }}
    >
      <p className="font-semibold text-slate-800 mb-0.5">{label}</p>
      <p style={{ color: PURPLE }}>
        {entry.name === "spend" ? `$${fmtShort(value)}` : `${value} units`}
      </p>
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
}) {
  return (
    <div
      className="rounded-2xl p-4 flex items-start gap-3"
      style={{
        background: "rgba(255,255,255,0.90)",
        border: "1px solid rgba(156,39,176,0.10)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}
      >
        <Icon className="w-5 h-5" style={{ color: accent }} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-slate-800 leading-none tabular-nums">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ range }: { range: AnalyticsRange }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-8">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: "rgba(156,39,176,0.08)", border: "1px solid rgba(156,39,176,0.15)" }}
      >
        <BarChart3 className="w-8 h-8" style={{ color: PURPLE }} />
      </div>
      <p className="text-slate-700 text-lg font-semibold">No data yet</p>
      <p className="text-slate-400 text-sm mt-1 leading-relaxed max-w-xs">
        {range === "week"
          ? "No checkouts recorded in the last 7 days."
          : range === "month"
          ? "No checkouts recorded in the last 30 days."
          : "No checkout history exists yet."}{" "}
        Check out supplies from the kiosk to start seeing analytics here.
      </p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Analytics() {
  const [, navigate] = useLocation();
  const [range, setRange] = useState<AnalyticsRange>("week");

  const { data, isLoading } = useQuery<AnalyticsResponse>({
    queryKey: ["/api/analytics", range],
    queryFn: () => fetch(`/api/analytics?range=${range}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const hasData = (data?.itemBreakdown?.length ?? 0) > 0;

  // Truncate item names for chart labels
  const chartItems = (data?.itemBreakdown ?? []).slice(0, 10).map((item) => ({
    ...item,
    shortName: item.itemName.length > 18 ? item.itemName.slice(0, 17) + "…" : item.itemName,
  }));

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #F8F0FC 0%, #FCF4FF 40%, #F3E5F5 100%)" }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-50 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(248,240,252,0.88)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(156,39,176,0.12)",
        }}
      >
        <button
          onClick={() => navigate("/")}
          data-testid="button-back-home"
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-opacity hover:opacity-70"
          style={{ background: "rgba(156,39,176,0.08)", border: "1px solid rgba(156,39,176,0.15)" }}
        >
          <ArrowLeft className="w-4 h-4" style={{ color: PURPLE }} />
        </button>
        <div className="flex-1">
          <h1 className="text-[17px] font-bold text-slate-800 leading-none">Analytics</h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Supply usage & cost tracking</p>
        </div>
        <div
          className="px-3 py-1.5 rounded-full text-[11px] font-bold"
          style={{ background: "rgba(156,39,176,0.10)", border: "1px solid rgba(156,39,176,0.20)", color: PURPLE }}
        >
          {RANGE_LABELS[range]}
        </div>
      </div>

      {/* Time range toggle */}
      <div className="px-4 pt-4 pb-2">
        <div
          className="flex rounded-2xl p-1 gap-1"
          style={{
            background: "rgba(255,255,255,0.70)",
            border: "1px solid rgba(156,39,176,0.12)",
          }}
        >
          {(["week", "month", "alltime"] as AnalyticsRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              data-testid={`button-range-${r}`}
              className="flex-1 py-2 rounded-xl text-[13px] font-semibold transition-all"
              style={
                range === r
                  ? {
                      background: PURPLE,
                      color: "#fff",
                      boxShadow: "0 2px 8px rgba(156,39,176,0.35)",
                    }
                  : { color: "#9C27B0", opacity: 0.65 }
              }
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pb-8 space-y-4">
        {isLoading ? (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="h-24 rounded-2xl animate-pulse bg-white/60" />
              ))}
            </div>
            <div className="h-56 rounded-2xl animate-pulse bg-white/60" />
            <div className="h-40 rounded-2xl animate-pulse bg-white/60" />
          </div>
        ) : !hasData ? (
          <div
            className="rounded-2xl mt-2"
            style={{
              background: "rgba(255,255,255,0.88)",
              border: "1px solid rgba(156,39,176,0.10)",
              boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
            }}
          >
            <EmptyState range={range} />
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <StatCard
                label="Total Spent"
                value={`$${fmt(data!.totalSpend)}`}
                sub={RANGE_LABELS[range].toLowerCase()}
                icon={DollarSign}
                accent={PURPLE}
              />
              <StatCard
                label="Units Used"
                value={String(data!.totalUnits)}
                sub={`across ${data!.itemBreakdown.length} item${data!.itemBreakdown.length !== 1 ? "s" : ""}`}
                icon={Package}
                accent="#2196F3"
              />
            </div>

            {/* Top items bar chart */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: "rgba(255,255,255,0.90)",
                border: "1px solid rgba(156,39,176,0.10)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}
            >
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4" style={{ color: PURPLE }} />
                <p className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Most Used Items</p>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(180, chartItems.length * 36)}>
                <BarChart
                  layout="vertical"
                  data={chartItems}
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.05)" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="shortName"
                    width={120}
                    tick={{ fontSize: 11, fill: "#475569" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "rgba(156,39,176,0.05)" }} />
                  <Bar dataKey="unitsSold" name="units" radius={[0, 4, 4, 0]} maxBarSize={22}>
                    {chartItems.map((entry, index) => (
                      <Cell key={index} fill={index === 0 ? PURPLE : PURPLE_LIGHT} fillOpacity={1 - index * 0.06} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Item breakdown table */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.90)",
                border: "1px solid rgba(156,39,176,0.10)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}
            >
              <div className="flex items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(156,39,176,0.08)" }}>
                <Package className="w-4 h-4" style={{ color: PURPLE }} />
                <p className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Item Breakdown</p>
              </div>
              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                <span>Item</span>
                <span className="text-right">Units</span>
                <span className="text-right">Each</span>
                <span className="text-right">Total</span>
              </div>
              <div className="divide-y divide-slate-50">
                {data!.itemBreakdown.map((item, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-4 py-3 items-center"
                    data-testid={`analytics-item-row-${i}`}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800 truncate leading-snug">{item.itemName}</p>
                      <span
                        className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5"
                        style={{
                          background: `${categoryColor(item.category)}15`,
                          color: categoryColor(item.category),
                          border: `1px solid ${categoryColor(item.category)}25`,
                        }}
                      >
                        {item.category}
                      </span>
                    </div>
                    <span className="text-[13px] font-bold text-slate-700 tabular-nums text-right">{item.unitsSold}</span>
                    <span className="text-[12px] text-slate-400 tabular-nums text-right">${fmtShort(parseFloat(item.unitCost))}</span>
                    <span className="text-[13px] font-bold tabular-nums text-right" style={{ color: PURPLE }}>
                      ${fmt(item.totalCost)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category totals */}
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.90)",
                border: "1px solid rgba(156,39,176,0.10)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
              }}
            >
              <div className="flex items-center gap-2 px-4 pt-4 pb-3" style={{ borderBottom: "1px solid rgba(156,39,176,0.08)" }}>
                <Layers className="w-4 h-4" style={{ color: PURPLE }} />
                <p className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">By Category</p>
              </div>
              <div className="p-4 space-y-3">
                {data!.categoryTotals.map((cat, i) => {
                  const pct = data!.totalSpend > 0 ? (cat.totalCost / data!.totalSpend) * 100 : 0;
                  const color = categoryColor(cat.category);
                  return (
                    <div key={i} data-testid={`analytics-category-${i}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[13px] font-semibold text-slate-700">{cat.category}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] text-slate-400 tabular-nums">{cat.unitsSold} units</span>
                          <span className="text-[13px] font-bold tabular-nums" style={{ color }}>
                            ${fmt(cat.totalCost)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full" style={{ background: `${color}15` }}>
                        <div
                          className="h-2 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly trend — all time only */}
            {range === "alltime" && data!.monthlyTrend && data!.monthlyTrend.length > 0 && (
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(255,255,255,0.90)",
                  border: "1px solid rgba(156,39,176,0.10)",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4" style={{ color: PURPLE }} />
                  <p className="text-[13px] font-bold text-slate-700 uppercase tracking-wide">Monthly Spend (Last 12 mo)</p>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data!.monthlyTrend} margin={{ top: 0, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: string) => {
                        const [y, m] = v.split("-");
                        const date = new Date(Number(y), Number(m) - 1);
                        return date.toLocaleDateString("en-US", { month: "short" });
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#94A3B8" }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) => `$${v}`}
                    />
                    <Tooltip
                      content={<CustomBarTooltip />}
                      cursor={{ fill: "rgba(156,39,176,0.05)" }}
                    />
                    <Bar dataKey="spend" name="spend" fill={PURPLE} radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
