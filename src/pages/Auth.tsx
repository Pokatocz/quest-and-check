import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Sparkles, UserCircle } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"employer" | "employee">("employee");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        toast.success("Přihlášení úspěšné!");
        navigate("/");
      } else {
        // Sign up
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error("Registrace selhala");

        // Create profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            id: authData.user.id,
            full_name: fullName,
            role: role,
          });

        if (profileError) throw profileError;

        toast.success("Účet vytvořen! Přihlašuji...");
        navigate("/");
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(error.message || "Chyba při autentizaci");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-8 h-8 text-primary animate-glow-pulse" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Gamifikace Práce
            </h1>
          </div>
          <p className="text-muted-foreground">
            {isLogin ? "Přihlaste se do svého účtu" : "Vytvořte si nový účet"}
          </p>
        </div>

        <Card className="p-6 shadow-card">
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Celé jméno</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Jan Novák"
                  />
                </div>

                <div className="space-y-3">
                  <Label>Vyberte svou roli</Label>
                  <RadioGroup value={role} onValueChange={(v: any) => setRole(v)}>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary transition-smooth">
                      <RadioGroupItem value="employer" id="employer" />
                      <Label htmlFor="employer" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-5 h-5" />
                          <div>
                            <div className="font-semibold">Zaměstnavatel</div>
                            <div className="text-sm text-muted-foreground">
                              Vytvářejte týmy a úkoly
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 rounded-lg border border-border hover:border-primary transition-smooth">
                      <RadioGroupItem value="employee" id="employee" />
                      <Label htmlFor="employee" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2">
                          <UserCircle className="w-5 h-5" />
                          <div>
                            <div className="font-semibold">Zaměstnanec</div>
                            <div className="text-sm text-muted-foreground">
                              Připojte se k týmu a plňte úkoly
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="vas@email.cz"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-primary"
              disabled={loading}
            >
              {loading ? "Načítání..." : isLogin ? "Přihlásit se" : "Registrovat"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-primary hover:underline"
            >
              {isLogin
                ? "Nemáte účet? Zaregistrujte se"
                : "Již máte účet? Přihlaste se"}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
