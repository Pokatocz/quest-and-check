import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { TeamDashboard } from "@/components/TeamDashboard";
import { Button } from "@/components/ui/button";
import { LogOut, Sparkles } from "lucide-react";

const Index = () => {
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="w-12 h-12 text-primary animate-glow-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Načítání...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Gamifikace Práce
            </h1>
            <p className="text-muted-foreground">
              Vítejte zpět, {profile?.full_name}!
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Sparkles className="w-12 h-12 text-primary animate-glow-pulse" />
            <Button variant="outline" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Odhlásit se
            </Button>
          </div>
        </div>

        <TeamDashboard onTeamSelect={(teamId) => navigate(`/team/${teamId}`)} />
      </div>
    </div>
  );
};

export default Index;
