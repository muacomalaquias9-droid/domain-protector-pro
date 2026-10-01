import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const tones = {
  blue: "bg-primary text-primary-foreground shadow-[0_8px_0_0_var(--navy)]",
  navy: "bg-navy text-primary-foreground shadow-[0_8px_0_0_oklch(0.15_0.06_263)]",
  sky: "bg-accent text-accent-foreground shadow-[0_8px_0_0_var(--border)]",
  red: "bg-destructive text-destructive-foreground shadow-[0_8px_0_0_oklch(0.42_0.18_25)]",
  green: "bg-success text-primary-foreground shadow-[0_8px_0_0_oklch(0.45_0.13_150)]",
  amber: "bg-warning text-navy shadow-[0_8px_0_0_oklch(0.58_0.14_65)]",
};

export function AppIcon({
  icon: Icon,
  tone = "blue",
  size = "lg",
  className,
}: {
  icon: LucideIcon;
  tone?: keyof typeof tones;
  size?: "md" | "lg" | "xl";
  className?: string;
}) {
  const s = size === "xl" ? "h-24 w-24 rounded-[28px]" : size === "lg" ? "h-20 w-20 rounded-[24px]" : "h-14 w-14 rounded-2xl";
  const i = size === "xl" ? 48 : size === "lg" ? 40 : 28;
  return (
    <div className={cn("grid shrink-0 place-items-center", s, tones[tone], className)}>
      <Icon size={i} strokeWidth={2.75} />
    </div>
  );
}
