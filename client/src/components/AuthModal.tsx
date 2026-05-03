import { useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  mode: "login" | "register";
  onClose: () => void;
  onSwitch: (mode: "login" | "register") => void;
}

export default function AuthModal({ mode, onClose, onSwitch }: Props) {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", username: "", displayName: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        toast({ title: "Welcome back!" });
      } else {
        await register({ email: form.email, password: form.password, username: form.username, displayName: form.displayName });
        toast({ title: "Welcome to the community!" });
      }
      onClose();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{mode === "login" ? "Sign in" : "Join the community"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {mode === "register" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="displayName">Display name</Label>
                <Input id="displayName" placeholder="Your name" value={form.displayName}
                  onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} required data-testid="input-display-name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="sourdoughbaker" value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))} required data-testid="input-username" />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@example.com" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required data-testid="input-email" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === "login" && (
                <Link href="/forgot-password"><span className="text-xs text-primary hover:underline cursor-pointer">Forgot password?</span></Link>
              )}
            </div>
            <Input id="password" type="password" placeholder="••••••••" value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required data-testid="input-password" />
          </div>
          <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-auth">
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>Don't have an account?{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => onSwitch("register")}>Join for free</button>
              </>
            ) : (
              <>Already a member?{" "}
                <button type="button" className="text-primary hover:underline" onClick={() => onSwitch("login")}>Sign in</button>
              </>
            )}
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
