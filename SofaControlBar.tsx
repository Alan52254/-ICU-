/**
 * Top control bar for SOFA dashboard:
 * - Brand
 * - Gap Window selector (4/8/16/24h)
 * - ICU Hour display
 * - Playback controls (play/pause/step)
 * - Speed control
 *
 * Forecast horizon is fixed at 4h (no selector needed).
 */

import { usePlaybackStore } from "@/stores/playback-store";
import { Play, Pause, SkipForward, SkipBack, Activity, Clock, Gauge } from "lucide-react";
import { cn } from "@/lib/utils";

const gapOptions = [4, 8, 16, 24];
const speedOptions = [
  { label: "1×", value: 3 },
  { label: "2×", value: 1.5 },
  { label: "4×", value: 0.75 },
  { label: "8×", value: 0.375 },
];

export function SofaControlBar() {
  const {
    currentHourIdx,
    maxHourIdx,
    gapWindowHours,
    isPlaying,
    playbackSpeed,
    selectedPatientId,
    setGapWindow,
    stepForward,
    stepBackward,
    togglePlayback,
    setPlaybackSpeed,
    setCurrentHour,
  } = usePlaybackStore();

  return (
    <div className="icu-panel flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2.5">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold text-foreground leading-tight">ICU SOFA 監測系統</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">MIMIC-IV Patient Replay</p>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-2 py-1">
        <button
          onClick={stepBackward}
          disabled={currentHourIdx <= 0}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
          title="Previous hour"
        >
          <SkipBack className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={togglePlayback}
          disabled={!selectedPatientId}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            isPlaying
              ? "bg-vital-critical/20 text-vital-critical"
              : "bg-primary/20 text-primary"
          )}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={stepForward}
          disabled={currentHourIdx >= maxHourIdx}
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors"
          title="Next hour"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Hour Progress */}
      <div className="flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">ICU Hour</span>
        <span className="rounded-md border bg-muted/50 px-2.5 py-1 font-mono-data text-xs font-bold text-foreground">
          {currentHourIdx}
        </span>
        <input
          type="range"
          min={0}
          max={maxHourIdx}
          value={currentHourIdx}
          onChange={e => setCurrentHour(parseInt(e.target.value))}
          className="w-24 h-1 accent-primary cursor-pointer"
          title={`Hour ${currentHourIdx} / ${maxHourIdx}`}
        />
        <span className="text-[10px] text-muted-foreground font-mono-data">{maxHourIdx}h</span>
      </div>

      {/* Speed */}
      <div className="flex items-center gap-1.5">
        <Gauge className="h-3 w-3 text-muted-foreground" />
        <div className="flex gap-0.5">
          {speedOptions.map(s => (
            <button
              key={s.label}
              onClick={() => setPlaybackSpeed(s.value)}
              className={cn(
                "rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors",
                Math.abs(playbackSpeed - s.value) < 0.01
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gap Window Selector */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Gap</span>
        <div className="flex gap-0.5">
          {gapOptions.map(g => (
            <button
              key={g}
              onClick={() => setGapWindow(g)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[10px] font-medium transition-colors",
                g === gapWindowHours
                  ? "bg-muted text-foreground ring-1 ring-border"
                  : "text-muted-foreground hover:bg-muted/60"
              )}
            >
              {g}h
            </button>
          ))}
        </div>
      </div>

      {/* Fixed forecast info */}
      <div className="ml-auto flex items-center gap-1.5 rounded-md border border-dashed border-muted-foreground/30 px-3 py-1">
        <span className="text-[10px] text-muted-foreground">Forecast: 4h</span>
        <span className="text-[10px] text-muted-foreground">•</span>
        <span className="text-[10px] text-muted-foreground">
          Patient: {selectedPatientId ?? "—"}
        </span>
      </div>
    </div>
  );
}
