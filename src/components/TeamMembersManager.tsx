import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, User } from "lucide-react";

interface TeamMember {
  user_id: string;
  role: string;
  profiles: {
    id: string;
    full_name: string;
  };
}

interface TeamMembersManagerProps {
  members: TeamMember[];
  isOwner: boolean;
  currentUserId?: string;
  onToggleManager: (memberId: string, currentRole: string) => void;
}

export const TeamMembersManager = ({
  members,
  isOwner,
  currentUserId,
  onToggleManager,
}: TeamMembersManagerProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <User className="w-5 h-5 text-primary" />
        Správa členů týmu
      </h3>

      {members.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">
          Zatím žádní zaměstnanci v týmu
        </p>
      ) : (
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-4 rounded-lg border bg-card"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  {member.role === 'manager' ? (
                    <Shield className="w-5 h-5 text-primary" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-semibold">
                    {member.profiles?.full_name || "Neznámý"}
                    {member.user_id === currentUserId && (
                      <span className="text-xs text-muted-foreground ml-2">(Vy)</span>
                    )}
                  </p>
                  <Badge variant={member.role === 'manager' ? "default" : "secondary"} className="text-xs">
                    {member.role === 'manager' ? '🛡️ Správce' : '👤 Zaměstnanec'}
                  </Badge>
                </div>
              </div>

              {isOwner && member.user_id !== currentUserId && (
                <Button
                  variant={member.role === 'manager' ? "outline" : "default"}
                  size="sm"
                  onClick={() => onToggleManager(member.user_id, member.role)}
                >
                  {member.role === 'manager' ? 'Odvolat správce' : 'Povýšit na správce'}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <p className="text-sm text-muted-foreground">
          <strong>Správce týmu</strong> může schvalovat úkoly a mazat je, ale nemůže spravovat členy týmu ani nastavení.
        </p>
      </div>
    </Card>
  );
};
