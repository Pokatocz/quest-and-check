import { Zap } from "lucide-react";

interface LevelDisplayProps {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
}

export const LevelDisplay = ({ level, currentXP, xpForNextLevel }: LevelDisplayProps) => {
  return (
    <div className="bg-card border-2 border-border rounded-xl p-6 shadow-card">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center shadow-glow">
          <Zap className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Celkem vyděláno</h2>
          <p className="text-3xl font-bold text-primary mt-1">
            {currentXP} Kč
          </p>
        </div>
      </div>
    </div>
  );
};
