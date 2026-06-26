import { cn } from "@/lib/utils";

type CompletionProgressProps = {
  value: number;
  label: string;
  className?: string;
  indicatorClassName?: string;
};

export function CompletionProgress({
  value,
  label,
  className,
  indicatorClassName,
}: CompletionProgressProps) {
  const boundedValue = Math.min(100, Math.max(0, value));

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={boundedValue}
      className={cn(
        "h-3 w-full overflow-hidden rounded-full bg-gray-300",
        className,
      )}
      role="progressbar"
    >
      <div
        className={cn(
          "relative h-full overflow-hidden rounded-full bg-black transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          indicatorClassName,
        )}
        style={{ width: `${boundedValue}%` }}
      >
        {boundedValue > 0 ? (
          <span
            aria-hidden="true"
            className="completion-progress-shimmer absolute inset-0 bg-linear-to-r from-transparent via-white/45 to-transparent"
          />
        ) : null}
      </div>
    </div>
  );
}
