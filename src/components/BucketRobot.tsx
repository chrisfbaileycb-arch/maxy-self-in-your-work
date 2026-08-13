// The friendly robot that "tosses" memories into the bucket.
// Pure SVG + CSS — no dependencies.
import { cn } from "@/lib/utils";
import type { BucketRobotProps } from "@/types";

export function BucketRobot({ state = "idle", className }: BucketRobotProps) {
  return (
    <div className={cn("flex items-end gap-3", className)} aria-hidden>
      {/* Robot */}
      <svg
        width="72"
        height="88"
        viewBox="0 0 72 88"
        className={cn(
          "transition-transform",
          state === "thinking" && "animate-pulse",
          state === "happy" && "-rotate-3",
        )}
      >
        {/* head */}
        <rect
          x="16"
          y="10"
          width="40"
          height="34"
          rx="8"
          className="fill-primary/20 stroke-primary"
          strokeWidth="2"
        />
        {/* antenna */}
        <line x1="36" y1="10" x2="36" y2="2" className="stroke-primary" strokeWidth="2" />
        <circle cx="36" cy="2" r="2" className="fill-primary" />
        {/* eyes */}
        <circle
          cx="27"
          cy="26"
          r="3"
          className={cn("fill-primary", state === "happy" && "fill-emerald-400")}
        />
        <circle
          cx="45"
          cy="26"
          r="3"
          className={cn("fill-primary", state === "happy" && "fill-emerald-400")}
        />
        {/* mouth */}
        <rect x="28" y="34" width="16" height="3" rx="1.5" className="fill-primary/60" />
        {/* body */}
        <rect
          x="12"
          y="46"
          width="48"
          height="30"
          rx="6"
          className="fill-primary/10 stroke-primary"
          strokeWidth="2"
        />
        {/* arm tossing */}
        <line
          x1="60"
          y1="52"
          x2={state === "thinking" ? 68 : 72}
          y2={state === "thinking" ? 42 : 34}
          className="stroke-primary"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      {/* Bucket */}
      <svg width="80" height="70" viewBox="0 0 80 70">
        <path
          d="M8 14 L72 14 L64 66 Q64 68 62 68 L18 68 Q16 68 16 66 Z"
          className="fill-primary/15 stroke-primary"
          strokeWidth="2"
        />
        <ellipse
          cx="40"
          cy="14"
          rx="32"
          ry="4"
          className="fill-primary/30 stroke-primary"
          strokeWidth="2"
        />
        <text
          x="40"
          y="46"
          textAnchor="middle"
          className="fill-primary/70 text-[10px] font-semibold"
        >
          MEMORY
        </text>
      </svg>
    </div>
  );
}
