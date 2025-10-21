import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Award } from "lucide-react";

interface LeaderboardEntry {
  userId: string;
  fullName: string;
  totalReward: number;
  rank: number;
}

interface LeaderboardProps {
  teamId: string;
}

export const Leaderboard = ({ teamId }: LeaderboardProps) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [rewards, setRewards] = useState({ first: 0, second: 0, third: 0 });

  useEffect(() => {
    if (teamId) {
      fetchLeaderboard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const fetchLeaderboard = async () => {
    // Fetch team rewards
    const { data: teamData } = await supabase
      .from("teams")
      .select("first_place_reward, second_place_reward, third_place_reward")
      .eq("id", teamId)
      .single();

    if (teamData) {
      setRewards({
        first: teamData.first_place_reward || 0,
        second: teamData.second_place_reward || 0,
        third: teamData.third_place_reward || 0,
      });
    }

    // Fetch all approved tasks for this team
    const { data: tasks } = await supabase
      .from("tasks")
      .select("completed_by, xp, completed, approval_status")
      .eq("team_id", teamId)
      .eq("completed", true)
      .eq("approval_status", "approved");

    if (!tasks) return;

    // Group by user and sum rewards
    const userRewards = new Map<string, number>();
    tasks.forEach((task) => {
      if (task.completed_by) {
        const current = userRewards.get(task.completed_by) || 0;
        userRewards.set(task.completed_by, current + task.xp);
      }
    });

    // Fetch user names
    const userIds = Array.from(userRewards.keys());
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    const leaderboard: LeaderboardEntry[] = [];
    userRewards.forEach((totalReward, userId) => {
      const profile = profiles?.find((p) => p.id === userId);
      leaderboard.push({
        userId,
        fullName: profile?.full_name || "Neznámý",
        totalReward,
        rank: 0,
      });
    });

    // Sort and assign ranks
    leaderboard.sort((a, b) => b.totalReward - a.totalReward);
    leaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    setEntries(leaderboard);
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-700" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankReward = (rank: number) => {
    switch (rank) {
      case 1:
        return rewards.first;
      case 2:
        return rewards.second;
      case 3:
        return rewards.third;
      default:
        return 0;
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-primary" />
        Žebříček nejlepších zaměstnanců
      </h3>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Zatím nejsou žádné dokončené úkoly
        </p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => {
            const rankReward = getRankReward(entry.rank);
            return (
              <div
                key={entry.userId}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-smooth"
              >
                <div className="flex-shrink-0">{getRankIcon(entry.rank)}</div>
                <div className="flex-1">
                  <p className="font-semibold">{entry.fullName}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.totalReward} Kč vyděláno
                  </p>
                </div>
                {rankReward > 0 && (
                  <Badge variant="secondary" className="gradient-primary">
                    +{rankReward} Kč bonus
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};
