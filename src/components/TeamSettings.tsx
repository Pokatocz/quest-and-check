import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, Settings, DollarSign } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TeamSettingsProps {
  teamId: string;
  isOwner: boolean;
  teamName: string;
  firstPlaceReward?: number;
  secondPlaceReward?: number;
  thirdPlaceReward?: number;
  onUpdate: () => void;
}

export const TeamSettings = ({
  teamId,
  isOwner,
  teamName,
  firstPlaceReward = 0,
  secondPlaceReward = 0,
  thirdPlaceReward = 0,
  onUpdate,
}: TeamSettingsProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rewards, setRewards] = useState({
    first: firstPlaceReward,
    second: secondPlaceReward,
    third: thirdPlaceReward,
  });

  const handleDeleteTeam = async () => {
    const { error } = await supabase.from("teams").delete().eq("id", teamId);

    if (error) {
      toast.error("Chyba při mazání týmu");
      return;
    }

    toast.success("Tým smazán");
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;

    const { error } = await supabase.from("profiles").delete().eq("id", user.id);

    if (error) {
      toast.error("Chyba při mazání účtu");
      return;
    }

    await supabase.auth.signOut();
    toast.success("Účet smazán");
    navigate("/auth");
  };

  const handleUpdateRewards = async () => {
    const { error } = await supabase
      .from("teams")
      .update({
        first_place_reward: rewards.first,
        second_place_reward: rewards.second,
        third_place_reward: rewards.third,
      })
      .eq("id", teamId);

    if (error) {
      toast.error("Chyba při ukládání odměn");
      return;
    }

    toast.success("Odměny uloženy");
    onUpdate();
  };

  return (
    <div className="space-y-6">
      {isOwner && (
        <Card className="p-6">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Nastavení odměn za žebříček
          </h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="first">🥇 Odměna za 1. místo (Kč)</Label>
              <Input
                id="first"
                type="number"
                min="0"
                value={rewards.first}
                onChange={(e) => setRewards({ ...rewards, first: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="second">🥈 Odměna za 2. místo (Kč)</Label>
              <Input
                id="second"
                type="number"
                min="0"
                value={rewards.second}
                onChange={(e) => setRewards({ ...rewards, second: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="third">🥉 Odměna za 3. místo (Kč)</Label>
              <Input
                id="third"
                type="number"
                min="0"
                value={rewards.third}
                onChange={(e) => setRewards({ ...rewards, third: parseInt(e.target.value) || 0 })}
              />
            </div>
            <Button onClick={handleUpdateRewards} className="w-full gradient-primary">
              Uložit odměny
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Nastavení
        </h3>
        <div className="space-y-4">
          {isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Smazat tým "{teamName}"
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Opravdu chcete smazat tento tým?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tato akce je nevratná. Všechny úkoly a data týmu budou trvale smazány.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Zrušit</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteTeam}>Smazat tým</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="w-full border-destructive text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Smazat můj účet
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Opravdu chcete smazat svůj účet?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tato akce je nevratná. Všechna vaše data budou trvale smazána.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Zrušit</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive">
                  Smazat účet
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Card>
    </div>
  );
};
