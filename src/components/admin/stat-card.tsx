import { Card, CardContent } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatProps {
  label: string;
  value: string;
  delta?: number;
  hint?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, delta, hint, icon }: StatProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-bold">{value}</div>
            {(delta !== undefined || hint) && (
              <div className="mt-1 flex items-center gap-1 text-xs">
                {delta !== undefined && (
                  <span className={cn("flex items-center", positive ? "text-success" : "text-destructive")}>
                    {positive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(delta).toFixed(1)}%
                  </span>
                )}
                {hint && <span className="text-muted-foreground">{hint}</span>}
              </div>
            )}
          </div>
          {icon && <div className="text-muted-foreground">{icon}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
