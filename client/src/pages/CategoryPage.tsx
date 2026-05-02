import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { MessageSquare, Eye, Pin, Lock, PenSquare, ChevronLeft, MoreVertical, Trash2, PinOff, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

interface Thread {
  id: number;
  title: string;
  flair: string | null;
  isPinned: number;
  isLocked: number;
  viewCount: number;
  replyCount: number;
  createdAt: number;
  lastReplyAt: number | null;
  author: { displayName: string; username: string };
  category: { name: string; slug: string };
}

const FLAIR_COLOURS: Record<string, string> = {
  "Beginner":      "bg-green-100 text-green-800 border-green-200",
  "Recipe":        "bg-amber-100 text-amber-800 border-amber-200",
  "Photo Share":   "bg-sky-100 text-sky-800 border-sky-200",
  "Discard Recipe":"bg-orange-100 text-orange-800 border-orange-200",
  "Tip":           "bg-purple-100 text-purple-800 border-purple-200",
  "Question":      "bg-blue-100 text-blue-800 border-blue-200",
  "Troubleshooting":"bg-red-100 text-red-800 border-red-200",
  "Bake Journal":  "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Workshop":      "bg-rose-100 text-rose-800 border-rose-200",
};

function FlairBadge({ flair }: { flair: string }) {
  const cls = FLAIR_COLOURS[flair] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border font-medium shrink-0 ${cls}`}>
      <Tag className="w-2.5 h-2.5" />{flair}
    </span>
  );
}

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  const { data: threads, isLoading } = useQuery<Thread[]>({
    queryKey: ["/api/categories", slug, "threads"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/categories/${slug}/threads`);
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (threadId: number) => {
      await apiRequest("DELETE", `/api/threads/${threadId}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/categories", slug, "threads"] });
      qc.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Thread deleted" });
    },
    onError: () => toast({ title: "Error deleting thread", variant: "destructive" }),
  });

  const pinMutation = useMutation({
    mutationFn: async ({ threadId, pinned }: { threadId: number; pinned: boolean }) => {
      await apiRequest("PATCH", `/api/threads/${threadId}/pin`, { pinned });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/categories", slug, "threads"] });
      toast({ title: "Thread updated" });
    },
  });

  const lockMutation = useMutation({
    mutationFn: async ({ threadId, locked }: { threadId: number; locked: boolean }) => {
      await apiRequest("PATCH", `/api/threads/${threadId}/lock`, { locked });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/categories", slug, "threads"] });
      toast({ title: "Thread updated" });
    },
  });

  const isAdmin = user?.role === "admin";
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
            <div key={thread.id} className="relative group">
              <Link href={`/thread/${thread.id}`}>
                <Card className="hover:shadow-sm transition-shadow cursor-pointer" data-testid={`card-thread-${thread.id}`}>
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
                          {thread.flair && <FlairBadge flair={thread.flair} />}
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

              {/* Admin inline controls */}
              {isAdmin && (
                <div className="absolute top-2 right-2" onClick={e => e.preventDefault()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 hover:bg-muted"
                        data-testid={`button-admin-thread-${thread.id}`}
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => pinMutation.mutate({ threadId: thread.id, pinned: thread.isPinned !== 1 })}
                        className="gap-2 text-xs"
                      >
                        {thread.isPinned === 1 ? <><PinOff className="w-3.5 h-3.5" /> Unpin thread</> : <><Pin className="w-3.5 h-3.5" /> Pin thread</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => lockMutation.mutate({ threadId: thread.id, locked: thread.isLocked !== 1 })}
                        className="gap-2 text-xs"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        {thread.isLocked === 1 ? "Unlock thread" : "Lock thread"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm(`Delete "${thread.title}"? This cannot be undone.`)) {
                            deleteMutation.mutate(thread.id);
                          }
                        }}
                        className="gap-2 text-xs text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete thread
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
