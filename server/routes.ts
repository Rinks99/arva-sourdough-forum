import type { Express } from "express";
import type { Server } from "http";
import session from "express-session";
import MemoryStore from "memorystore";
import { storage } from "./storage";
import { execSync } from "child_process";

function sendWaitlistNotification(name: string, email: string) {
  try {
    const params = JSON.stringify({
      source_id: "gcal",
      tool_name: "send_email",
      arguments: {
        action: {
          action: "send",
          to: ["mark@arvaflourmills.com"],
          cc: [],
          bcc: [],
          subject: `New Workshop Waitlist Signup — ${name}`,
          body: `Someone just joined the Arva Sourdough Workshop waitlist:\n\nName: ${name}\nEmail: ${email}\n\nView all waitlist entries in your admin panel:\nhttps://community.arvaflourmills.com/#/admin\n\n— Arva Sourdough Community`,
        },
      },
    });
    execSync(`external-tool call '${params}'`, { timeout: 10000 });
  } catch (err) {
    // Non-fatal — don't block the signup if email fails
    console.error("Waitlist notification email failed:", err);
  }
}

const MemStore = MemoryStore(session);

export function registerRoutes(httpServer: Server, app: Express): Server {
  app.use(session({
    secret: "arva-sourdough-forum-secret-2026",
    resave: false,
    saveUninitialized: false,
    store: new MemStore({ checkPeriod: 86400000 }),
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
  }));

  // ─── Auth ─────────────────────────────────────────────
  app.post("/api/auth/register", (req, res) => {
    const { username, email, displayName, password } = req.body;
    if (!username || !email || !displayName || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters." });
    }
    if (storage.getUserByEmail(email)) {
      return res.status(400).json({ error: "Email already registered." });
    }
    if (storage.getUserByUsername(username)) {
      return res.status(400).json({ error: "Username already taken." });
    }
    const user = storage.createUser({ username, email, displayName, password });
    (req.session as any).userId = user.id;
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = storage.getUserByEmail(email);
    if (!user || !storage.verifyPassword(user, password)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    (req.session as any).userId = user.id;
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  app.get("/api/auth/me", (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Not authenticated" });
    const user = storage.getUserById(userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    const { passwordHash, ...safeUser } = user;
    res.json(safeUser);
  });

  // ─── Forgot / Reset Password ──────────────────────────
  app.post("/api/auth/forgot-password", (req, res) => {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: "Email is required." });
    const crypto = require("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 60 * 60 * 1000; // 1 hour
    const found = storage.setPasswordResetToken(email.trim().toLowerCase(), token, expiry);
    // Always return success (don't reveal if email exists)
    if (found) {
      // Send reset email
      try {
        const { execSync } = require("child_process");
        const params = JSON.stringify({
          source_id: "gcal",
          tool_name: "send_email",
          arguments: {
            to: email.trim(),
            subject: "Reset your Arva Sourdough Community password",
            body: `Hi,\n\nYou requested a password reset for your Arva Sourdough Community account.\n\nClick the link below to reset your password (valid for 1 hour):\n\nhttps://community.arvaflourmills.com/#/reset-password?token=${token}\n\nIf you didn't request this, you can safely ignore this email.\n\n— Arva Flour Mills`,
          },
        });
        execSync(`external-tool call '${params}'`, { timeout: 10000 });
      } catch (e) {
        console.error("Reset email failed:", e);
      }
    }
    res.json({ ok: true, message: "If that email is registered, a reset link has been sent." });
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: "Token and password are required." });
    if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters." });
    const crypto = require("crypto");
    const newHash = crypto.createHash("sha256").update(password + "arva-salt-2026").digest("hex");
    const ok = storage.resetPassword(token, newHash);
    if (!ok) return res.status(400).json({ error: "Reset link is invalid or has expired." });
    res.json({ ok: true });
  });

  // ─── Avatar Upload ────────────────────────────────────
  app.post("/api/auth/avatar", (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Login required" });
    const { avatarUrl } = req.body;
    if (!avatarUrl) return res.status(400).json({ error: "No image provided." });
    if (avatarUrl.length > 5 * 1024 * 1024) return res.status(400).json({ error: "Image too large." });
    storage.updateAvatar(userId, avatarUrl);
    res.json({ ok: true });
  });

  // ─── Categories ───────────────────────────────────────
  app.get("/api/categories", (_req, res) => {
    res.json(storage.getCategories());
  });

  // ─── Threads ──────────────────────────────────────────
  app.get("/api/categories/:slug/threads", (req, res) => {
    const threads = storage.getThreadsByCategory(req.params.slug);
    res.json(threads);
  });

  app.get("/api/threads/:id", (req, res) => {
    const thread = storage.getThreadById(Number(req.params.id));
    if (!thread) return res.status(404).json({ error: "Thread not found" });
    storage.incrementViewCount(thread.id);
    res.json(thread);
  });

  app.post("/api/threads", (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Login required" });
    const poster = storage.getUserById(userId);
    if (poster?.role === "banned") return res.status(403).json({ error: "Your account has been suspended." });
    const { title, categoryId, content, imageUrl, flair } = req.body;
    if (!title?.trim() || !content?.trim() || !categoryId) {
      return res.status(400).json({ error: "Title, category and content are required." });
    }
    // Validate base64 image if provided (max ~5MB base64 = ~3.75MB file)
    if (imageUrl && imageUrl.length > 7 * 1024 * 1024) {
      return res.status(400).json({ error: "Image is too large. Please use an image under 5 MB." });
    }
    const thread = storage.createThread({ title: title.trim(), categoryId: Number(categoryId), authorId: userId, content: content.trim(), imageUrl: imageUrl || undefined, flair: flair || undefined });
    res.json(thread);
  });

  // ─── Posts ─────────────────────────────────────────────
  app.get("/api/threads/:id/posts", (req, res) => {
    const userId = (req.session as any).userId;
    const posts = (storage as any).getPostsByThread(Number(req.params.id), userId);
    res.json(posts);
  });

  app.post("/api/threads/:id/posts", (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Login required" });
    const poster = storage.getUserById(userId);
    if (poster?.role === "banned") return res.status(403).json({ error: "Your account has been suspended." });
    const { content, imageUrl } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content is required." });
    const thread = storage.getThreadById(Number(req.params.id));
    if (!thread) return res.status(404).json({ error: "Thread not found" });
    if (thread.isLocked) return res.status(403).json({ error: "Thread is locked." });
    if (imageUrl && imageUrl.length > 7 * 1024 * 1024) {
      return res.status(400).json({ error: "Image is too large. Please use an image under 5 MB." });
    }
    const post = storage.createPost({ threadId: Number(req.params.id), authorId: userId, content: content.trim(), imageUrl: imageUrl || undefined });
    res.json(post);
  });

  // ─── Likes ─────────────────────────────────────────────
  app.post("/api/posts/:id/like", (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Login required" });
    const result = storage.toggleLike(Number(req.params.id), userId);
    res.json(result);
  });

  // ─── Search ─────────────────────────────────────────────
  app.get("/api/search", (req, res) => {
    const q = String(req.query.q || "").trim();
    if (!q) return res.json([]);
    res.json(storage.searchThreads(q));
  });

  // ─── Waitlist ────────────────────────────────────────────
  app.post("/api/waitlist", (req, res) => {
    const { name, email } = req.body;
    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ error: "Name and email are required." });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ error: "Please enter a valid email address." });
    }
    const result = storage.addToWaitlist({ name, email });
    if (result.duplicate) {
      return res.status(409).json({ error: "This email is already on the waitlist." });
    }
    // Fire-and-forget notification email to admin
    sendWaitlistNotification(name.trim(), email.trim());
    res.json({ ok: true });
  });

  // Admin-only: view waitlist
  app.get("/api/waitlist", (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Login required" });
    const user = storage.getUserById(userId);
    if (!user || user.role !== "admin") return res.status(403).json({ error: "Admin only" });
    res.json(storage.getWaitlist());
  });

  // ─── Admin helpers ───────────────────────────────────────
  function requireAdmin(req: any, res: any): boolean {
    const userId = (req.session as any).userId;
    if (!userId) { res.status(401).json({ error: "Login required" }); return false; }
    const user = storage.getUserById(userId);
    if (!user || user.role !== "admin") { res.status(403).json({ error: "Admin only" }); return false; }
    return true;
  }

  // Admin stats
  app.get("/api/admin/stats", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json(storage.getAdminStats());
  });

  // Admin: all users
  app.get("/api/admin/users", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const allUsers = storage.getAllUsers();
    res.json(allUsers.map(({ passwordHash, ...u }) => u));
  });

  // Admin: set user role
  app.patch("/api/admin/users/:id/role", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { role } = req.body;
    if (!role || !['member', 'admin', 'banned'].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    storage.setUserRole(Number(req.params.id), role);
    res.json({ ok: true });
  });

  // Admin: all threads
  app.get("/api/admin/threads", (req, res) => {
    if (!requireAdmin(req, res)) return;
    res.json(storage.getAllThreads());
  });

  // Admin: delete thread
  app.delete("/api/threads/:id", (req, res) => {
    if (!requireAdmin(req, res)) return;
    storage.deleteThread(Number(req.params.id));
    res.json({ ok: true });
  });

  // Admin: pin/unpin thread
  app.patch("/api/threads/:id/pin", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { pinned } = req.body;
    storage.setPinned(Number(req.params.id), !!pinned);
    res.json({ ok: true });
  });

  // Admin: lock/unlock thread
  app.patch("/api/threads/:id/lock", (req, res) => {
    if (!requireAdmin(req, res)) return;
    const { locked } = req.body;
    storage.setLocked(Number(req.params.id), !!locked);
    res.json({ ok: true });
  });

  // Admin: delete post
  app.delete("/api/posts/:id", (req, res) => {
    if (!requireAdmin(req, res)) return;
    storage.deletePost(Number(req.params.id));
    res.json({ ok: true });
  });

  return httpServer;
}
