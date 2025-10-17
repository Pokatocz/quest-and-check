import { useState } from "react";
import { TaskCard } from "@/components/TaskCard";
import { LevelDisplay } from "@/components/LevelDisplay";
import { StatsCard } from "@/components/StatsCard";
import { Target, TrendingUp, CheckCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: number;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
}

const Index = () => {
  const [level, setLevel] = useState(1);
  const [currentXP, setCurrentXP] = useState(0);
  const xpForNextLevel = level * 100;

  const [tasks, setTasks] = useState<Task[]>([
    {
      id: 1,
      title: "Dokončit týdenní report",
      description: "Sepsat a odeslat týdenní report týmu",
      xp: 50,
      completed: false,
    },
    {
      id: 2,
      title: "Code review 3 pull requestů",
      description: "Zkontrolovat a poskytnout feedback na pending PR",
      xp: 75,
      completed: false,
    },
    {
      id: 3,
      title: "Aktualizovat dokumentaci",
      description: "Aktualizovat API dokumentaci nových features",
      xp: 40,
      completed: false,
    },
    {
      id: 4,
      title: "Team meeting",
      description: "Zúčastnit se týmového standupu",
      xp: 30,
      completed: false,
    },
  ]);

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;

  const handleCompleteTask = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.completed) return;

    const newXP = currentXP + task.xp;
    const newTasks = tasks.map(t =>
      t.id === taskId ? { ...t, completed: true } : t
    );

    setTasks(newTasks);
    setCurrentXP(newXP);

    // Check for level up
    if (newXP >= xpForNextLevel) {
      setLevel(level + 1);
      setCurrentXP(newXP - xpForNextLevel);
      toast.success(`🎉 Level Up! Jste nyní úroveň ${level + 1}!`, {
        description: "Gratulujeme k postupu!",
      });
    } else {
      toast.success(`+${task.xp} XP získáno!`, {
        description: task.title,
      });
    }
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Gamifikace Práce
            </h1>
            <p className="text-muted-foreground">
              Plňte úkoly, získávejte XP a postupujte na vyšší úrovně!
            </p>
          </div>
          <Sparkles className="w-12 h-12 text-primary animate-glow-pulse" />
        </div>

        {/* Level Display */}
        <LevelDisplay
          level={level}
          currentXP={currentXP}
          xpForNextLevel={xpForNextLevel}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Aktivní úkoly"
            value={totalTasks - completedTasks}
            icon={Target}
            gradient
          />
          <StatsCard
            title="Dokončené dnes"
            value={completedTasks}
            icon={CheckCircle}
          />
          <StatsCard
            title="Úspěšnost"
            value={`${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%`}
            icon={TrendingUp}
          />
        </div>

        {/* Tasks Section */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Vaše úkoly</h2>
          <div className="space-y-4">
            {tasks.map(task => (
              <TaskCard
                key={task.id}
                title={task.title}
                description={task.description}
                xp={task.xp}
                completed={task.completed}
                onComplete={() => handleCompleteTask(task.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
