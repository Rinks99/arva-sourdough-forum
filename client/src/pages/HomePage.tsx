import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ChevronRight, CheckCircle2, Users, Wheat, ChefHat, FlaskConical, HandHeart, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/components/AuthContext";

const ICON_MAP: Record<string, any> = {
  Wheat,
  BookOpen: ChefHat,
  HelpCircle: FlaskConical,
  GraduationCap: HandHeart,
};

const COLOR_MAP: Record<string, string> = {
  amber: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  orange: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  rose: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  teal: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

interface Category {
  id: number;
  name: string;
  description: string;
  slug: string;
  icon: string;
  color: string;
  threadCount: number;
  latestThreadTitle?: string;
}

interface WaitlistEntry {
  id: number;
  name: string;
  email: string;
  createdAt: number;
}

function WaitlistPanel() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);

  const { data: waitlistData } = useQuery<WaitlistEntry[]>({
    queryKey: ["/api/waitlist"],
    enabled: showAdmin && user?.role === "admin",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/waitlist", { name: name.trim(), email: email.trim() });
    },
    onSuccess: () => {
      setSubmitted(true);
      setErrorMsg("");
    },
    onError: (err: any) => {
      // apiRequest throws Error(`${status}: ${body text}`)
      try {
        const raw = err.message || "";
        const jsonPart = raw.includes(":") ? raw.slice(raw.indexOf(":") + 1).trim() : raw;
        const parsed = JSON.parse(jsonPart);
        setErrorMsg(parsed?.error || "Something went wrong. Please try again.");
      } catch {
        setErrorMsg(err.message || "Something went wrong. Please try again.");
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!name.trim() || !email.trim()) {
      setErrorMsg("Please enter your name and email.");
      return;
    }
    mutation.mutate();
  };

  return (
    <section className="bg-primary/5 border border-primary/20 rounded-lg p-5">
      <div className="flex items-start gap-3">
        <GraduationCap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-semibold text-sm">Workshops at the Mill</h3>
            {user?.role === "admin" && (
              <button
                onClick={() => setShowAdmin(v => !v)}
                className="text-xs text-primary hover:underline flex items-center gap-1"
                data-testid="button-toggle-waitlist-admin"
              >
                <Users className="w-3 h-3" />
                {showAdmin ? "Hide list" : `View waitlist${waitlistData ? ` (${waitlistData.length})` : ""}`}
              </button>
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-3">
            Hands-on sourdough baking workshops held right at Arva Flour Mills in Arva, Ontario.
            Our upcoming classes are currently <strong className="text-foreground">sold out</strong> — add your name below and we'll reach out when new dates open up.
          </p>

          {submitted ? (
            <div className="flex items-center gap-2 text-xs text-primary font-medium" data-testid="text-waitlist-success">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              You're on the list! We'll be in touch when new workshop dates are announced.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2" data-testid="form-waitlist">
              <Input
                placeholder="Your name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="h-8 text-xs flex-1"
                data-testid="input-waitlist-name"
              />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="h-8 text-xs flex-1"
                data-testid="input-waitlist-email"
              />
              <Button
                type="submit"
                size="sm"
                className="h-8 text-xs shrink-0 whitespace-nowrap"
                disabled={mutation.isPending}
                data-testid="button-waitlist-submit"
              >
                {mutation.isPending ? "Saving…" : "Join waitlist"}
              </Button>
            </form>
          )}

          {errorMsg && (
            <p className="text-xs text-destructive mt-2" data-testid="text-waitlist-error">{errorMsg}</p>
          )}

          {/* Admin list view */}
          {showAdmin && user?.role === "admin" && (
            <div className="mt-4 border-t border-primary/20 pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Workshop Waitlist — {waitlistData?.length ?? "…"} {waitlistData?.length === 1 ? "person" : "people"}
              </p>
              {!waitlistData ? (
                <p className="text-xs text-muted-foreground">Loading…</p>
              ) : waitlistData.length === 0 ? (
                <p className="text-xs text-muted-foreground">No signups yet.</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {waitlistData.map((entry, i) => (
                    <div key={entry.id} className="flex items-center justify-between text-xs gap-3" data-testid={`row-waitlist-${entry.id}`}>
                      <span className="text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                      <span className="font-medium flex-1 truncate">{entry.name}</span>
                      <span className="text-muted-foreground truncate">{entry.email}</span>
                      <span className="text-muted-foreground shrink-0">
                        {new Date(entry.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data: categories, isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="py-7 border-b border-border">
        <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: "'Noto Serif', Georgia, serif" }}>
          Arva Sourdough Community
        </h1>

        <p className="text-muted-foreground text-sm max-w-2xl leading-relaxed mb-5">
          Rooted at Arva Flour Mills — Farm to Table since 1819 — this community gathers bakers who honour real ingredients, patient fermentation, and the slow, living craft of sourdough. Here, we trade stories shaped by flour and time, share the loaves that rose tall and the ones that taught us something, and keep alive the traditions that have passed through our mill for generations.
        </p>

      </div>

      {/* Categories */}
      <section>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Discussions</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-lg" />)}
          </div>
        ) : (
          <div className="space-y-2">
            {categories?.map(cat => {
              const Icon = ICON_MAP[cat.icon] || Wheat;
              const colorClass = COLOR_MAP[cat.color] || COLOR_MAP.amber;
              return (
                <Link key={cat.id} href={`/category/${cat.slug}`}>
                  <Card className="hover:shadow-sm transition-shadow cursor-pointer group" data-testid={`card-category-${cat.id}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${colorClass}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-sm">{cat.name}</h3>
                          <Badge variant="secondary" className="text-xs h-5">
                            {cat.threadCount} {cat.threadCount === 1 ? "post" : "posts"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
                        {cat.latestThreadTitle && (
                          <p className="text-xs text-muted-foreground mt-1 truncate">
                            <span className="text-primary/70">Latest:</span> {cat.latestThreadTitle}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Workshop Waitlist CTA */}
      <WaitlistPanel />
    </div>
  );
}
