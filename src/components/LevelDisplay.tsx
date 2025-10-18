import { Progress } from "@/components/ui/progress";
import { Trophy, Zap } from "lucide-react";

interface LevelDisplayProps {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
}

export const LevelDisplay = ({ level, currentXP, xpForNextLevel }: LevelDisplayProps) => {
  const progress = (currentXP / xpForNextLevel) * 100;

  return (
    <div className="bg-card border-2 border-border rounded-xl p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shadow-glow">
            <Trophy className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Úroveň {level}</h2>
            <p className="text-sm text-muted-foreground">
              {currentXP} / {xpForNextLevel} Kč
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-semibold text-primary">{currentXP} Kč</span>
        </div>
      </div>
      
      <div className="space-y-2">
        <Progress value={progress} className="h-3 bg-muted" />
        <p className="text-xs text-muted-foreground text-right">
          {xpForNextLevel - currentXP} Kč do další úrovně
        </p>
      </div>
    </div>
  );
};
