/**
 * SOFA Main Chart — Actual + Gap + Prediction windows
 */

import { useMemo, useState, useCallback } from "react";
import { useSofaFullSeries } from "@/hooks/use-sofa-data";
import { useTimeStore } from "@/stores/time-store";
import { computePredictedMaxSOFA } from "@/lib/sofa-scoring";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceArea, ReferenceDot, Legend,
} from "recharts";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  patientId: string;
  onHoverTime?: (ts: string | null) => void;
}

interface ChartPoint {
  icuHour: number;
  ts: string;
  actual: number | null;
  predicted: number | null;
}

export function SofaMainChart({ patientId, onHoverTime }: Props) {
  const { data, isLoading } = useSofaFullSeries(patientId);
  const { currentICUHour, gapWindowHours, selectedForecastHorizonHours } = useTimeStore();
  const [hoveredPoint, setHoveredPoint] = useState<ChartPoint | null>(null);

  const { chartData, maxPredicted, gapStart, gapEnd, predEnd } = useMemo(() => {
    if (!data) return { chartData: [], maxPredicted: null, gapStart: 0, gapEnd: 0, predEnd: 0 };

    const actualMap = new Map<number, number | null>();
    data.actual.forEach(p => actualMap.set(Math.round(p.icuHour), p.total));

    const predictedMap = new Map<number, number | null>();
    data.predicted.forEach(p => predictedMap.set(Math.round(p.icuHour), p.total));

    const allHours = new Set<number>();
    data.actual.forEach(p => allHours.add(Math.round(p.icuHour)));
    data.predicted.forEach(p => allHours.add(Math.round(p.icuHour)));

    const hours = Array.from(allHours).sort((a, b) => a - b);
    const cd: ChartPoint[] = hours.map(h => {
      const actualPt = data.actual.find(p => Math.round(p.icuHour) === h);
      const predPt = data.predicted.find(p => Math.round(p.icuHour) === h);
      return {
        icuHour: h,
        ts: actualPt?.ts ?? predPt?.ts ?? "",
        actual: actualMap.get(h) ?? null,
        predicted: predictedMap.get(h) ?? null,
      };
    });

    const { maxPoint } = computePredictedMaxSOFA(data.predicted);
    const gs = Math.round(currentICUHour);
    const ge = Math.round(currentICUHour + gapWindowHours);
    const pe = Math.round(currentICUHour + gapWindowHours + selectedForecastHorizonHours);

    return { chartData: cd, maxPredicted: maxPoint, gapStart: gs, gapEnd: ge, predEnd: pe };
  }, [data, currentICUHour, gapWindowHours, selectedForecastHorizonHours]);

  const handleMouseMove = useCallback((state: any) => {
    if (state?.activePayload?.[0]) {
      const pt = state.activePayload[0].payload as ChartPoint;
      setHoveredPoint(pt);
      onHoverTime?.(pt.ts);
    }
  }, [onHoverTime]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    onHoverTime?.(null);
  }, [onHoverTime]);

  const currentSOFA = data?.actual?.length ? data.actual[data.actual.length - 1].total : null;
  const predMaxSOFA = maxPredicted?.total ?? null;
  const delta = currentSOFA !== null && predMaxSOFA !== null ? predMaxSOFA - currentSOFA : null;

  if (isLoading) {
    return (
      <div className="icu-panel p-4">
        <Skeleton className="mb-4 h-6 w-48" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="icu-panel animate-fade-in-up p-4">
      <div className="mb-1 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">總 SOFA 主圖</h2>
          <p className="text-xs text-muted-foreground">即時監測與預測趨勢分析</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded bg-primary" />
            真值 (ACTUAL)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-5 rounded border border-dashed border-muted-foreground" />
            預測值 (PREDICTED)
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 12, right: 12, bottom: 4, left: 0 }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="icuHour"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            label={{ value: "ICU 小時 (Hours)", position: "insideBottom", offset: -2, style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" } }}
          />
          <YAxis
            domain={[0, 24]}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const pt = payload[0].payload as ChartPoint;
              return (
                <div className="rounded-lg border bg-card px-3 py-2 shadow-md">
                  <p className="text-xs font-semibold text-foreground">
                    HOUR {pt.icuHour}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {pt.ts ? format(new Date(pt.ts), "yyyy-MM-dd HH:mm") : ""}
                  </p>
                  {pt.actual !== null && (
                    <p className="mt-1 text-xs">真值: <span className="font-mono-data font-semibold">{pt.actual}</span></p>
                  )}
                  {pt.predicted !== null && (
                    <p className="text-xs">預測值: <span className="font-mono-data font-semibold">{pt.predicted}</span></p>
                  )}
                </div>
              );
            }}
          />

          {/* Gap window shading (grey) */}
          <ReferenceArea
            x1={gapStart}
            x2={gapEnd}
            fill="hsl(var(--muted))"
            fillOpacity={0.5}
            strokeOpacity={0}
            label={{ value: 'GAP', position: 'insideTop', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}
          />

          {/* Prediction window shading (primary tinted) */}
          <ReferenceArea
            x1={gapEnd}
            x2={predEnd}
            fill="hsl(var(--primary))"
            fillOpacity={0.06}
            stroke="hsl(var(--primary))"
            strokeOpacity={0.15}
            strokeDasharray="4 2"
            label={{ value: 'PRED', position: 'insideTop', fontSize: 9, fill: 'hsl(var(--primary))' }}
          />

          {/* Actual line */}
          <Line
            type="monotone"
            dataKey="actual"
            name="真值"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />

          {/* Predicted line */}
          <Line
            type="monotone"
            dataKey="predicted"
            name="預測值"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={{ r: 2, fill: "hsl(var(--muted-foreground))" }}
            activeDot={{ r: 4 }}
            connectNulls={false}
          />

          {/* Max predicted point highlight */}
          {maxPredicted && (
            <ReferenceDot
              x={Math.round(maxPredicted.icuHour)}
              y={maxPredicted.total ?? 0}
              r={6}
              fill="hsl(var(--vital-critical))"
              stroke="hsl(var(--background))"
              strokeWidth={2}
            />
          )}
        </LineChart>
      </ResponsiveContainer>

      {/* Summary bar below chart */}
      <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg border bg-muted/30 p-3">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">當前分數</p>
          <p className="font-mono-data text-2xl font-bold text-primary">
            {currentSOFA ?? "N/A"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">
            預測分數 ({selectedForecastHorizonHours}h)
          </p>
          <p className="font-mono-data text-2xl font-bold text-vital-critical">
            {predMaxSOFA ?? "N/A"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">變化</p>
          <div className="flex items-center justify-center gap-1">
            {delta !== null ? (
              <>
                {delta > 0 ? (
                  <TrendingUp className="h-4 w-4 text-vital-critical" />
                ) : delta < 0 ? (
                  <TrendingDown className="h-4 w-4 text-vital-normal" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={`font-mono-data text-2xl font-bold ${
                  delta > 0 ? "text-vital-critical" : delta < 0 ? "text-vital-normal" : "text-muted-foreground"
                }`}>
                  {delta > 0 ? "+" : ""}{delta}
                </span>
              </>
            ) : (
              <span className="font-mono-data text-2xl font-bold text-muted-foreground">N/A</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
