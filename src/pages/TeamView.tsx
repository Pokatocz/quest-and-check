import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TaskCard } from "@/components/TaskCard";
import { LevelDisplay } from "@/components/LevelDisplay";
import { StatsCard } from "@/components/StatsCard";
import { Leaderboard } from "@/components/Leaderboard";
import { TeamSettings } from "@/components/TeamSettings";
import { TeamMembersManager } from "@/components/TeamMembersManager";
import { TeamChat } from "@/components/TeamChat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Target, TrendingUp, CheckCircle, Plus, ArrowLeft, Settings, Trophy, ListTodo, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const TeamView = () => {
  const { teamId } = useParams();
  const { user, userRole: globalUserRole } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>("employee");
  const [userStats, setUserStats] = useState({ level: 1, xp: 0 });
  const [newTask, setNewTask] = useState({ 
    title: "", 
    description: "", 
    xp: 50, 
    location: "", 
    assignedTo: "" 
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (teamId && user) {
      fetchTeamData();
      fetchTasks();
      fetchTeamMembers();
      fetchUserRole();
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

  const fetchUserRole = async () => {
    if (team?.owner_id === user?.id) {
      setUserRole("owner");
      return;
    }

    const { data } = await supabase
      .from("team_members")
      .select("role")
      .eq("team_id", teamId)
      .eq("user_id", user?.id)
      .single();

    if (data) {
      setUserRole(data.role || "employee");
    }
  };

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from("team_members")
      .select(`
        user_id,
        role,
        profiles:user_id (
          id,
          full_name
        )
      `)
      .eq("team_id", teamId);

    if (error) {
      console.error("Error fetching team members:", error);
      return;
    }
    setTeamMembers(data || []);
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
    
    // Calculate user stats - only count approved tasks
    const completedTasks = data?.filter(t => 
      t.completed && 
      t.completed_by === user?.id && 
      t.approval_status === 'approved'
    ) || [];
    const totalXp = completedTasks.reduce((sum, t) => sum + t.xp, 0);
    const level = Math.floor(totalXp / 100) + 1;
    setUserStats({ level, xp: totalXp });
  };

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input validation schema
    const taskSchema = z.object({
      title: z.string()
        .trim()
        .min(1, 'Název úkolu je povinný')
        .max(200, 'Název je příliš dlouhý (max 200 znaků)'),
      description: z.string()
        .trim()
        .max(2000, 'Popis je příliš dlouhý (max 2000 znaků)')
        .optional()
        .or(z.literal('')),
      xp: z.number()
        .int('XP musí být celé číslo')
        .min(0, 'XP nemůže být záporné')
        .max(10000, 'XP je příliš vysoké (max 10000)'),
      location: z.string()
        .trim()
        .max(500, 'Lokace je příliš dlouhá (max 500 znaků)')
        .optional()
        .or(z.literal('')),
      assignedTo: z.string().uuid('Neplatné ID uživatele').nullable()
    });

    // Validate input
    const validated = taskSchema.safeParse({
      title: newTask.title,
      description: newTask.description || '',
      xp: newTask.xp,
      location: newTask.location || '',
      assignedTo: newTask.assignedTo || null
    });

    if (!validated.success) {
      toast.error(validated.error.errors[0].message);
      return;
    }

    // Verify assigned user is team member if specified
    if (validated.data.assignedTo) {
      const { data: isMember } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', validated.data.assignedTo)
        .single();
        
      if (!isMember) {
        toast.error('Vybraný uživatel není členem týmu');
        return;
      }
    }
    
    const { error } = await supabase
      .from("tasks")
      .insert({
        team_id: teamId,
        title: validated.data.title,
        description: validated.data.description || null,
        xp: validated.data.xp,
        location: validated.data.location || null,
        assigned_to: validated.data.assignedTo,
        created_by: user?.id,
      });

    if (error) {
      toast.error("Chyba při vytváření úkolu");
      return;
    }

    toast.success("Úkol vytvořen!");
    setNewTask({ title: "", description: "", xp: 50, location: "", assignedTo: "" });
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
        approval_status: 'pending'
      })
      .eq("id", taskId);

    if (error) {
      toast.error("Chyba při dokončování úkolu");
      return;
    }

    fetchTasks();
  };

  const handleReserveTask = async (taskId: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({
        reserved_by: user?.id,
        reserved_at: new Date().toISOString()
      })
      .eq("id", taskId);

    if (error) {
      toast.error("Chyba při zamluvení úkolu");
      return;
    }

    toast.success("Úkol zamluven!");
    fetchTasks();
  };

  const handleReleaseTask = async (taskId: string) => {
    const { error } = await supabase
      .from("tasks")
      .update({
        reserved_by: null,
        reserved_at: null
      })
      .eq("id", taskId);

    if (error) {
      toast.error("Chyba při uvolnění úkolu");
      return;
    }

    toast.success("Úkol uvolněn!");
    fetchTasks();
  };

  const handleApproveTask = async (taskId: string, approved: boolean) => {
    const { error } = await supabase
      .from("tasks")
      .update({
        approval_status: approved ? 'approved' : 'rejected',
      })
      .eq("id", taskId);

    if (error) {
      toast.error("Chyba při schvalování úkolu");
      return;
    }

    toast.success(approved ? "Úkol schválen!" : "Úkol zamítnut");
    fetchTasks();
  };

  const handleToggleManager = async (memberId: string, currentRole: string) => {
    const newRole = currentRole === 'manager' ? 'employee' : 'manager';
    
    const { error } = await supabase
      .from("team_members")
      .update({ role: newRole })
      .eq("team_id", teamId)
      .eq("user_id", memberId);

    if (error) {
      toast.error("Chyba při změně role");
      return;
    }

    toast.success(newRole === 'manager' ? "Zaměstnanec povýšen na správce" : "Správce odvolán");
    fetchTeamMembers();
    fetchUserRole();
  };

  const handleDeleteTask = async (taskId: string) => {
    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      toast.error("Chyba při mazání úkolu");
      return;
    }

    toast.success("Úkol smazán");
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

        {globalUserRole === "employee" && (
          <LevelDisplay
            level={userStats.level}
            currentXP={userStats.xp}
            xpForNextLevel={xpForNextLevel}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className={globalUserRole === "employee" ? "grid w-full grid-cols-4" : "grid w-full grid-cols-4"}>
            <TabsTrigger value="tasks">
              <ListTodo className="w-4 h-4 mr-2" />
              Úkoly
            </TabsTrigger>
            <TabsTrigger value="chat">
              <MessageSquare className="w-4 h-4 mr-2" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" />
              Nastavení
            </TabsTrigger>
            {globalUserRole === "employee" && (
              <TabsTrigger value="leaderboard">
                <Trophy className="w-4 h-4 mr-2" />
                Žebříček
              </TabsTrigger>
            )}
            {(globalUserRole === "employer" || userRole === "owner") && (
              <TabsTrigger value="members">
                <Users className="w-4 h-4 mr-2" />
                Členové
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="tasks" className="space-y-4 mt-6">
            <Tabs defaultValue="active" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="active">
                  Aktivní úkoly
                </TabsTrigger>
                <TabsTrigger value="completed">
                  Dokončené úkoly
                </TabsTrigger>
              </TabsList>

              <TabsContent value="active" className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Aktivní úkoly</h2>
                  {(globalUserRole === "employer" || userRole === "owner" || userRole === "manager") && (
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                      <DialogTrigger asChild>
                        <Button className="gradient-primary">
                          <Plus className="w-4 h-4 mr-2" />
                          Nový úkol
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                        <Label htmlFor="location">Místo (nepovinné)</Label>
                        <Input
                          id="location"
                          value={newTask.location}
                          onChange={(e) => setNewTask({ ...newTask, location: e.target.value })}
                          placeholder="např. Brno, Hlavní 123"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="assignedTo">Přiřadit zaměstnanci (nepovinné)</Label>
                        <Select
                          value={newTask.assignedTo || "unassigned"}
                          onValueChange={(value) => setNewTask({ ...newTask, assignedTo: value === "unassigned" ? "" : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Vyberte zaměstnance nebo nechte prázdné" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unassigned">Všichni zaměstnanci</SelectItem>
                            {teamMembers.map((member: any) => (
                              <SelectItem key={member.user_id} value={member.user_id}>
                                {member.profiles?.full_name || "Neznámý"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="xp">Odměna (Kč)</Label>
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
                  {tasks
                    .filter(task => !task.completed || task.approval_status === 'pending' || task.approval_status === 'rejected')
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        id={task.id}
                        title={task.title}
                        description={task.description}
                        xp={task.xp}
                        completed={task.completed}
                        photoUrl={task.photo_url}
                        location={task.location}
                        assignedTo={task.assigned_to}
                        reservedBy={task.reserved_by}
                        reservedAt={task.reserved_at}
                        reservedByName={teamMembers.find((m: any) => m.user_id === task.reserved_by)?.profiles?.full_name}
                        approvalStatus={task.approval_status}
                        canComplete={globalUserRole === "employee" && !task.completed}
                        canDelete={globalUserRole === "employer" || userRole === "owner" || userRole === "manager"}
                        canApprove={(globalUserRole === "employer" || userRole === "owner" || userRole === "manager") && task.completed}
                        canReserve={globalUserRole === "employee" && !task.completed}
                        onComplete={(photoUrl) => handleCompleteTask(task.id, photoUrl)}
                        onDelete={() => handleDeleteTask(task.id)}
                        onApprove={handleApproveTask}
                        onReserve={handleReserveTask}
                        onRelease={handleReleaseTask}
                        currentUserId={user?.id}
                      />
                    ))}

                  {tasks.filter(task => !task.completed || task.approval_status === 'pending' || task.approval_status === 'rejected').length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      Žádné aktivní úkoly. {(globalUserRole === "employer" || userRole === "owner" || userRole === "manager") && "Vytvořte první!"}
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed" className="space-y-4 mt-4">
                <h2 className="text-xl font-semibold">Dokončené úkoly</h2>
                <div className="space-y-4">
                  {tasks
                    .filter(task => task.completed && task.approval_status === 'approved')
                    .map((task) => (
                      <TaskCard
                        key={task.id}
                        id={task.id}
                        title={task.title}
                        description={task.description}
                        xp={task.xp}
                        completed={task.completed}
                        photoUrl={task.photo_url}
                        location={task.location}
                        assignedTo={task.assigned_to}
                        reservedBy={task.reserved_by}
                        reservedAt={task.reserved_at}
                        reservedByName={teamMembers.find((m: any) => m.user_id === task.reserved_by)?.profiles?.full_name}
                        approvalStatus={task.approval_status}
                        canComplete={false}
                        canDelete={globalUserRole === "employer" || userRole === "owner" || userRole === "manager"}
                        canApprove={false}
                        canReserve={false}
                        onComplete={(photoUrl) => handleCompleteTask(task.id, photoUrl)}
                        onDelete={() => handleDeleteTask(task.id)}
                        onApprove={handleApproveTask}
                        currentUserId={user?.id}
                      />
                    ))}

                  {tasks.filter(task => task.completed && task.approval_status === 'approved').length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      Zatím žádné dokončené úkoly.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </TabsContent>


          <TabsContent value="chat" className="mt-6">
            <TeamChat teamId={teamId!} currentUserId={user?.id!} />
          </TabsContent>

          <TabsContent value="settings" className="mt-6">
            <TeamSettings
              teamId={teamId!}
              isOwner={team?.owner_id === user?.id}
              teamName={team?.name || ""}
              firstPlaceReward={team?.first_place_reward}
              secondPlaceReward={team?.second_place_reward}
              thirdPlaceReward={team?.third_place_reward}
              onUpdate={() => {
                fetchTeamData();
                fetchTasks();
              }}
            />
          </TabsContent>

          {globalUserRole === "employee" && (
            <TabsContent value="leaderboard" className="mt-6">
              <Leaderboard teamId={teamId!} />
            </TabsContent>
          )}

          {(globalUserRole === "employer" || userRole === "owner") && (
            <TabsContent value="members" className="mt-6">
              <TeamMembersManager
                members={teamMembers}
                isOwner={userRole === "owner"}
                currentUserId={user?.id}
                onToggleManager={handleToggleManager}
              />
            </TabsContent>
          )}
        </Tabs>

        <div className="grid grid-cols-1 gap-4">
          <StatsCard
            title="Celkem odměn"
            value={`${userStats.xp} Kč`}
            icon={Trophy}
            gradient
          />
        </div>
      </div>
    </div>
  );
};

export default TeamView;
