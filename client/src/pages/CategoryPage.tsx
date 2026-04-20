import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, Eye, Pin, Lock, PenSquare, ChevronLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface Thread {
  id: number;
  title: string;
  isPinned: number;
  isLocked: number;
  viewCount: number;
  replyCount: number;
  createdAt: number;
  lastReplyAt: number | null;
  author: { displayName: string; username: string };
  category: { name: string; slug: string };
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data: threads, isLoading } = useQuery<Thread[]>({
    queryKey: ["/api/categories", slug, "threads"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/categories/${slug}/threads`);
      return res.json();
    },
  });

  const categoryName = threads?.[0]?.category?.name || slug?.replace(/-/g, " ");

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium capitalize">{categoryName}</span>
        </div>
        {user && (
          <Button size="sm" asChild className="h-8 text-xs gap-1.5">
            <Link href={`/new-thread?category=${slug}`}>
              <PenSquare className="w-3.5 h-3.5" /> New Post
            </Link>
          </Button>
        )}
      </div>

      {/* Threads */}
      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
        </div>
      ) : threads?.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No posts yet. Be the first to start a discussion!</p>
          {user && (
            <Button size="sm" asChild className="mt-4">
              <Link href={`/new-thread?category=${slug}`}>Start a discussion</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {threads?.map(thread => (
            <Link key={thread.id} href={`/thread/${thread.id}`}>
              <Card className="hover:shadow-sm transition-shadow cursor-pointer group" data-testid={`card-thread-${thread.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {thread.isPinned === 1 && (
                          <Badge variant="secondary" className="text-xs h-5 gap-1"><Pin className="w-3 h-3" />Pinned</Badge>
                        )}
                        {thread.isLocked === 1 && (
                          <Badge variant="secondary" className="text-xs h-5 gap-1"><Lock className="w-3 h-3" />Locked</Badge>
                        )}
                        <h3 className="font-medium text-sm group-hover:text-primary transition-colors">{thread.title}</h3>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        by <span className="text-foreground/70">{thread.author.displayName}</span>
                        {" · "}
                        {formatDistanceToNow(new Date(thread.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{thread.replyCount}</span>
                      <span className="flex items-center gap-1 hidden sm:flex"><Eye className="w-3.5 h-3.5" />{thread.viewCount}</span>
                    </div>
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
