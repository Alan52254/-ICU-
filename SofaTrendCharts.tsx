/**
 * SOFA Trend Segment Analysis Charts — Rising & Falling
 */

import { useSofaTrendSegments } from "@/hooks/use-sofa-data";
import type { TrendSegment } from "@/types/sofa";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface Props {
  patientId: string;
}

function SegmentBar({ segment, maxDelta }: { segment: TrendSegment; maxDelta: number }) {
  const width = Math.max(10, (Math.abs(segment.delta) / maxDelta) * 100);
  const isRising = segment.type === "rising";

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-20 shrink-0 font-mono-data text-[10px] text-muted-foreground">
        H{segment.startIcuHour.toFixed(0)}–{segment.endIcuHour.toFixed(0)}
      </span>
      <div className="relative flex-1">
        <div
          className={cn(
            "h-4 rounded-sm transition-all duration-500",
            isRising ? "bg-vital-critical/70" : "bg-vital-normal/70",
            segment.source === "predicted" && "opacity-60 border border-dashed"
          )}
          style={{ width: `${width}%` }}
        />
      </div>
      <span className={cn(
        "w-12 shrink-0 text-right font-mono-data font-semibold",
        isRising ? "text-vital-critical" : "text-vital-normal"
      )}>
        {isRising ? "+" : ""}{segment.delta.toFixed(1)}
      </span>
      <span className={cn(
        "metric-badge text-[9px]",
        segment.source === "actual" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      )}>
        {segment.source === "actual" ? "實測" : "預測"}
      </span>
    </div>
  );
}

function SegmentChart({
  title,
  icon: Icon,
  segments,
  emptyText,
  iconColor,
}: {
  title: string;
  icon: React.ElementType;
  segments: TrendSegment[];
  emptyText: string;
  iconColor: string;
}) {
  const maxDelta = Math.max(1, ...segments.map(s => Math.abs(s.delta)));

  return (
    <div className="icu-panel animate-fade-in-up p-4">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconColor)} />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-[10px] text-muted-foreground">
          ({segments.length} 區段)
        </span>
      </div>

      {segments.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="space-y-1.5">
          {segments.map((seg, i) => (
            <SegmentBar key={i} segment={seg} maxDelta={maxDelta} />
          ))}
        </div>
      )}

      {segments.length > 0 && (
        <div className="mt-2 rounded-md bg-muted/30 p-2 text-[10px] text-muted-foreground">
          最大{title.includes("上升") ? "上升" : "下降"}:
          H{segments.reduce((max, s) => Math.abs(s.delta) > Math.abs(max.delta) ? s : max).startIcuHour.toFixed(0)}–
          {segments.reduce((max, s) => Math.abs(s.delta) > Math.abs(max.delta) ? s : max).endIcuHour.toFixed(0)}
          , Δ = {segments.reduce((max, s) => Math.abs(s.delta) > Math.abs(max.delta) ? s : max).delta.toFixed(1)}
        </div>
      )}
    </div>
  );
}

export function SofaTrendCharts({ patientId }: Props) {
  const { data, isLoading } = useSofaTrendSegments(patientId);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="icu-panel p-4"><Skeleton className="h-40 w-full" /></div>
        <div className="icu-panel p-4"><Skeleton className="h-40 w-full" /></div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SegmentChart
        title="SOFA 上升區間分析"
        icon={TrendingUp}
        segments={data?.rising ?? []}
        emptyText="目前無顯著上升區段"
        iconColor="text-vital-critical"
      />
      <SegmentChart
        title="SOFA 下降區間分析"
        icon={TrendingDown}
        segments={data?.falling ?? []}
        emptyText="目前無顯著下降區段"
        iconColor="text-vital-normal"
      />
    </div>
  );
}
