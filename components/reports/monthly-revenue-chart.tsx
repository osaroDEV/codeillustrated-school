"use client";

import { Bar, BarChart, CartesianGrid, Rectangle, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/billing";
import type { MonthRevenue } from "@/lib/reports";

// Colours validated for the admin's dark surface with the dataviz palette
// checker, including colour-blind separation. They identify series, so text
// beside them stays in the neutral text colours.
const SUBSCRIPTION = "#3987e5";
const ONE_OFF = "#c98500";
const SURFACE = "#131318";
const GRID = "rgba(255,255,255,0.08)";
const AXIS = "rgba(255,255,255,0.45)";

const compact = (n: number) => (n >= 10_000 ? `${Math.round(n / 1000)}K` : n.toLocaleString("en-GB"));

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { payload: MonthRevenue }[];
  currency: string;
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="bg-[#1b1b22] border border-white/10 rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-white/50 mb-1">{row.label}</p>
      {(
        [
          [SUBSCRIPTION, row.subscription, "Subscriptions"],
          [ONE_OFF, row.oneOff, "Certificates"],
        ] as const
      ).map(([color, value, name]) => (
        <p key={name} className="flex items-center gap-2 text-white/60">
          <span className="w-3 h-0.5 rounded-full" style={{ background: color }} />
          <strong className="text-white font-semibold">{formatMoney(value, currency)}</strong> {name}
        </p>
      ))}
    </div>
  );
}

// The rounded end belongs to whichever segment is on top of the stack.
type BarShape = React.ComponentProps<typeof Rectangle> & { payload?: MonthRevenue };
const roundedIfTop = (isTop: (row: MonthRevenue) => boolean) =>
  function Segment({ payload, ...props }: BarShape) {
    const top = payload ? isTop(payload) : false;
    return <Rectangle {...props} radius={top ? [4, 4, 0, 0] : 0} stroke={SURFACE} strokeWidth={2} />;
  };

const SubscriptionSegment = roundedIfTop((row) => row.oneOff === 0);
const OneOffSegment = roundedIfTop(() => true);

export function MonthlyRevenueChart({ currency, data }: { currency: string; data: MonthRevenue[] }) {
  return (
    <figure>
      <figcaption className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <span className="text-white font-semibold text-sm">Revenue by month ({currency})</span>
        <span className="flex items-center gap-4 text-xs text-white/60">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: SUBSCRIPTION }} /> Subscriptions</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: ONE_OFF }} /> Certificates</span>
        </span>
      </figcaption>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tick={{ fill: AXIS, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} interval="preserveStartEnd" />
            <YAxis tick={{ fill: AXIS, fontSize: 11 }} axisLine={false} tickLine={false} width={44} tickFormatter={compact} allowDecimals={false} />
            <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} content={<ChartTooltip currency={currency} />} />
            <Bar dataKey="subscription" stackId="revenue" fill={SUBSCRIPTION} maxBarSize={24} shape={SubscriptionSegment as never} isAnimationActive={false} />
            <Bar dataKey="oneOff" stackId="revenue" fill={ONE_OFF} maxBarSize={24} shape={OneOffSegment as never} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-3">
        <summary className="text-white/40 hover:text-white text-xs cursor-pointer">View as a table</summary>
        <table className="w-full text-xs text-white/70 mt-2">
          <thead>
            <tr className="text-white/40 text-left">
              <th scope="col" className="py-1 font-medium">Month</th>
              <th scope="col" className="py-1 font-medium text-right">Subscriptions</th>
              <th scope="col" className="py-1 font-medium text-right">Certificates</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.month} className="border-t border-white/[0.06]">
                <td className="py-1">{row.label}</td>
                <td className="py-1 text-right">{formatMoney(row.subscription, currency)}</td>
                <td className="py-1 text-right">{formatMoney(row.oneOff, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
