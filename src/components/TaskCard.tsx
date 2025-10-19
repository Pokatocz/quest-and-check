import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Star, Upload, Image as ImageIcon, Trash2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showGallery, setShowGallery] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Parse photo URLs - handle both JSON array and single URL string
  const photoUrls: string[] = photoUrl ? (() => {
    try {
      const parsed = JSON.parse(photoUrl);
      return Array.isArray(parsed) ? parsed : [photoUrl];
    } catch {
      return [photoUrl];
    }
  })() : [];

  console.log("Photo URL from DB:", photoUrl);
  console.log("Parsed photo URLs:", photoUrls);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newFiles = [...pendingFiles, ...files];
    setPendingFiles(newFiles);

    // Create previews for all files
    const newPreviews: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === files.length) {
          setPreviewImages([...previewImages, ...newPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setPendingFiles(pendingFiles.filter((_, i) => i !== index));
    setPreviewImages(previewImages.filter((_, i) => i !== index));
  };

  const handleSubmitForApproval = async () => {
    if (pendingFiles.length < 3) {
      toast.error("Nahrajte minimálně 3 fotky");
      return;
    }

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      // Upload all photos
      for (const file of pendingFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${id}-${Date.now()}-${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("task-photos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("task-photos")
          .getPublicUrl(filePath);

        uploadedUrls.push(publicUrl);
      }

      // Save all URLs as JSON array
      const photosJson = JSON.stringify(uploadedUrls);
      console.log("Saving photos as JSON:", photosJson);
      console.log("Uploaded URLs:", uploadedUrls);
      onComplete(photosJson);
      toast.success("Fotky nahrány! Úkol čeká na schválení zaměstnavatelem.");
      setShowUploadDialog(false);
      setPreviewImages([]);
      setPendingFiles([]);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error("Chyba při nahrávání fotek");
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
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowUploadDialog(true)}
                  className="cursor-pointer"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  Dokončit úkol
                </Button>
              )}

              {photoUrls.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCurrentPhotoIndex(0);
                    setShowGallery(true);
                  }}
                >
                  <ImageIcon className="w-3 h-3 mr-1" />
                  Zobrazit fotky ({photoUrls.length})
                </Button>
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

      <Dialog open={showGallery} onOpenChange={setShowGallery}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Fotky z dokončení úkolu</DialogTitle>
          </DialogHeader>
          {photoUrls.length > 0 && (
            <div className="space-y-4">
              <div className="relative">
                <img 
                  src={photoUrls[currentPhotoIndex]} 
                  alt={`Fotka ${currentPhotoIndex + 1}`} 
                  className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
                />
                {photoUrls.length > 1 && (
                  <>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={() => setCurrentPhotoIndex((prev) => (prev - 1 + photoUrls.length) % photoUrls.length)}
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2"
                      onClick={() => setCurrentPhotoIndex((prev) => (prev + 1) % photoUrls.length)}
                    >
                      <ChevronRight className="w-6 h-6" />
                    </Button>
                  </>
                )}
              </div>
              <div className="text-center text-sm text-muted-foreground">
                Fotka {currentPhotoIndex + 1} z {photoUrls.length}
              </div>
              {photoUrls.length > 1 && (
                <div className="flex gap-2 justify-center overflow-x-auto pb-2">
                  {photoUrls.map((url: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setCurrentPhotoIndex(index)}
                      className={cn(
                        "flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all",
                        currentPhotoIndex === index ? "border-primary scale-110" : "border-border opacity-60 hover:opacity-100"
                      )}
                    >
                      <img 
                        src={url} 
                        alt={`Miniatura ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dokončení úkolu - Nahrajte fotky</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
                id={`file-upload-${id}`}
              />
              <label htmlFor={`file-upload-${id}`} className="cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">
                  Klikněte pro nahrání fotek
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimálně 3 fotky jsou vyžadovány
                </p>
              </label>
            </div>

            {previewImages.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">
                  Nahrané fotky ({previewImages.length}/min. 3)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {previewImages.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={preview} 
                        alt={`Náhled ${index + 1}`} 
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemovePhoto(index)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingFiles.length < 3 && (
              <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg">
                ⚠️ Nahrajte ještě {3 - pendingFiles.length} {pendingFiles.length === 2 ? 'fotku' : 'fotky'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowUploadDialog(false);
                setPreviewImages([]);
                setPendingFiles([]);
              }}
              disabled={uploading}
            >
              Zrušit
            </Button>
            <Button 
              onClick={handleSubmitForApproval}
              disabled={uploading || pendingFiles.length < 3}
              className="gradient-primary"
            >
              {uploading ? "Odesílání..." : "Odeslat ke schválení"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
