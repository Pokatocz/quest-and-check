import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradient?: boolean;
}

export const StatsCard = ({ title, value, icon: Icon, gradient }: StatsCardProps) => {
  return (
    <Card className={cn(
      "p-6 transition-smooth hover:shadow-glow",
      gradient && "gradient-primary border-0"
    )}>
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center",
          gradient ? "bg-white/20" : "bg-primary/10"
        )}>
          <Icon className={cn(
            "w-6 h-6",
            gradient ? "text-primary-foreground" : "text-primary"
          )} />
        </div>
        <div>
          <p className={cn(
            "text-sm",
            gradient ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {title}
          </p>
          <p className={cn(
            "text-2xl font-bold",
            gradient ? "text-primary-foreground" : "text-foreground"
          )}>
            {value}
          </p>
        </div>
      </div>
    </Card>
  );
};
