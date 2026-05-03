import { useState } from "react";
import { useLocation, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Wheat, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  // Extract token from hash query string: /#/reset-password?token=xxx
  const token = new URLSearchParams(window.location.hash.split("?")[1] || "").get("token") || "";
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => setLocation("/"), 2500);
    } catch (err: any) {
      setError(err.message || "Reset link is invalid or has expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "hsl(38 28% 96%)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 mb-3">
            <Wheat className="w-6 h-6 text-red-700" />
          </div>
          <h1 className="text-lg font-bold" style={{ fontFamily: "'Noto Serif', Georgia, serif" }}>
            Choose a new password
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Arva Sourdough Community</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {!token ? (
              <div className="text-center space-y-3">
                <p className="text-sm text-destructive">Invalid or missing reset link.</p>
                <Link href="/"><Button variant="outline" className="w-full text-xs">Back to forum</Button></Link>
              </div>
            ) : done ? (
              <div className="text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
                <p className="text-sm font-medium">Password updated!</p>
                <p className="text-xs text-muted-foreground">Redirecting you to the forum…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    data-testid="input-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm password</Label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                    data-testid="input-confirm"
                  />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
                  {loading ? "Saving…" : "Set new password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
