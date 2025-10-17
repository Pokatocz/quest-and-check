import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TaskCard } from "@/components/TaskCard";
import { LevelDisplay } from "@/components/LevelDisplay";
import { StatsCard } from "@/components/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, TrendingUp, CheckCircle, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const TeamView = () => {
  const { teamId } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({ level: 1, xp: 0 });
  const [newTask, setNewTask] = useState({ title: "", description: "", xp: 50 });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (teamId && user) {
      fetchTeamData();
      fetchTasks();
    }
  }, [teamId, user]);

  const fetchTeamData = async () => {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single();
    
    if (error) {
      console.error("Error fetching team:", error);
      return;
    }
    setTeam(data);
  };

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });
    
    if (error) {
      console.error("Error fetching tasks:", error);
      return;
    }
    setTasks(data || []);
    
    // Calculate user stats
    const completedTasks = data?.filter(t => t.completed && t.completed_by === user?.id) || [];
    const totalXp = completedTasks.reduce((sum, t) => sum + t.xp, 0);
    const level = Math.floor(totalXp / 100) + 1;
    setUserStats({ level, xp: totalXp });
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase
      .from("tasks")
      .insert({
        team_id: teamId,
        title: newTask.title,
        description: newTask.description,
        xp: newTask.xp,
        created_by: user?.id,
      });

    if (error) {
      toast.error("Chyba při vytváření úkolu");
      return;
    }

    toast.success("Úkol vytvořen!");
    setNewTask({ title: "", description: "", xp: 50 });
    setDialogOpen(false);
    fetchTasks();
  };

  const handleCompleteTask = async (taskId: string, photoUrl: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({
        completed: true,
        completed_by: user?.id,
        photo_url: photoUrl,
        completed_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    if (error) {
      toast.error("Chyba při dokončování úkolu");
      return;
    }

    fetchTasks();
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const xpForNextLevel = userStats.level * 100;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zpět na týmy
          </Button>
          <h1 className="text-3xl font-bold">{team?.name}</h1>
        </div>

        <LevelDisplay
          level={userStats.level}
          currentXP={userStats.xp % xpForNextLevel}
          xpForNextLevel={xpForNextLevel}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            title="Aktivní úkoly"
            value={totalTasks - completedTasks}
            icon={Target}
            gradient
          />
          <StatsCard
            title="Dokončené"
            value={completedTasks}
            icon={CheckCircle}
          />
          <StatsCard
            title="Úspěšnost"
            value={`${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%`}
            icon={TrendingUp}
          />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Úkoly týmu</h2>
          {profile?.role === "employer" && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Nový úkol
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Vytvořit nový úkol</DialogTitle>
                </DialogHeader>
                <form onSubmit={createTask} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Název úkolu</Label>
                    <Input
                      id="title"
                      value={newTask.title}
                      onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Popis</Label>
                    <Textarea
                      id="description"
                      value={newTask.description}
                      onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="xp">XP odměna</Label>
                    <Input
                      id="xp"
                      type="number"
                      min="10"
                      value={newTask.xp}
                      onChange={(e) => setNewTask({ ...newTask, xp: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full gradient-primary">
                    Vytvořit úkol
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-4">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              id={task.id}
              title={task.title}
              description={task.description}
              xp={task.xp}
              completed={task.completed}
              photoUrl={task.photo_url}
              canComplete={profile?.role === "employee" && !task.completed}
              onComplete={(photoUrl) => handleCompleteTask(task.id, photoUrl)}
            />
          ))}

          {tasks.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Zatím žádné úkoly. {profile?.role === "employer" && "Vytvořte první!"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamView;
