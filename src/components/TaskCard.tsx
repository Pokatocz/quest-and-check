import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Star, Upload, Image as ImageIcon, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface TaskCardProps {
  id: string;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  photoUrl?: string | null;
  location?: string | null;
  assignedTo?: string | null;
  approvalStatus?: string;
  canComplete: boolean;
  canDelete?: boolean;
  canApprove?: boolean;
  onComplete: (photoUrl: string) => void;
  onDelete?: () => void;
  onApprove?: (taskId: string, approved: boolean) => void;
}

export const TaskCard = ({ 
  id, title, description, xp, completed, photoUrl, location, assignedTo, 
  approvalStatus, canComplete, canDelete, canApprove, onComplete, onDelete, onApprove 
}: TaskCardProps) => {
  const [uploading, setUploading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPendingFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewImage(reader.result as string);
      setShowPreview(true);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmUpload = async () => {
    if (!pendingFile) return;

    setUploading(true);
    try {
      const fileExt = pendingFile.name.split(".").pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("task-photos")
        .upload(filePath, pendingFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("task-photos")
        .getPublicUrl(filePath);

      onComplete(publicUrl);
      toast.success("Fotka nahrána! Čeká na schválení zaměstnavatelem.");
      setShowPreview(false);
      setPreviewImage(null);
      setPendingFile(null);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Chyba při nahrávání fotky");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = () => {
    if (!completed) return null;
    
    switch (approvalStatus) {
      case 'pending':
        return <Badge variant="secondary">⏳ Čeká na schválení</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-success">✓ Schváleno</Badge>;
      case 'rejected':
        return <Badge variant="destructive">✗ Zamítnuto</Badge>;
      default:
        return null;
    }
  };

  return (
    <>
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
              
              {getStatusBadge()}

              {canComplete && !completed && (
                <label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
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

              {canApprove && completed && approvalStatus === 'pending' && onApprove && (
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onApprove(id, true)}
                    className="bg-success hover:bg-success/90"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Schválit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onApprove(id, false)}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Zamítnout
                  </Button>
                </div>
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

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Náhled fotky před odesláním</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="space-y-4">
              <img 
                src={previewImage} 
                alt="Náhled" 
                className="w-full rounded-lg"
              />
              <p className="text-sm text-muted-foreground">
                Zkontrolujte, zda je fotka správná. Po odeslání bude čekat na schválení zaměstnavatelem.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowPreview(false);
                setPreviewImage(null);
                setPendingFile(null);
              }}
            >
              Zrušit
            </Button>
            <Button 
              onClick={handleConfirmUpload}
              disabled={uploading}
              className="gradient-primary"
            >
              {uploading ? "Nahrávání..." : "Odeslat fotku"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
