import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { ChevronLeft, Heart, Lock, Pin, Send, Eye, ImageIcon, X, MoreVertical, Trash2, PinOff, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/AuthContext";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { useState, useRef } from "react";

interface Post {
  id: number;
  content: string;
  imageUrl?: string | null;
  isFirstPost: number;
  likeCount: number;
  likedByMe: boolean;
  createdAt: number;
  author: { id: number; displayName: string; username: string; role: string; avatarUrl?: string };
}

interface Thread {
  id: number;
  title: string;
  flair: string | null;
  isPinned: number;
  isLocked: number;
  viewCount: number;
  replyCount: number;
  createdAt: number;
  author: { displayName: string };
  category: { name: string; slug: string };
}

const FLAIR_COLOURS: Record<string, string> = {
  "Beginner":       "bg-green-100 text-green-800 border-green-200",
  "Recipe":         "bg-amber-100 text-amber-800 border-amber-200",
  "Photo Share":    "bg-sky-100 text-sky-800 border-sky-200",
  "Discard Recipe": "bg-orange-100 text-orange-800 border-orange-200",
  "Tip":            "bg-purple-100 text-purple-800 border-purple-200",
  "Question":       "bg-blue-100 text-blue-800 border-blue-200",
  "Troubleshooting":"bg-red-100 text-red-800 border-red-200",
  "Bake Journal":   "bg-indigo-100 text-indigo-800 border-indigo-200",
  "Workshop":       "bg-rose-100 text-rose-800 border-rose-200",
};

function FlairBadge({ flair }: { flair: string }) {
  const cls = FLAIR_COLOURS[flair] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border font-medium ${cls}`}>
      <Tag className="w-2.5 h-2.5" />{flair}
    </span>
  );
}

function formatContent(content: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.split("\n").map((line, i, arr) => {
    const parts = line.split(urlRegex);
    return (
      <span key={i}>
        {parts.map((part, j) =>
          urlRegex.test(part) ? (
            <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
              {part}
            </a>
          ) : part
        )}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

function ImagePicker({ onImageChange }: { onImageChange: (dataUrl: string | null) => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Please choose an image under 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { const dataUrl = reader.result as string; setPreview(dataUrl); onImageChange(dataUrl); };
    reader.readAsDataURL(file);
  };

  const clear = () => { setPreview(null); onImageChange(null); if (inputRef.current) inputRef.current.value = ""; };

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} data-testid="input-image-file" />
      {preview ? (
        <div className="relative inline-block">
          <img src={preview} alt="Preview" className="h-16 w-16 object-cover rounded-md border border-border" />
          <button type="button" onClick={clear} className="absolute -top-1.5 -right-1.5 bg-background border border-border rounded-full p-0.5 text-muted-foreground hover:text-destructive" data-testid="button-remove-image">
            <X className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary border border-dashed border-border rounded-md px-3 py-2 transition-colors" data-testid="button-attach-image">
          <ImageIcon className="w-3.5 h-3.5" /> Attach photo
        </button>
      )}
    </div>
  );
}

export default function ThreadPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();
  const [reply, setReply] = useState("");
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const isAdmin = user?.role === "admin";

  const { data: thread, isLoading: threadLoading } = useQuery<Thread>({
    queryKey: ["/api/threads", id],
    queryFn: async () => { const res = await apiRequest("GET", `/api/threads/${id}`); return res.json(); },
  });

  const { data: posts, isLoading: postsLoading } = useQuery<Post[]>({
    queryKey: ["/api/threads", id, "posts"],
    queryFn: async () => { const res = await apiRequest("GET", `/api/threads/${id}/posts`); return res.json(); },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/threads/${id}/posts`, { content: reply.trim(), ...(replyImage ? { imageUrl: replyImage } : {}) });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/threads", id, "posts"] });
      qc.invalidateQueries({ queryKey: ["/api/threads", id] });
      setReply(""); setReplyImage(null);
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const likeMutation = useMutation({
    mutationFn: async (postId: number) => {
      const res = await apiRequest("POST", `/api/posts/${postId}/like`);
      return { postId, ...(await res.json()) };
    },
    onSuccess: ({ postId, liked, likeCount }) => {
      qc.setQueryData(["/api/threads", id, "posts"], (old: Post[] | undefined) =>
        old?.map(p => p.id === postId ? { ...p, likedByMe: liked, likeCount } : p)
      );
    },
    onError: () => toast({ title: "Sign in to like posts", variant: "destructive" }),
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: number) => { await apiRequest("DELETE", `/api/posts/${postId}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/threads", id, "posts"] });
      qc.invalidateQueries({ queryKey: ["/api/threads", id] });
      toast({ title: "Post deleted" });
    },
    onError: () => toast({ title: "Error deleting post", variant: "destructive" }),
  });

  const deleteThreadMutation = useMutation({
    mutationFn: async () => { await apiRequest("DELETE", `/api/threads/${id}`); },
    onSuccess: () => {
      toast({ title: "Thread deleted" });
      navigate(`/category/${thread?.category?.slug}`);
    },
    onError: () => toast({ title: "Error deleting thread", variant: "destructive" }),
  });

  const pinMutation = useMutation({
    mutationFn: async (pinned: boolean) => { await apiRequest("PATCH", `/api/threads/${id}/pin`, { pinned }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/threads", id] }); toast({ title: "Thread updated" }); },
  });

  const lockMutation = useMutation({
    mutationFn: async (locked: boolean) => { await apiRequest("PATCH", `/api/threads/${id}/lock`, { locked }); },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/threads", id] }); toast({ title: "Thread updated" }); },
  });

  if (threadLoading) return (
    <div className="space-y-4"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-32" /></div>
  );

  return (
    <div className="space-y-5">
      {/* Breadcrumb + admin thread actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 shrink-0">
            <ChevronLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <Link href={`/category/${thread?.category?.slug}`} className="text-muted-foreground hover:text-primary transition-colors capitalize truncate">
            {thread?.category?.name}
          </Link>
        </div>

        {/* Admin thread actions */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs shrink-0" data-testid="button-admin-thread-actions">
                <MoreVertical className="w-3.5 h-3.5" /> Moderate
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem onClick={() => pinMutation.mutate(thread?.isPinned !== 1)} className="gap-2 text-xs">
                {thread?.isPinned === 1 ? <><PinOff className="w-3.5 h-3.5" /> Unpin thread</> : <><Pin className="w-3.5 h-3.5" /> Pin thread</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => lockMutation.mutate(thread?.isLocked !== 1)} className="gap-2 text-xs">
                <Lock className="w-3.5 h-3.5" />
                {thread?.isLocked === 1 ? "Unlock thread" : "Lock thread"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => { if (confirm("Delete this entire thread? This cannot be undone.")) deleteThreadMutation.mutate(); }}
                className="gap-2 text-xs text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete thread
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Thread title */}
      <div>
        <div className="flex items-center gap-2 flex-wrap mb-1">
          {thread?.isPinned === 1 && <Badge variant="secondary" className="text-xs h-5 gap-1"><Pin className="w-3 h-3" />Pinned</Badge>}
          {thread?.isLocked === 1 && <Badge variant="secondary" className="text-xs h-5 gap-1"><Lock className="w-3 h-3" />Locked</Badge>}
          {thread?.flair && <FlairBadge flair={thread.flair} />}
        </div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Noto Serif', Georgia, serif" }}>{thread?.title}</h1>
        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
          <span>{thread?.replyCount} {thread?.replyCount === 1 ? "reply" : "replies"}</span>
          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{thread?.viewCount} views</span>
        </p>
      </div>

      {/* Posts */}
      {postsLoading ? (
        <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="space-y-4">
          {posts?.map((post) => (
            <Card key={post.id} className={post.isFirstPost === 1 ? "border-primary/20" : ""} data-testid={`card-post-${post.id}`}>
              <CardContent className="p-5">
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 shrink-0">
                    {post.author.avatarUrl && <AvatarImage src={post.author.avatarUrl} alt={post.author.displayName} />}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                      {post.author.displayName.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="font-semibold text-sm">{post.author.displayName}</span>
                      {post.author.role === "admin" && (
                        <Badge className="text-xs h-5 bg-primary/10 text-primary hover:bg-primary/20 border-0">Staff</Badge>
                      )}
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                      </span>
                      {/* Admin: delete post */}
                      {isAdmin && post.isFirstPost !== 1 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" data-testid={`button-admin-post-${post.id}`}>
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              onClick={() => { if (confirm("Delete this post?")) deletePostMutation.mutate(post.id); }}
                              className="gap-2 text-xs text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete post
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                      {formatContent(post.content)}
                    </div>
                    {post.imageUrl && (
                      <div className="mt-3">
                        <img
                          src={post.imageUrl}
                          alt="Attached photo"
                          className="max-w-full max-h-96 rounded-lg border border-border object-contain cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => window.open(post.imageUrl!, "_blank")}
                          data-testid={`img-post-${post.id}`}
                        />
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => user && likeMutation.mutate(post.id)}
                        className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors ${
                          post.likedByMe
                            ? "text-red-500 bg-red-50 dark:bg-red-900/20"
                            : "text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        } ${!user ? "cursor-default" : "cursor-pointer"}`}
                        data-testid={`button-like-${post.id}`}
                      >
                        <Heart className={`w-3.5 h-3.5 ${post.likedByMe ? "fill-current" : ""}`} />
                        {post.likeCount > 0 && <span>{post.likeCount}</span>}
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Reply form */}
      {thread?.isLocked === 1 ? (
        <div className="text-center py-4 text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Lock className="w-4 h-4" /> This thread is locked.
        </div>
      ) : user ? (
        <form onSubmit={e => { e.preventDefault(); if (!reply.trim()) return; replyMutation.mutate(); }} className="space-y-3">
          <Textarea
            placeholder="Share your thoughts, experience, or advice..."
            value={reply}
            onChange={e => setReply(e.target.value)}
            rows={4}
            className="resize-none"
            data-testid="textarea-reply"
          />
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <ImagePicker onImageChange={setReplyImage} />
            <Button type="submit" disabled={!reply.trim() || replyMutation.isPending} className="gap-2" data-testid="button-post-reply">
              <Send className="w-3.5 h-3.5" />
              {replyMutation.isPending ? "Posting..." : "Post reply"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="bg-muted/50 rounded-lg p-4 text-center text-sm text-muted-foreground">
          <Link href="#" className="text-primary hover:underline font-medium">Sign in</Link> to join the conversation.
        </div>
      )}
    </div>
  );
}
