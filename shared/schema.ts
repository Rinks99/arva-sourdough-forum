import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("member"), // 'member' | 'admin'
  createdAt: integer("created_at").notNull(),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: integer("password_reset_expiry"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  role: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Categories
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  slug: text("slug").notNull().unique(),
  icon: text("icon").notNull(), // lucide icon name
  color: text("color").notNull(), // tailwind color class
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertCategorySchema = createInsertSchema(categories).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

// Available thread flairs
export const THREAD_FLAIRS = [
  "Beginner",
  "Recipe",
  "Photo Share",
  "Discard Recipe",
  "Tip",
  "Question",
  "Troubleshooting",
  "Bake Journal",
  "Workshop",
] as const;
export type ThreadFlair = typeof THREAD_FLAIRS[number];

// Threads (topics)
export const threads = sqliteTable("threads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  categoryId: integer("category_id").notNull(),
  authorId: integer("author_id").notNull(),
  flair: text("flair"), // optional flair label
  isPinned: integer("is_pinned").notNull().default(0),
  isLocked: integer("is_locked").notNull().default(0),
  viewCount: integer("view_count").notNull().default(0),
  replyCount: integer("reply_count").notNull().default(0),
  lastReplyAt: integer("last_reply_at"),
  lastReplyUserId: integer("last_reply_user_id"),
  createdAt: integer("created_at").notNull(),
});

export const insertThreadSchema = createInsertSchema(threads).omit({
  id: true,
  isPinned: true,
  isLocked: true,
  viewCount: true,
  replyCount: true,
  lastReplyAt: true,
  lastReplyUserId: true,
  createdAt: true,
});
export type InsertThread = z.infer<typeof insertThreadSchema>;
export type Thread = typeof threads.$inferSelect;

// Posts (first post is the thread body, subsequent are replies)
export const posts = sqliteTable("posts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  threadId: integer("thread_id").notNull(),
  authorId: integer("author_id").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),  // optional uploaded photo
  isFirstPost: integer("is_first_post").notNull().default(0),
  likeCount: integer("like_count").notNull().default(0),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at"),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  isFirstPost: true,
  likeCount: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

// Workshop Waitlist
export const waitlist = sqliteTable("waitlist", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at").notNull(),
});

export const insertWaitlistSchema = createInsertSchema(waitlist).omit({
  id: true,
  createdAt: true,
});
export type InsertWaitlist = z.infer<typeof insertWaitlistSchema>;
export type Waitlist = typeof waitlist.$inferSelect;

// Likes
export const likes = sqliteTable("likes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  postId: integer("post_id").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: integer("created_at").notNull(),
});

export type Like = typeof likes.$inferSelect;
