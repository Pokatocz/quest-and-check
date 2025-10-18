import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Star, Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  photoUrl?: string | null;
  location?: string | null;
  assignedTo?: string | null;
  canComplete: boolean;
  canDelete?: boolean;
  onComplete: (photoUrl: string) => void;
  onDelete?: () => void;
}

export const TaskCard = ({ id, title, description, xp, completed, photoUrl, location, assignedTo, canComplete, canDelete, onComplete, onDelete }: TaskCardProps) => {
  const [uploading, setUploading] = useState(false);
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("task-photos")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("task-photos")
        .getPublicUrl(filePath);

      onComplete(publicUrl);
      toast.success("Fotka nahrána a úkol dokončen!");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Chyba při nahrávání fotky");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card
      className={cn(
        "p-6 transition-smooth hover:shadow-glow border-2",
        completed ? "border-success bg-success/5" : "border-border bg-card"
      )}
    >
      <div className="flex items-start gap-4">
        {completed ? (
          <CheckCircle2 className="w-6 h-6 text-success mt-1" />
        ) : (
          <Circle className="w-6 h-6 text-muted-foreground mt-1" />
        )}
        
        <div className="flex-1">
          <h3 className={cn(
            "text-lg font-semibold mb-1",
            completed && "line-through text-muted-foreground"
          )}>
            {title}
          </h3>
          <p className="text-sm text-muted-foreground mb-2">{description}</p>
          {location && (
            <p className="text-xs text-muted-foreground mb-3">📍 {location}</p>
          )}
          
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gradient-primary">
              <Star className="w-3 h-3 mr-1" />
              {xp} Kč
            </Badge>

            {canComplete && !completed && (
              <label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={uploading}
                  onClick={() => document.querySelector<HTMLInputElement>(`input[type="file"]`)?.click()}
                  className="cursor-pointer"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {uploading ? "Nahrávání..." : "Nahrát foto"}
                </Button>
              </label>
            )}

            {photoUrl && (
              <a
                href={photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ImageIcon className="w-3 h-3" />
                Zobrazit foto
              </a>
            )}

            {canDelete && onDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onDelete}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                Smazat
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};
