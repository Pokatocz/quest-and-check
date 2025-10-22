import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Send, Image as ImageIcon, X } from "lucide-react";
import { format } from "date-fns";
import { cs } from "date-fns/locale";

interface Message {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  photo_url: string | null;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

interface TeamChatProps {
  teamId: string;
  currentUserId: string;
}

const generateSignedUrl = async (photoUrl: string | null): Promise<string | null> => {
  if (!photoUrl) return null;
  
  try {
    // photoUrl is already the file path (e.g., "userId/timestamp.jpg")
    const { data, error } = await supabase.storage
      .from('chat-photos')
      .createSignedUrl(photoUrl, 3600);
    
    if (error) {
      console.error('Error generating signed URL:', error);
      return photoUrl;
    }
    
    return data.signedUrl;
  } catch (error) {
    console.error('Error in generateSignedUrl:', error);
    return photoUrl;
  }
};

export const TeamChat = ({ teamId, currentUserId }: TeamChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (teamId) {
      fetchMessages();
      scrollToBottom();

      // Realtime subscription for messages
      const channel = supabase
        .channel(`messages-${teamId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages',
            filter: `team_id=eq.${teamId}`
          },
          () => {
            fetchMessages();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  useEffect(() => {
    const channel = supabase
      .channel(`team-chat-${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `team_id=eq.${teamId}`
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', newMsg.user_id)
            .single();
          
          newMsg.profiles = profile || { full_name: 'Neznámý' };
          setMessages(prev => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  useEffect(() => {
    scrollToBottom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    const loadSignedUrls = async () => {
      const urls: Record<string, string> = {};
      for (const msg of messages) {
        if (msg.photo_url && !signedUrls[msg.photo_url]) {
          const signedUrl = await generateSignedUrl(msg.photo_url);
          if (signedUrl) {
            urls[msg.photo_url] = signedUrl;
          }
        }
      }
      if (Object.keys(urls).length > 0) {
        setSignedUrls(prev => ({ ...prev, ...urls }));
      }
    };
    
    if (messages.length > 0) {
      loadSignedUrls();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        title: "Chyba při načítání zpráv",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (!data) {
      setMessages([]);
      return;
    }

    // Fetch profiles for all unique user IDs
    const userIds = [...new Set(data.map(m => m.user_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    const messagesWithProfiles = data.map(msg => ({
      ...msg,
      profiles: profileMap.get(msg.user_id) || { full_name: 'Neznámý' }
    }));

    setMessages(messagesWithProfiles);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || isLoading) return;

    setIsLoading(true);
    try {
      let photoUrl = null;

      if (selectedImage) {
        const fileExt = selectedImage.name.split('.').pop();
        const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-photos')
          .upload(fileName, selectedImage);

        if (uploadError) throw uploadError;
        photoUrl = fileName;
      }

      const { error } = await supabase
        .from('messages')
        .insert({
          team_id: teamId,
          user_id: currentUserId,
          content: newMessage.trim() || "Fotka",
          photo_url: photoUrl,
        });

      if (error) throw error;

      setNewMessage("");
      handleRemoveImage();
    } catch (error: any) {
      toast({
        title: "Chyba při odesílání zprávy",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="flex flex-col h-[600px] bg-card">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => {
          const isOwn = message.user_id === currentUserId;
          return (
            <div
              key={message.id}
              className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {message.profiles?.full_name.substring(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              
              <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-medium text-muted-foreground">
                    {message.profiles?.full_name || "Neznámý"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.created_at), "HH:mm", { locale: cs })}
                  </span>
                </div>
                
                <div className={`rounded-lg p-3 ${
                  isOwn 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted'
                }`}>
                  {message.content && (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                  )}
                  {message.photo_url && signedUrls[message.photo_url] && (
                    <img
                      src={signedUrls[message.photo_url]}
                      alt="Příloha"
                      className="mt-2 rounded max-w-full h-auto max-h-64 object-contain"
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {imagePreview && (
        <div className="px-4 pb-2">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Náhled"
              className="h-20 rounded border"
            />
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemoveImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      <div className="border-t p-4">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            size="icon"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Napište zprávu..."
            disabled={isLoading}
            className="flex-1"
          />
          
          <Button
            onClick={handleSendMessage}
            disabled={(!newMessage.trim() && !selectedImage) || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};