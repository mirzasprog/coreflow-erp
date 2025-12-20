import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusTone = "draft" | "approved" | "posted" | "closed";

const toneConfig: Record<
  StatusTone,
  {
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
  }
> = {
  draft: {
    variant: "secondary",
    className: "text-muted-foreground",
  },
  approved: {
    variant: "default",
    className: "bg-blue-600 text-white",
  },
  posted: {
    variant: "default",
    className: "bg-green-600 text-white",
  },
  closed: {
    variant: "outline",
    className: "border-muted-foreground text-muted-foreground",
  },
};

interface StatusBadgeProps {
  tone: StatusTone;
  label: string;
  className?: string;
}

export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  const config = toneConfig[tone];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {label}
    </Badge>
  );
}
