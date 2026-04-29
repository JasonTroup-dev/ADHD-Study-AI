import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type TaskToggleProps = Omit<
  ComponentProps<"input">,
  "checked" | "onChange" | "type"
> & {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

export function TaskToggle({
  checked,
  onCheckedChange,
  className,
  disabled,
  ...props
}: TaskToggleProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled || !onCheckedChange}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      className={cn("mt-1 h-4 w-4 rounded border-gray-300", className)}
      {...props}
    />
  );
}
