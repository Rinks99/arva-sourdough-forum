import { useState } from "react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wheat, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { email: email.trim() });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
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
            Reset your password
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Arva Sourdough Community</p>
        </div>

        <Card>
          <CardContent className="p-6">
            {sent ? (
              <div className="text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
                <p className="text-sm font-medium">Check your email</p>
                <p className="text-xs text-muted-foreground">
                  If <strong>{email}</strong> is registered, a password reset link has been sent. It expires in 1 hour.
                </p>
                <Link href="/">
                  <Button variant="outline" className="w-full mt-2 text-xs">Back to forum</Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    data-testid="input-email"
                  />
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit">
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
                <div className="text-center">
                  <Link href="/">
                    <span className="text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                      Back to sign in
                    </span>
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
