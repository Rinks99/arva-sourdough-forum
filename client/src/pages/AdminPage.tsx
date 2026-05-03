import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/components/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  ChevronLeft, Users, MessageSquare, FileText, ClipboardList,
  Pin, Lock, Trash2, PinOff, Shield, Ban, UserCheck, MoreVertical,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Stats { totalUsers: number; totalThreads: number; totalPosts: number; waitlistCount: number; }
interface AdminUser { id: number; username: string; email: string; displayName: string; role: string; createdAt: number; }
interface AdminThread {
  id: number; title: string; isPinned: number; isLocked: number;
  replyCount: number; viewCount: number; createdAt: number;
  author: { displayName: string }; category: { name: string; slug: string };
}
interface WaitlistEntry { id: number; name: string; email: string; createdAt: number; }

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") return <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border-0">Admin</Badge>;
  if (role === "banned") return <Badge variant="destructive" className="text-xs">Banned</Badge>;
  return <Badge variant="secondary" className="text-xs">Member</Badge>;
}

export default function AdminPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, navigate] = useLocation();

  // Redirect non-admins
  if (user && user.role !== "admin") { navigate("/"); return null; }
  if (!user) return (
    <div className="text-center py-20 text-muted-foreground">
      <Shield className="w-10 h-10 mx-auto mb-3 opacity-30" />
      <p className="text-sm">Admin access required. <Link href="/" className="text-primary hover:underline">Go home</Link></p>
    </div>
  );

  const { data: stats } = useQuery<Stats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => { const res = await apiRequest("GET", "/api/admin/stats"); return res.json(); },
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => { const res = await apiRequest("GET", "/api/admin/users"); return res.json(); },
  });

  const { data: threads, isLoading: threadsLoading } = useQuery<AdminThread[]>({
    queryKey: ["/api/admin/threads"],
    queryFn: async () => { const res = await apiRequest("GET", "/api/admin/threads"); return res.json(); },
  });

  const { data: waitlist, isLoading: waitlistLoading } = useQuery<WaitlistEntry[]>({
    queryKey: ["/api/waitlist"],
    queryFn: async () => { const res = await apiRequest("GET", "/api/waitlist"); return res.json(); },
  });

  const setRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/users"] }); toast({ title: "User updated" }); },
    onError: () => toast({ title: "Error updating user", variant: "destructive" }),
  });

  const deleteThreadMutation = useMutation({
    mutationFn: async (threadId: number) => { await apiRequest("DELETE", `/api/threads/${threadId}`); },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/admin/threads"] });
      qc.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      qc.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({ title: "Thread deleted" });
    },
    onError: () => toast({ title: "Error deleting thread", variant: "destructive" }),
  });

  const pinMutation = useMutation({
    mutationFn: async ({ threadId, pinned }: { threadId: number; pinned: boolean }) => {
      await apiRequest("PATCH", `/api/threads/${threadId}/pin`, { pinned });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/threads"] }); toast({ title: "Thread updated" }); },
  });

  const lockMutation = useMutation({
    mutationFn: async ({ threadId, locked }: { threadId: number; locked: boolean }) => {
      await apiRequest("PATCH", `/api/threads/${threadId}/lock`, { locked });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/threads"] }); toast({ title: "Thread updated" }); },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Home
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium">Admin</span>
        </div>
        <Badge className="bg-primary/10 text-primary border-0 gap-1 text-xs">
          <Shield className="w-3 h-3" /> Admin Panel
        </Badge>
      </div>

      <div>
        <h1 className="text-xl font-bold" style={{ fontFamily: "'Noto Serif', Georgia, serif" }}>Forum Administration</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage users, threads, and community content</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Members" value={stats?.totalUsers ?? 0} color="bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" />
        <StatCard icon={MessageSquare} label="Threads" value={stats?.totalThreads ?? 0} color="bg-primary/10 text-primary" />
        <StatCard icon={FileText} label="Comments" value={stats?.totalPosts ?? 0} color="bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" />
        <StatCard icon={ClipboardList} label="Waitlist" value={stats?.waitlistCount ?? 0} color="bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="users" className="text-xs">Members</TabsTrigger>
          <TabsTrigger value="threads" className="text-xs">Threads</TabsTrigger>
          <TabsTrigger value="waitlist" className="text-xs">Waitlist</TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-2 mt-4">
          {usersLoading ? (
            [1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)
          ) : users?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No users yet.</p>
          ) : (
            users?.map(u => (
              <Card key={u.id} data-testid={`card-user-${u.id}`}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {u.displayName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{u.displayName}</span>
                      <RoleBadge role={u.role} />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email} · @{u.username}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {formatDistanceToNow(new Date(u.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  {/* Don't allow actions on own account */}
                  {u.id !== user.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" data-testid={`button-admin-user-${u.id}`}>
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        {u.role !== "admin" && (
                          <DropdownMenuItem
                            onClick={() => setRoleMutation.mutate({ userId: u.id, role: "admin" })}
                            className="gap-2 text-xs"
                          >
                            <Shield className="w-3.5 h-3.5" /> Make admin
                          </DropdownMenuItem>
                        )}
                        {u.role === "admin" && (
                          <DropdownMenuItem
                            onClick={() => setRoleMutation.mutate({ userId: u.id, role: "member" })}
                            className="gap-2 text-xs"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Remove admin
                          </DropdownMenuItem>
                        )}
                        {u.role !== "banned" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm(`Ban ${u.displayName}? They will no longer be able to post.`))
                                  setRoleMutation.mutate({ userId: u.id, role: "banned" });
                              }}
                              className="gap-2 text-xs text-destructive focus:text-destructive"
                            >
                              <Ban className="w-3.5 h-3.5" /> Ban user
                            </DropdownMenuItem>
                          </>
                        )}
                        {u.role === "banned" && (
                          <DropdownMenuItem
                            onClick={() => setRoleMutation.mutate({ userId: u.id, role: "member" })}
                            className="gap-2 text-xs"
                          >
                            <UserCheck className="w-3.5 h-3.5" /> Unban user
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Threads Tab */}
        <TabsContent value="threads" className="space-y-2 mt-4">
          {threadsLoading ? (
            [1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)
          ) : threads?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No threads yet.</p>
          ) : (
            threads?.map(t => (
              <Card key={t.id} data-testid={`card-admin-thread-${t.id}`}>
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      {t.isPinned === 1 && <Badge variant="secondary" className="text-xs h-4 gap-1 py-0"><Pin className="w-2.5 h-2.5" />Pinned</Badge>}
                      {t.isLocked === 1 && <Badge variant="secondary" className="text-xs h-4 gap-1 py-0"><Lock className="w-2.5 h-2.5" />Locked</Badge>}
                      <Link href={`/thread/${t.id}`} className="font-medium text-sm hover:text-primary transition-colors line-clamp-1">
                        {t.title}
                      </Link>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">{t.category.name}</span>
                      {" · "}by {t.author.displayName}
                      {" · "}{t.replyCount} replies
                      {" · "}{formatDistanceToNow(new Date(t.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" data-testid={`button-admin-manage-thread-${t.id}`}>
                        <MoreVertical className="w-3.5 h-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => pinMutation.mutate({ threadId: t.id, pinned: t.isPinned !== 1 })}
                        className="gap-2 text-xs"
                      >
                        {t.isPinned === 1 ? <><PinOff className="w-3.5 h-3.5" /> Unpin</> : <><Pin className="w-3.5 h-3.5" /> Pin</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => lockMutation.mutate({ threadId: t.id, locked: t.isLocked !== 1 })}
                        className="gap-2 text-xs"
                      >
                        <Lock className="w-3.5 h-3.5" /> {t.isLocked === 1 ? "Unlock" : "Lock"}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => { if (confirm(`Delete "${t.title}"?`)) deleteThreadMutation.mutate(t.id); }}
                        className="gap-2 text-xs text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Waitlist Tab */}
        <TabsContent value="waitlist" className="mt-4">
          {waitlistLoading ? (
            [1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-lg mb-2" />)
          ) : !waitlist || waitlist.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No waitlist entries yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground mb-3">{waitlist.length} {waitlist.length === 1 ? "person" : "people"} on the workshop waitlist</p>
              {waitlist.map(entry => (
                <Card key={entry.id} data-testid={`card-waitlist-${entry.id}`}>
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 flex items-center justify-center text-xs font-semibold shrink-0">
                      {entry.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{entry.name}</p>
                      <p className="text-xs text-muted-foreground">{entry.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Signed up {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
