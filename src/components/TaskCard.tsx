import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  onComplete: () => void;
}

export const TaskCard = ({ title, description, xp, completed, onComplete }: TaskCardProps) => {
  return (
    <Card
      className={cn(
        "p-6 transition-smooth hover:shadow-glow border-2",
        completed ? "border-success bg-success/5" : "border-border bg-card"
      )}
    >
      <div className="flex items-start gap-4">
        <button
          onClick={onComplete}
          disabled={completed}
          className="mt-1 transition-smooth hover:scale-110 disabled:opacity-50"
        >
          {completed ? (
            <CheckCircle2 className="w-6 h-6 text-success" />
          ) : (
            <Circle className="w-6 h-6 text-muted-foreground hover:text-primary" />
          )}
        </button>
        
        <div className="flex-1">
          <h3 className={cn(
            "text-lg font-semibold mb-1",
            completed && "line-through text-muted-foreground"
          )}>
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">{description}</p>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gradient-primary">
              <Star className="w-3 h-3 mr-1" />
              {xp} XP
            </Badge>
          </div>
        </div>
      </div>
    </Card>
  );
};
