import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";

interface Thread {
  id: number;
  title: string;
  replyCount: number;
  createdAt: number;
  author: { displayName: string };
  category: { name: string; slug: string };
}

export default function SearchPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
  const q = params.get("q") || "";

  const { data: results, isLoading } = useQuery<Thread[]>({
    queryKey: ["/api/search", q],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/search?q=${encodeURIComponent(q)}`);
      return res.json();
    },
    enabled: !!q,
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Home
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-muted-foreground">Search</span>
      </div>

      <div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Noto Serif', Georgia, serif" }}>
          {q ? `Results for "${q}"` : "Search"}
        </h1>
        {results && <p className="text-xs text-muted-foreground mt-1">{results.length} {results.length === 1 ? "result" : "results"} found</p>}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
      ) : results?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No posts found for "{q}"</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results?.map(thread => (
            <Link key={thread.id} href={`/thread/${thread.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer group" data-testid={`card-result-${thread.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm group-hover:text-primary transition-colors mb-1">{thread.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs h-5 capitalize">{thread.category.name}</Badge>
                        <span>by {thread.author.displayName}</span>
                        <span>·</span>
                        <span>{formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                      <MessageSquare className="w-3.5 h-3.5" />{thread.replyCount}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
