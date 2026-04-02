/**
 * SOFA Detail Card — Right sidebar with 6 organ subscores
 */

import { useSofaPeakSummary } from "@/hooks/use-sofa-data";
import { useTimeStore } from "@/stores/time-store";
import { ORGAN_KEYS, ORGAN_LABELS, type SofaSubScores } from "@/types/sofa";
import { format } from "date-fns";
import { Activity, TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface Props {
  patientId: string;
  highlightedTime?: string | null;
}

const scoreColor = (v: number | null): string => {
  if (v === null) return "bg-muted";
  if (v === 0) return "bg-primary";
  if (v <= 1) return "bg-vital-info";
  if (v <= 2) return "bg-vital-warning";
  if (v <= 3) return "bg-vital-critical/80";
  return "bg-vital-critical";
};

const riskColors: Record<string, string> = {
  "0-1": "bg-primary",
  "2": "bg-vital-warning",
  "3": "bg-vital-critical/80",
  "4": "bg-vital-critical",
};

export function SofaDetailCard({ patientId, highlightedTime }: Props) {
  const { data: peak, isLoading } = useSofaPeakSummary(patientId);
  const { selectedForecastHorizonHours } = useTimeStore();
  const [selectedOrgan, setSelectedOrgan] = useState<keyof SofaSubScores | null>(null);

  if (isLoading) {
    return (
      <div className="icu-panel animate-slide-in-right p-4">
        <Skeleton className="mb-3 h-6 w-full" />
        <Skeleton className="mb-2 h-20 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!peak) return null;

  return (
    <div className="icu-panel animate-slide-in-right space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-vital-warning" />
          <h3 className="text-sm font-semibold text-foreground">該時間點詳細資訊卡</h3>
        </div>
        <span className={cn(
          "metric-badge",
          peak.riskLevel === "critical" ? "bg-vital-critical/15 text-vital-critical" :
          peak.riskLevel === "high" ? "bg-vital-critical/10 text-vital-critical" :
          peak.riskLevel === "moderate" ? "bg-vital-warning/15 text-vital-warning" :
          "bg-vital-normal/15 text-vital-normal"
        )}>
          預測Hour {selectedForecastHorizonHours}
        </span>
      </div>

      {/* Total SOFA comparison */}
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium">TOTAL SOFA (預測 VS 真值)</span>
          <span>{peak.predictedMaxTime ? format(new Date(peak.predictedMaxTime), "yyyy-MM-dd HH:mm") : ""}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">真值 (ACTUAL)</p>
            <p className="font-mono-data text-3xl font-bold text-primary">
              {peak.currentTotal ?? "N/A"}
            </p>
          </div>
          <div className={cn(
            "rounded-lg border px-3 py-2",
            peak.riskLevel === "critical" ? "border-vital-critical/30 bg-vital-critical/5" :
            peak.riskLevel === "high" ? "border-vital-critical/20 bg-vital-critical/5" :
            "bg-muted/30"
          )}>
            <p className="text-[10px] font-medium uppercase tracking-wider text-vital-critical">預測 (PREDICTED)</p>
            <p className="font-mono-data text-3xl font-bold text-vital-critical">
              {peak.predictedMaxTotal ?? "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Six organ detail */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground">六器官 SOFA 詳細評估</h4>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>真值</span>
            <span>預測</span>
          </div>
        </div>

        {/* Legend */}
        <div className="mb-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
          {Object.entries(riskColors).map(([label, color]) => (
            <span key={label} className="flex items-center gap-1">
              <span className={cn("inline-block h-2 w-2 rounded-full", color)} />
              {label === "0-1" ? "0-1 低風險" : label === "2" ? "2 中風險" : label === "3" ? "3 高風險" : "4 嚴重衰竭"}
            </span>
          ))}
        </div>

        <div className="space-y-2.5">
          {ORGAN_KEYS.map(organ => {
            const actual = peak.currentSubscores[organ];
            const predicted = peak.predictedMaxSubscores[organ];
            const isSelected = selectedOrgan === organ;

            return (
              <button
                key={organ}
                onClick={() => setSelectedOrgan(isSelected ? null : organ)}
                className={cn(
                  "w-full rounded-md px-2 py-1.5 text-left transition-colors",
                  isSelected ? "bg-muted/60 ring-1 ring-primary/30" : "hover:bg-muted/40"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{ORGAN_LABELS[organ]}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-data text-sm font-semibold text-foreground">
                      {actual ?? "N/A"}
                    </span>
                    {/* Delta indicator */}
                    {actual !== null && predicted !== null ? (
                      predicted > actual ? (
                        <TrendingUp className="h-3 w-3 text-vital-critical" />
                      ) : predicted < actual ? (
                        <TrendingDown className="h-3 w-3 text-vital-normal" />
                      ) : (
                        <Minus className="h-3 w-3 text-muted-foreground" />
                      )
                    ) : null}
                    <span className={cn(
                      "font-mono-data text-sm font-semibold",
                      predicted !== null && predicted >= 3 ? "text-vital-critical" :
                      predicted !== null && predicted >= 2 ? "text-vital-warning" :
                      "text-foreground"
                    )}>
                      {predicted ?? "N/A"}
                    </span>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="flex h-full">
                    {actual !== null && (
                      <div
                        className={cn("h-full transition-all duration-500", scoreColor(actual))}
                        style={{ width: `${(actual / 4) * 50}%` }}
                      />
                    )}
                    {predicted !== null && (
                      <div
                        className={cn("h-full transition-all duration-500", scoreColor(predicted), "opacity-60")}
                        style={{ width: `${(predicted / 4) * 50}%` }}
                      />
                    )}
                  </div>
                </div>

                {isSelected && (
                  <p className="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                    {getOrganDescription(organ, actual, predicted)}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Footnote */}
      <div className="flex items-start gap-1.5 rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
        <span>
          預測 Hour t：{selectedForecastHorizonHours}。本評估由系統自動生成，請結合臨床觀察與實際檢查結果進行綜合判斷。
          Total SOFA = 六器官分數加總，越高表示器官功能異常程度越高。
          顯示的預測值為 prediction window 內的最大 SOFA 值。
        </span>
      </div>
    </div>
  );
}

function getOrganDescription(organ: keyof SofaSubScores, actual: number | null, predicted: number | null): string {
  const descriptions: Record<keyof SofaSubScores, string> = {
    respiratory: "呼吸系統評估：基於 PaO2/FiO2 比值，反映肺部氧合功能。",
    coagulation: "凝血系統評估：基於血小板計數，反映凝血功能。",
    liver: "肝功能評估：基於膽紅素數值，反映肝臟代謝功能。",
    cardiovascular: "心血管系統評估：基於 MAP 與升壓藥使用，反映循環穩定度。",
    cns: "中樞神經系統評估：基於 GCS 分數，反映意識狀態。",
    renal: "腎功能評估：基於肌酐與尿量，反映腎臟過濾功能。",
  };

  let delta = "";
  if (actual !== null && predicted !== null) {
    const diff = predicted - actual;
    if (diff > 0) delta = ` 預測分數上升 +${diff}，需密切關注。`;
    else if (diff < 0) delta = ` 預測分數改善 ${diff}。`;
    else delta = " 預測分數維持穩定。";
  }

  return descriptions[organ] + delta;
}
