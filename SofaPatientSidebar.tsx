/**
 * Left sidebar: Patient info + clinical summary + system info
 */

import { usePatientSummary } from "@/hooks/use-patient-data";
import { useTimeStore } from "@/stores/time-store";
import { format } from "date-fns";
import { User, Calendar, Clock, TrendingUp, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  patientId: string;
}

export function SofaPatientSidebar({ patientId }: Props) {
  const { data: patient, isLoading } = usePatientSummary(patientId);
  const { admissionTime, currentICUHour } = useTimeStore();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="icu-panel p-4"><Skeleton className="h-32 w-full" /></div>
      </div>
    );
  }

  if (!patient) return null;

  return (
    <div className="space-y-4">
      {/* Patient Info */}
      <div className="icu-panel animate-fade-in-up p-4">
        <div className="mb-3 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">病人基本資訊</h3>
        </div>
        <div className="space-y-2.5 text-sm">
          <InfoRow label="Patient ID" value={patient.patientId} />
          <InfoRow
            label="進入ICU時間"
            value={format(admissionTime, "yyyy-MM-dd HH:mm")}
            icon={<Calendar className="h-3 w-3 text-muted-foreground" />}
          />
          <InfoRow
            label="ICU stay"
            value={`${Math.floor(currentICUHour)} 小時`}
            icon={<Clock className="h-3 w-3 text-muted-foreground" />}
          />
        </div>
      </div>

      {/* Clinical Summary */}
      <div className="icu-panel animate-fade-in-up p-4" style={{ animationDelay: "100ms" }}>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-vital-normal" />
          <h3 className="text-sm font-semibold text-foreground">臨床狀態摘要</h3>
        </div>
        <div className="rounded-md bg-primary/5 p-3 text-xs leading-relaxed text-foreground">
          病人目前生命徵象穩定。SOFA 趨勢顯示過去 4 小時內呼吸系統壓力略有下降。
        </div>
      </div>

      {/* System Info */}
      <div className="icu-panel animate-fade-in-up p-4" style={{ animationDelay: "200ms" }}>
        <div className="mb-3 flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">系統資訊</h3>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <span key={i} className="h-2 w-2 rounded-full bg-vital-normal" />
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="font-mono-data text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}
