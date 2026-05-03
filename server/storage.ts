import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and } from "drizzle-orm";
import {
  users, categories, threads, posts, likes, waitlist,
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Thread, type InsertThread,
  type Post, type InsertPost,
  type Like, type Waitlist,
} from "@shared/schema";
import crypto from "crypto";

const sqlite = new Database("forum.db");
const db = drizzle(sqlite);

// Initialize tables
sqlite.exec(`
  PRAGMA journal_mode=WAL;
`);  
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    bio TEXT,
    role TEXT NOT NULL DEFAULT 'member',
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS threads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    flair TEXT,
    is_pinned INTEGER NOT NULL DEFAULT 0,
    is_locked INTEGER NOT NULL DEFAULT 0,
    view_count INTEGER NOT NULL DEFAULT 0,
    reply_count INTEGER NOT NULL DEFAULT 0,
    last_reply_at INTEGER,
    last_reply_user_id INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id INTEGER NOT NULL,
    author_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    is_first_post INTEGER NOT NULL DEFAULT 0,
    like_count INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
  );
`);

// Migrate: add image_url column if it doesn't exist
try { sqlite.exec(`ALTER TABLE posts ADD COLUMN image_url TEXT`); } catch (_) {}
// Migrate: add flair column to threads if it doesn't exist
try { sqlite.exec(`ALTER TABLE threads ADD COLUMN flair TEXT`); } catch (_) {}
// Migrate: add avatar_url and password reset columns to users
try { sqlite.exec(`ALTER TABLE users ADD COLUMN avatar_url TEXT`); } catch (_) {}
try { sqlite.exec(`ALTER TABLE users ADD COLUMN password_reset_token TEXT`); } catch (_) {}
try { sqlite.exec(`ALTER TABLE users ADD COLUMN password_reset_expiry INTEGER`); } catch (_) {}
// Migrate: reactions + best answer + solved
try { sqlite.exec(`ALTER TABLE posts ADD COLUMN reactions TEXT DEFAULT '{}'`); } catch (_) {}
try { sqlite.exec(`ALTER TABLE posts ADD COLUMN is_best_answer INTEGER DEFAULT 0`); } catch (_) {}
try { sqlite.exec(`ALTER TABLE threads ADD COLUMN is_solved INTEGER DEFAULT 0`); } catch (_) {}
try { sqlite.exec(`CREATE TABLE IF NOT EXISTS post_reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  reaction TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(post_id, user_id, reaction)
)`); } catch (_) {}

// Seed categories and admin if not already present
const existingCategories = db.select().from(categories).all();
if (existingCategories.length === 0) {
  db.insert(categories).values([
    { name: "New Bakers", description: "Just starting out? Welcome! Find guides, tips, and encouragement for your first sourdough journey.", slug: "new-bakers", icon: "Sprout", color: "bg-green-50 text-green-700", sortOrder: 0 },
    { name: "Flour & Ingredients", description: "Discuss different flour types, grains, hydration levels and how they affect your bake.", slug: "flour-ingredients", icon: "Wheat", color: "amber", sortOrder: 1 },
    { name: "Sourdough Recipes", description: "Share your favourite recipes — loaves, flatbreads, discard creations and everything in between.", slug: "sourdough-recipes", icon: "ChefHat", color: "orange", sortOrder: 2 },
    { name: "Troubleshooting", description: "Starter not bubbling? Dense crumb? Bring your challenges here and get help from the community.", slug: "troubleshooting", icon: "FlaskConical", color: "rose", sortOrder: 3 },
    { name: "Workshop Alumni", description: "A dedicated space for participants of our in-person sourdough workshops at Arva Flour Mills.", slug: "workshop-alumni", icon: "HandHeart", color: "teal", sortOrder: 4 },
    { name: "Discard Recipes", description: "Don't throw it away — bake with it. Pancakes, crackers, waffles, pizza dough and more.", slug: "discard-recipes", icon: "Recycle", color: "bg-amber-50 text-amber-700", sortOrder: 5 },
    { name: "Bake Journals", description: "Keep a running log of your bakes. One thread per baker — document your progress, wins, and lessons.", slug: "bake-journals", icon: "BookOpen", color: "bg-blue-50 text-blue-700", sortOrder: 6 },
  ]).run();
}

// Migration: add any new categories that may be missing from older DBs
const categorySlugsInDb = db.select().from(categories).all().map((c: any) => c.slug);
const newCategoriesToAdd = [
  { name: "New Bakers", description: "Just starting out? Welcome! Find guides, tips, and encouragement for your first sourdough journey.", slug: "new-bakers", icon: "Sprout", color: "bg-green-50 text-green-700", sortOrder: 0 },
  { name: "Discard Recipes", description: "Don't throw it away — bake with it. Pancakes, crackers, waffles, pizza dough and more.", slug: "discard-recipes", icon: "Recycle", color: "bg-amber-50 text-amber-700", sortOrder: 5 },
  { name: "Bake Journals", description: "Keep a running log of your bakes. One thread per baker — document your progress, wins, and lessons.", slug: "bake-journals", icon: "BookOpen", color: "bg-blue-50 text-blue-700", sortOrder: 6 },
].filter((c: any) => !categorySlugsInDb.includes(c.slug));
if (newCategoriesToAdd.length > 0) {
  db.insert(categories).values(newCategoriesToAdd).run();
}

// Hash password
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "arva-salt-2026").digest("hex");
}

// Create admin user if not present
const existingAdmin = db.select().from(users).where(eq(users.username, "admin")).get();
// Always ensure admin password and email are correct
if (existingAdmin) {
  sqlite.prepare("UPDATE users SET password_hash = ?, email = ? WHERE username = 'admin'")
    .run(hashPassword("arva2026!"), "mark@arvaflourmills.com");
}
if (!existingAdmin) {
  db.insert(users).values({
    username: "admin",
    email: "mark@arvaflourmills.com",
    passwordHash: hashPassword("arva2026!"),
    displayName: "Arva Flour Mills",
    bio: "The official Arva Flour Mills account. Welcome to our sourdough community!",
    role: "admin",
    createdAt: Date.now(),
  }).run();

  // Create a welcome thread
  const adminUser = db.select().from(users).where(eq(users.username, "admin")).get()!;
  const workshopCat = db.select().from(categories).where(eq(categories.slug, "workshop-alumni")).get()!;
  
  const thread = db.insert(threads).values({
    title: "Welcome to the Arva Sourdough Community!",
    categoryId: workshopCat.id,
    authorId: adminUser.id,
    isPinned: 1,
    isLocked: 0,
    viewCount: 0,
    replyCount: 0,
    createdAt: Date.now(),
  }).returning().get();

  db.insert(posts).values({
    threadId: thread.id,
    authorId: adminUser.id,
    content: `Welcome to the Arva Flour Mills Sourdough Community!\n\nWe're so glad you're here. This forum is a place for sourdough enthusiasts — whether you attended one of our workshops or simply love baking with our flours — to connect, share, and learn together.\n\nHere's what you'll find:\n\n- Flour & Ingredients — Dive into the science and craft of flour selection, hydration, and fermentation.\n- Sourdough Recipes — Share your favourite loaves, discard recipes, and creative ideas.\n- Troubleshooting — No question is too basic. We're all here to help each other improve.\n- Workshop Alumni — If you've joined us at the Mill, this is your home base to stay connected.\n\nFeel free to introduce yourself in this thread. Tell us about your starter, your favourite loaf, and what brings you here.\n\nHappy baking,\nThe Arva Flour Mills Team`,
    isFirstPost: 1,
    likeCount: 0,
    createdAt: Date.now(),
  }).run();

  // ─── Seed recipes (only if none exist yet) ───────────────
  const existingRecipes = db.select().from(threads).where(eq(threads.authorId, adminUser.id)).all();
  if (existingRecipes.length > 1) {
    // Recipes already seeded (more than just the welcome thread) — skip
  } else {
  const recipeCat = db.select().from(categories).where(eq(categories.slug, "sourdough-recipes")).get()!;
  const flourCat = db.select().from(categories).where(eq(categories.slug, "flour-ingredients")).get()!;
  const t = (offset = 0) => Date.now() - offset * 60000; // stagger timestamps

  const recipes: { title: string; catId: number; content: string; pinned?: number }[] = [
    {
      title: "Classic Sourdough Bread — Beginner's Recipe",
      catId: recipeCat.id,
      pinned: 1,
      content: `A detailed beginner's recipe using Arva Flour Mills Daisy Unbleached Hard Flour. Arva Flour Mills have been milling flour since 1819 — our cold roller mills preserve the natural balance of bran, germ, and endosperm.\n\nFull recipe: https://arvaflourmills.com/blogs/news/classic-sourdough-bread-a-beginners-recipe-from-arva-flour-mills\n\nINGREDIENTS (makes 1 loaf)\n\nSourdough Starter (build over 5–7 days):\n- 50g Arva Daisy Unbleached Hard Flour (per feeding)\n- 50g filtered water, room temperature (per feeding)\n- Or: Arva Dehydrated Sourdough Starter\n\nDough:\n- 450g Arva Daisy Unbleached Hard Flour\n- 50g Arva Daisy Whole Wheat Flour (optional — adds flavour depth)\n- 375g filtered water, room temperature\n- 100g active sourdough starter (bubbly, recently fed)\n- 10g fine sea salt or non-iodized kosher salt\n\nINSTRUCTIONS\n\nStep 1 — Build Your Starter (Days 1–7)\nDay 1: Mix 50g Arva Daisy flour + 50g filtered water in a clean glass jar. Stir until smooth, cover loosely.\nDays 2–3: Once daily, discard half and feed with 50g fresh flour + 50g water. Small bubbles should appear.\nDays 4–5: Switch to two feedings per day. Starter should show a visible rise and fall cycle.\nFloat Test (Day 6–7): Drop a spoonful into water — if it floats, your starter is ready.\n\nStep 2 — Autolyse (30–60 min)\nCombine flours with 350g water. Mix until no dry flour remains. Cover and rest 30–60 minutes.\n\nStep 3 — Add Starter and Salt\nDissolve 10g salt in remaining 25g water. Add 100g active starter and salt solution to the dough. Pinch and fold for 3–5 minutes until fully incorporated.\n\nStep 4 — Bulk Fermentation with Stretch & Fold (4–8 hours)\nCover bowl and leave at room temperature. During the first 2 hours, perform 4 sets of stretch and folds spaced 30 minutes apart. Fermentation is complete when dough has grown 50–75%.\n\nStep 5 — Pre-Shape and Bench Rest (20–30 min)\nTip dough onto an unfloured surface. Drag dough in a circular motion to build surface tension. Leave uncovered for 20–30 minutes.\n\nStep 6 — Final Shape\nFold left, right, top, and bottom edges into the centre. Flip seam-side down and tighten with a bench scraper. Place seam-side up in a floured banneton.\n\nStep 7 — Cold Proof (8–16 hours)\nCover the banneton and refrigerate overnight.\n\nStep 8 — Preheat and Score\nPlace Dutch oven (with lid) in oven. Preheat to 500°F (260°C) for 45 minutes. Flip banneton onto parchment. Score at 30–45° with a lame.\n\nStep 9 — Bake\n- 500°F, lid on: 20 minutes\n- Remove lid, reduce to 450°F: 20–25 minutes until deep golden brown\n\nStep 10 — Cool\nTransfer to wire rack. Wait at least 1 hour before slicing (2 hours is ideal).\n\nFlour Pairing Notes:\n- Daisy Unbleached Hard Flour: Recommended — protein 11–12%\n- Daisy 100% Whole Wheat: Add 10–20% for heartier crumb\n- Organic White Spelt: Substitute up to 30% for a lighter, nuttier loaf\n- Red Fife: Blend 70/30 with Daisy for complex flavour`,
    },
    {
      title: "Red Fife Sourdough Bread",
      catId: recipeCat.id,
      pinned: 1,
      content: `Red Fife is a heritage wheat thought to have originated in Ukraine and brought to Canada in the 1840s — slightly sweet with a hint of cinnamon and anise. One of our most beloved loaves.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/red-fife-sourdough-bread\n\nYield: 1 loaf | Prep: 1 hour | Bake: 40 minutes\n\nINGREDIENTS\n- 300g bread flour (2 1/3 cups)\n- 200g whole grain Red Fife flour (1 1/3 cups)\n- 360g water (1 1/2 cups)\n- 75g sourdough starter (1/3 cup)\n- 9g salt (1.5 tsp)\n\nINSTRUCTIONS\n1. Mix flour and water. Cover and autolyse for 1–2 hours.\n2. Add starter and salt, pinching and kneading to fully incorporate.\n3. Cover and rest 30–40 minutes.\n4. Perform six sets of stretch and folds every 20–30 minutes.\n5. Scrape onto a well-floured surface. Stretch and press into a rectangle.\n6. Fold in thirds, then in half.\n7. Cover and bench rest 15–20 minutes while you prep your proofing basket with rice flour or bran.\n8. Flip and shape into a boule or batard.\n9. Place in basket seam side up (for scoring) or down (for rustic look).\n10. Proof 1–3 hours at room temperature, or 6–10 hours in the refrigerator.\n11. Thirty minutes before end of proofing, preheat oven to 500°F with your Dutch oven inside.\n12. Flip dough out of basket into the hot Dutch oven.\n13. Score, cover, and bake:\n    - 500°F lid on: 30 minutes\n    - 450°F lid off: 10 minutes (or until internal temp exceeds 205°F)`,
    },
    {
      title: "Sourdough Sandwich Bread (All Purpose)",
      catId: recipeCat.id,
      pinned: 1,
      content: `Soft, tender, buttery with a hint of sweetness — perfect for toast and sandwiches. This is our go-to everyday loaf.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/basic-all-purpose-sourdough-sandwich-bread\n\nYield: 1 loaf | Prep: 25 min | Bake: 55 min\n\nINGREDIENTS\n\nStarter Build (same day):\n- 30g sourdough starter\n- 35g Arva Daisy Hard Unbleached Flour\n- 35g water\n\nFinal Dough:\n- 430g Arva Daisy Unbleached Hard Flour (3 1/3 cups)\n- 180g water (3/4 cup)\n- 100g milk (1/3 cup + 1 Tbsp)\n- 100g ripe starter from above\n- 56g unsalted butter, softened (4 Tbsp)\n- 25g sugar (2 Tbsp)\n- 8g salt (1 1/2 tsp)\n\nINSTRUCTIONS\n\nStarter Build:\nFeed 30g starter with 35g flour + 35g water. Allow to ripen 3–6 hours until at least doubled.\n\nMixing:\n- By hand: Combine all dough ingredients, mix thoroughly, rest 15–20 minutes, stretch and fold into a ball.\n- Stand mixer: Low 1 min with dough hook, then medium 2 min. Form into a ball.\nBulk ferment until almost doubled (~5 hours at warm room temp).\n\nShaping:\nShape into a simple sandwich loaf and place in a greased 8.5x4.5" loaf pan, seam side down.\nAlternatively: divide into 4 pieces, roll into balls, press into oblongs, roll into tubes, and layer in pan.\nCover and rise until doubled and close to the top of the pan.\n\nBaking:\nPreheat oven to 375°F for 15 minutes.\nBake 55 minutes, turning halfway if browning unevenly.\nFor the last 5–10 minutes, remove from pan to firm up the sides.\nInternal temp should reach 190°F. Brush warm crust with butter. Cool 2 hours before slicing.`,
    },
    {
      title: "Einkorn Sourdough Bread",
      catId: recipeCat.id,
      pinned: 1,
      content: `Wonderfully fluffy with a chewy interior and satisfying crust. Einkorn is an ancient wheat with easier digestibility — a loaf that's as nourishing as it is delicious.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/einkorn-sourdough-bread\n\nYield: 1 loaf (10 slices) | Prep: 5 min | Bake: 45 min\n\nINGREDIENTS\n- 5 cups whole grain einkorn flour\n- 1 1/4 cup water\n- 1 cup sourdough starter\n- 1.5 tsp salt\n\nINSTRUCTIONS\n1. Feed your starter 4–12 hours before starting. Once active with lots of bubbles, you're ready.\n2. Add flour, starter, salt, and water to a large bowl. Mix with hands until combined. Rest 15 minutes.\n3. Flatten dough and stretch-and-fold all edges in. Roll into a ball.\n4. Cover and rest 20 minutes.\n5. Repeat stretch-and-fold process.\n6. Rest 20 minutes, then repeat once more (3 sets total).\n7. Cover and allow to rise until doubled — 3–12 hours depending on temperature.\n8. Shape loaf with hands. Place in a floured banneton. Cover and refrigerate overnight.\n9. Preheat oven to 450°F with Dutch oven inside for 30–60 minutes.\n10. Remove dough from fridge, place on parchment, score the top.\n11. Gently lower dough and parchment into Dutch oven. Cover with lid.\n12. Bake 30 minutes lid on.\n13. Remove lid and bake another 15 minutes until golden brown.\n14. Cool before slicing.\n\nTip: For 100% einkorn flavour, start (or convert) your sourdough starter using einkorn flour.`,
    },
    {
      title: "Sourdough Einkorn Pizza Dough",
      catId: recipeCat.id,
      pinned: 1,
      content: `Einkorn makes an exceptional sourdough pizza crust — the oregano, basil, and crushed red pepper give it a bright, complex flavour that store-bought dough can't match.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/sourdough-einkorn-pizza\n\nINGREDIENTS (makes 2 pizza crusts)\n- 6 cups all-purpose einkorn flour\n- 2 tsp fine sea salt\n- 1 tsp dried oregano\n- 1/2 tsp dried basil\n- 1/4 tsp crushed red pepper flakes\n- 2 Tbsp extra virgin olive oil\n- 1/4 cup sourdough starter\n- 1 1/2 cups water\n\nINSTRUCTIONS\n1. Whisk flour, salt, oregano, basil, and red pepper flakes together in a large bowl.\n2. Form a well in the centre and pour in olive oil, starter, and 1 1/2 cups water.\n3. Mix by hand to a shaggy dough. Cover tightly and leave on the counter for 12 hours until doubled.\n4. Scrape dough onto a floured surface. Knead 10 minutes, incorporating just enough flour to make it workable.\n5. Form into a ball, cover with a large bowl, and rest 15 minutes.\n6. Heat oven to 425°F.\n7. Divide into 2 balls. Roll out onto baking sheet or stone to 1/4 inch thick.\n8. Bake 10 minutes.\n9. Remove, add sauce, toppings, and cheese.\n10. Return to oven and bake another 10–12 minutes until toppings are cooked.\n\nTip: You can freeze the dough after step 3 — thaw and continue from step 4 for an easy weeknight supper.`,
    },
    {
      title: "Sourdough Emmer Loaf (Best Ever!)",
      catId: recipeCat.id,
      pinned: 1,
      content: `A beautiful golden emmer loaf contributed by Julie from Farmhouse Fourteen. Emmer is an ancient grain with a gorgeous colour and earthy depth.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/best-ever-sourdough-emmer-loaf\n\nTips for summer baking:\n- Use cold water for starter feedings and dough mixing to slow fermentation.\n- Reduce your starter by 20% in warm weather.\n- Find the coolest spot in your house (often the basement) for bulk fermentation.\n\nINSTRUCTIONS\n1. Mix starter and water together. Add salt, then both types of flour. Mix well until fully combined.\n2. Rest on the counter for 1 hour.\n3. Perform first set of stretch and folds. Rest 30 minutes.\n4. Repeat stretch/fold/rest for 4–5 sets total.\n5. Allow dough to bulk ferment at room temperature until properly fermented (approximately 7 hours at 22°C — more time if cooler, less if warmer).\n6. Turn dough out and shape into a boule. Let sit 20 minutes, then final shape and place into a banneton.\n7. Refrigerate overnight.\n8. Bake in a preheated Dutch oven at 450°F:\n   - Lid on: 20 minutes\n   - Lid off: 22–25 minutes until deeply golden`,
    },
    {
      title: "Whole Emmer Sourdough Bread",
      catId: recipeCat.id,
      pinned: 1,
      content: `This ancient grain produces a slightly sweet loaf with a delicate nutty flavour — perfect paired with cream cheese, butter, or jam.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/whole-emmer-sourdough-bread\n\nPrep: 40 min | Bake: 45 min\n\nINGREDIENTS\n- 530g whole emmer flour (4 cups + 1 Tbsp)\n- 8g salt (1 1/2 tsp)\n- 360g water (1 1/2 cups)\n- 75g honey (3 Tbsp)\n- 80g active starter (1/3 cup)\n\nINSTRUCTIONS\n1. Combine flour and salt in a large bowl. Stir water, starter, and honey together in a separate container.\n2. Mix wet and dry until all flour is incorporated. Emmer takes time to absorb water — mix for a few minutes before adding more liquid.\n3. Cover and rest at room temperature for 1 hour.\n4. Perform four stretch-and-fold sets over the second hour, spaced 20 minutes apart (at 1:00, 1:20, 1:40, and 2:00 hours).\n5. Allow to ferment an additional 6–12 hours (8–14 hours total since mixing).\n6. Scrape onto a well-floured counter. Gently spread into a rectangle. Fold in thirds, then in half. Rest 15 minutes while you prep your proofing basket.\n7. Shape into a boule or batard and place in basket seam side up. Cover with plastic.\n8. Refrigerate for 10 hours (up to 20), or leave at room temperature for about 1 hour.\n9. Preheat oven and Dutch oven to 450°F for 30 minutes before proofing ends.\n10. Flip dough into hot vessel, score with a razor.\n11. Bake until internal temp reaches 205°F:\n    - 450°F lid on: 35 minutes\n    - 450°F lid off: 10 minutes`,
    },
    // From cookbook
    {
      title: "Sourdough Rye Bread (from the Arva Cookbook)",
      catId: recipeCat.id,
      pinned: 1,
      content: `From our Arva Flour Mills Recipe Cookbook — a classic sourdough rye with a beautiful crust. Download the full cookbook at https://arvaflourmills.com/blogs/news/bake-with-arva-the-arva-flour-mills-recipe-cookbook\n\nINGREDIENTS\n- 2 cups Dark Rye Flour\n- 1 cup bread flour\n- 1 tsp salt\n- 1/2 cup sourdough starter\n- 1/2 tsp sugar\n- 3/4 cup warm water\n\nINSTRUCTIONS\n1. In a mixing bowl, combine rye flour, bread flour, salt, and sugar.\n2. Add sourdough starter and warm water, mixing until a dough forms.\n3. Knead for 10 minutes until smooth and elastic.\n4. Place in a greased bowl, cover, and let rise 4–6 hours or until doubled.\n5. Shape into a round loaf, place on parchment-lined baking sheet, and let rise 1–2 hours.\n6. Preheat oven to 375°F (190°C). Bake 35–40 minutes until crusty and golden.\n7. Cool completely before slicing.`,
    },
    {
      title: "Classic Red Fife Sourdough (from the Arva Cookbook)",
      catId: recipeCat.id,
      pinned: 1,
      content: `From Chapter 6 of the Arva Flour Mills Recipe Cookbook. Download the full cookbook at https://arvaflourmills.com/blogs/news/bake-with-arva-the-arva-flour-mills-recipe-cookbook\n\nINGREDIENTS\n- 2 cups Whole Red Fife Flour\n- 1 cup bread flour\n- 1/2 cup active, bubbly sourdough starter\n- 1 tsp salt\n- 3/4 cup warm water\n\nINSTRUCTIONS\n1. Mix Red Fife and bread flour. Add starter, salt, and warm water. Mix until a sticky dough forms.\n2. Cover with a damp cloth and rest 30 minutes.\n3. Perform four stretch-and-folds at 30-minute intervals to build structure.\n4. Cover and ferment at room temperature 4–6 hours until doubled.\n5. Shape into a boule and place in a floured proofing basket. Cover and refrigerate overnight.\n6. Preheat oven to 475°F (245°C) with a Dutch oven inside.\n7. Place dough in hot Dutch oven, score the top, and bake:\n   - Covered: 20 minutes\n   - Uncovered: 25 minutes until golden brown\n8. Cool completely before slicing.`,
    },
    // Guides in Flour & Ingredients
    {
      title: "Beginner's Guide to Sourdough",
      catId: flourCat.id,
      pinned: 1,
      content: `A comprehensive guide covering everything from creating a starter to baking the perfect loaf, using Arva flours.\n\nFull guide: https://arvaflourmills.com/blogs/recipes/a-beginners-guide-to-sourdough\n\nUNDERSTANDING SOURDOUGH\nSourdough is made using a natural leavening agent called a starter — a mixture of flour and water fermented over time, containing wild yeast and beneficial bacteria. The fermentation process is what gives sourdough its distinctive flavour, chewy texture, and longer shelf life.\n\nGETTING STARTED — BUILDING YOUR STARTER\nMix equal parts flour and water (50g each). Let sit at room temperature, feeding daily by discarding half and adding fresh flour and water. Over 5–7 days your starter will become reliably active and ready to bake.\n\nFEEDING YOUR STARTER\nFeed once or twice a day to keep it active and bubbly. A healthy starter has a pleasant, tangy yeasty smell. Feed with Arva Daisy Unbleached Hard Flour for best results.\n\nTHE BASIC SOURDOUGH FORMULA\nStarter + Flour + Water + Salt — that's it. Mix, knead (or stretch and fold), bulk ferment, shape, cold proof, score, bake hot.\n\nFLOUR OPTIONS FROM ARVA — https://arvaflourmills.com/pages/flour-guide\n- Daisy Unbleached Hard Flour — The everyday workhorse. Protein 11–12%, ideal hydration 75%.\n- Daisy 100% Whole Wheat — Adds fibre, earthiness, and faster fermentation. Blend 10–20%.\n- Red Fife — Heritage grain with cinnamon-sweet notes. Blend 30–50% with Daisy.\n- Emmer — Ancient grain with nutty sweetness. Use 100% or blend with hard flour.\n- Einkorn — Most ancient wheat; easier to digest. Use 100% or blend. Requires less water.\n- Organic White Spelt — Lighter and nuttier. Ferments faster than hard wheat — watch your timing.\n\nHEALTH BENEFITS\nThe long fermentation process makes wheat more digestible, breaks down phytic acid, and increases the availability of nutrients. Beneficial bacteria in sourdough also support gut health.\n\nKNEADING AND SHAPING\nSourdough is quite sticky — invest in a good bench scraper. Wet hands (not extra flour) are your best tool for handling high-hydration doughs.\n\nPROOFING AND BAKING\nA hot oven and steam are essential. Preheat your Dutch oven for at least 45 minutes at 500°F. The lid traps steam, creating the signature bloom and crust.\n\nEXPERIMENTING\nOnce you have the basic loaf down, try adding herbs, roasted garlic, seeds, nuts, or dried fruit. Explore different Arva flour blends to find your signature loaf.`,
    },
    {
      title: "Building and Maintaining Your Sourdough Starter",
      catId: flourCat.id,
      content: `Everything you need to know about creating and keeping a healthy sourdough starter with Arva Flour.\n\nFull guide: https://arvaflourmills.com/blogs/recipes/the-secret-to-delicious-sourdough-bread-a-homemade-starter-recipe\n\nGETTING STARTED\nYou'll need: a clean glass jar or food-grade plastic container, Arva Flour, and filtered water.\n\nDay 1: Mix 50g Arva Flour + 50g filtered water. Stir thoroughly. Cover loosely (a cloth secured with an elastic works well). Leave at room temperature for 24 hours.\n\nDay 2 onward: Discard half the starter and feed with 50g fresh Arva flour + 50g water. During the first couple of days you'll notice small bubbles forming and a slightly yeasty aroma developing. This is exactly what you want.\n\nDays 4–7: Your starter should become noticeably more active, rising and falling predictably after each feeding. When it reliably doubles within 4–6 hours of feeding, it's ready to bake with.\n\nTHE FLOAT TEST\nDrop a small spoonful into a glass of water. If it floats, your starter is active enough to leaven bread. If it sinks, continue daily feedings.\n\nMAINTAINING YOUR STARTER\n- Baking regularly (a few times a week): Leave on the counter and feed once or twice daily.\n- Baking occasionally: Store in the refrigerator and feed once a week. Bring to room temperature and feed 1–2 times before baking.\n\nTROUBLESHOOTING\n- Liquid layer on top (hooch): Your starter is hungry — pour it off and feed.\n- Not rising: Try a warmer spot, use filtered water, or switch to unbleached flour.\n- Pink or orange streaks: Discard and start fresh — this indicates contamination.\n- Smells like nail polish remover: Overly acidic — feed more frequently or increase the feeding ratio.\n\nARVA FLOUR RECOMMENDATIONS\nFor best results, feed with Arva Daisy Unbleached Hard Flour. For specialty starters, try Red Fife, Einkorn, or Whole Wheat. Each gives your starter a slightly different character.`,
    },
  ];

  let recipeOffset = 10;
  for (const recipe of recipes) {
    const recipeThread = db.insert(threads).values({
      title: recipe.title,
      categoryId: recipe.catId,
      authorId: adminUser.id,
      isPinned: recipe.pinned || 0,
      isLocked: 0,
      viewCount: 0,
      replyCount: 0,
      lastReplyAt: t(recipeOffset),
      lastReplyUserId: adminUser.id,
      createdAt: t(recipeOffset),
    }).returning().get();

    db.insert(posts).values({
      threadId: recipeThread.id,
      authorId: adminUser.id,
      content: recipe.content,
      isFirstPost: 1,
      likeCount: 0,
      createdAt: t(recipeOffset),
    }).run();

    recipeOffset += 10;
  }
  } // end recipe seeding guard
}

// Seed recipes for existing DBs where admin exists but recipes were never seeded
const adminUserForSeed = db.select().from(users).where(eq(users.username, "admin")).get();
if (adminUserForSeed) {
  const existingThreadCount = db.select().from(threads).where(eq(threads.authorId, adminUserForSeed.id)).all().length;
  if (existingThreadCount <= 1) {
    const recipeCat2 = db.select().from(categories).where(eq(categories.slug, "sourdough-recipes")).get()!;
    const flourCat2 = db.select().from(categories).where(eq(categories.slug, "flour-ingredients")).get()!;
    const t2 = (offset = 0) => Date.now() - offset * 60000;

    const recipes2: { title: string; catId: number; content: string; pinned?: number }[] = [
      {
        title: "Classic Sourdough Bread — Beginner's Recipe",
        catId: recipeCat2.id,
        pinned: 1,
        content: `A detailed beginner's recipe using Arva Flour Mills Daisy Unbleached Hard Flour. Arva Flour Mills have been milling flour since 1819 — our cold roller mills preserve the natural balance of bran, germ, and endosperm.\n\nFull recipe: https://arvaflourmills.com/blogs/news/classic-sourdough-bread-a-beginners-recipe-from-arva-flour-mills\n\nINGREDIENTS (makes 1 loaf)\n\nSourdough Starter (build over 5–7 days):\n- 50g Arva Daisy Unbleached Hard Flour (per feeding)\n- 50g filtered water, room temperature (per feeding)\n- Or: Arva Dehydrated Sourdough Starter\n\nDough:\n- 450g Arva Daisy Unbleached Hard Flour\n- 50g Arva Daisy Whole Wheat Flour (optional — adds flavour depth)\n- 375g filtered water, room temperature\n- 100g active sourdough starter (bubbly, recently fed)\n- 10g fine sea salt or non-iodized kosher salt\n\nINSTRUCTIONS\n\nStep 1 — Build Your Starter (Days 1–7)\nDay 1: Mix 50g Arva Daisy flour + 50g filtered water in a clean glass jar. Stir until smooth, cover loosely.\nDays 2–3: Once daily, discard half and feed with 50g fresh flour + 50g water. Small bubbles should appear.\nDays 4–5: Switch to two feedings per day. Starter should show a visible rise and fall cycle.\nFloat Test (Day 6–7): Drop a spoonful into water — if it floats, your starter is ready.\n\nStep 2 — Autolyse (30–60 min)\nCombine flours with 350g water. Mix until no dry flour remains. Cover and rest 30–60 minutes.\n\nStep 3 — Add Starter and Salt\nDissolve 10g salt in remaining 25g water. Add 100g active starter and salt solution to the dough. Pinch and fold for 3–5 minutes until fully incorporated.\n\nStep 4 — Bulk Fermentation with Stretch & Fold (4–8 hours)\nCover bowl and leave at room temperature. During the first 2 hours, perform 4 sets of stretch and folds spaced 30 minutes apart. Fermentation is complete when dough has grown 50–75%.\n\nStep 5 — Pre-Shape and Bench Rest\nTip dough onto an unfloured surface. Drag dough in a circular motion to build surface tension. Rest 20–30 minutes uncovered.\n\nStep 6 — Final Shape\nShape into a boule or batard. Place seam-side up in a well-floured banneton. Cover and refrigerate 8–16 hours.\n\nStep 7 — Score and Bake\nPreheat oven to 500°F with Dutch oven inside for 45–60 minutes. Score the dough. Bake lid on 20 min, lid off 20–25 min until deep golden brown.`,
      },
      {
        title: "Red Fife Sourdough Bread",
        catId: recipeCat2.id,
        pinned: 1,
        content: `Red Fife is a heritage wheat thought to have originated in Ukraine and brought to Canada in the 1840s — slightly sweet with a hint of cinnamon and anise.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/red-fife-sourdough-bread\n\nYield: 1 loaf | Prep: 1 hour | Bake: 40 minutes\n\nINGREDIENTS\n- 300g bread flour (2 1/3 cups)\n- 200g whole grain Red Fife flour (1 1/3 cups)\n- 360g water (1 1/2 cups)\n- 75g sourdough starter (1/3 cup)\n- 9g salt (1.5 tsp)\n\nINSTRUCTIONS\n1. Mix flour and water. Cover and autolyse for 1–2 hours.\n2. Add starter and salt, pinching and kneading to fully incorporate.\n3. Cover and rest 30–40 minutes.\n4. Perform six sets of stretch and folds every 20–30 minutes.\n5. Shape into a boule or batard. Place in a floured proofing basket.\n6. Proof 1–3 hours at room temp, or 6–10 hours in the refrigerator.\n7. Preheat oven to 500°F with Dutch oven inside.\n8. Bake: 500°F lid on 30 min, then 450°F lid off 10 min.`,
      },
      {
        title: "Sourdough Sandwich Bread (All Purpose)",
        catId: recipeCat2.id,
        pinned: 1,
        content: `Soft, tender, buttery with a hint of sweetness — perfect for toast and sandwiches.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/basic-all-purpose-sourdough-sandwich-bread\n\nYield: 1 loaf | Prep: 25 min | Bake: 55 min\n\nINGREDIENTS\n- 430g Arva Daisy Unbleached Hard Flour\n- 180g water\n- 100g milk\n- 100g ripe starter\n- 56g unsalted butter, softened\n- 25g sugar\n- 8g salt\n\nINSTRUCTIONS\nFeed starter 3–6 hours before mixing. Combine all dough ingredients and mix thoroughly. Bulk ferment until doubled (~5 hours). Shape into sandwich loaf and place in a greased 8.5x4.5" pan. Rise until doubled. Bake at 375°F for 55 minutes, turning halfway. Internal temp 190°F. Brush warm crust with butter.`,
      },
      {
        title: "Einkorn Sourdough Bread",
        catId: recipeCat2.id,
        pinned: 1,
        content: `Wonderfully fluffy with a chewy interior. Einkorn is an ancient wheat with easier digestibility.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/einkorn-sourdough-bread\n\nYield: 1 loaf | Prep: 5 min | Bake: 45 min\n\nINGREDIENTS\n- 5 cups whole grain einkorn flour\n- 1 1/4 cup water\n- 1 cup sourdough starter\n- 1.5 tsp salt\n\nINSTRUCTIONS\n1. Feed starter 4–12 hours before starting.\n2. Mix flour, starter, salt, and water. Rest 15 minutes. Stretch and fold.\n3. Repeat stretch-and-fold 3 sets total, 20 minutes apart.\n4. Rise until doubled (3–12 hours depending on temperature).\n5. Shape, place in floured banneton, refrigerate overnight.\n6. Preheat oven to 450°F with Dutch oven inside.\n7. Score and bake: lid on 30 min, lid off 15 min.`,
      },
      {
        title: "Sourdough Einkorn Pizza Dough",
        catId: recipeCat2.id,
        pinned: 1,
        content: `Einkorn makes an exceptional sourdough pizza crust with bright, complex flavour.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/sourdough-einkorn-pizza\n\nINGREDIENTS (makes 2 pizza crusts)\n- 6 cups all-purpose einkorn flour\n- 2 tsp fine sea salt\n- 1 tsp dried oregano\n- 1/2 tsp dried basil\n- 1/4 tsp crushed red pepper flakes\n- 2 Tbsp extra virgin olive oil\n- 1/4 cup sourdough starter\n- 1 1/2 cups water\n\nINSTRUCTIONS\n1. Whisk dry ingredients together.\n2. Add olive oil, starter, and water. Mix to a shaggy dough.\n3. Cover tightly, leave 12 hours until doubled.\n4. Knead 10 minutes. Rest 15 minutes.\n5. Heat oven to 425°F. Divide into 2 balls, roll to 1/4 inch thick.\n6. Par-bake 10 min. Add toppings. Bake 10–12 min more.`,
      },
      {
        title: "Sourdough Emmer Loaf (Best Ever!)",
        catId: recipeCat2.id,
        pinned: 1,
        content: `A beautiful golden emmer loaf with a gorgeous colour and earthy depth.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/best-ever-sourdough-emmer-loaf\n\nINSTRUCTIONS\n1. Mix starter and water together. Add salt, then both types of flour. Mix well.\n2. Rest 1 hour.\n3. Perform 4–5 sets of stretch and folds, 30 minutes apart.\n4. Bulk ferment at room temperature approximately 7 hours at 22°C.\n5. Shape into a boule, rest 20 minutes, final shape into banneton.\n6. Refrigerate overnight.\n7. Bake in Dutch oven at 450°F: lid on 20 min, lid off 22–25 min.`,
      },
      {
        title: "Whole Emmer Sourdough Bread",
        catId: recipeCat2.id,
        pinned: 1,
        content: `A slightly sweet loaf with a delicate nutty flavour — perfect with cream cheese or jam.\n\nFull recipe: https://arvaflourmills.com/blogs/recipes/whole-emmer-sourdough-bread\n\nINGREDIENTS\n- 530g whole emmer flour\n- 8g salt\n- 360g water\n- 75g honey\n- 80g active starter\n\nINSTRUCTIONS\n1. Combine flour and salt. Mix water, starter, and honey separately. Combine wet and dry.\n2. Rest 1 hour.\n3. Perform four stretch-and-fold sets over the second hour.\n4. Ferment 6–12 additional hours.\n5. Shape and place in proofing basket. Refrigerate 10–20 hours.\n6. Preheat Dutch oven to 450°F. Flip dough in, score.\n7. Bake: lid on 35 min, lid off 10 min until internal temp reaches 205°F.`,
      },
      {
        title: "Sourdough Rye Bread (from the Arva Cookbook)",
        catId: recipeCat2.id,
        pinned: 1,
        content: `From the Arva Flour Mills Recipe Cookbook.\n\nDownload: https://arvaflourmills.com/blogs/news/bake-with-arva-the-arva-flour-mills-recipe-cookbook\n\nINGREDIENTS\n- 2 cups Dark Rye Flour\n- 1 cup bread flour\n- 1 tsp salt\n- 1/2 cup sourdough starter\n- 1/2 tsp sugar\n- 3/4 cup warm water\n\nINSTRUCTIONS\n1. Combine rye flour, bread flour, salt, and sugar.\n2. Add starter and warm water, mix until a dough forms.\n3. Knead 10 minutes until smooth and elastic.\n4. Rise 4–6 hours or until doubled.\n5. Shape into a round loaf, rise 1–2 hours.\n6. Bake at 375°F for 35–40 minutes until golden.\n7. Cool completely before slicing.`,
      },
      {
        title: "Classic Red Fife Sourdough (from the Arva Cookbook)",
        catId: recipeCat2.id,
        pinned: 1,
        content: `From Chapter 6 of the Arva Flour Mills Recipe Cookbook.\n\nDownload: https://arvaflourmills.com/blogs/news/bake-with-arva-the-arva-flour-mills-recipe-cookbook\n\nINGREDIENTS\n- 2 cups Whole Red Fife Flour\n- 1 cup bread flour\n- 1/2 cup active sourdough starter\n- 1 tsp salt\n- 3/4 cup warm water\n\nINSTRUCTIONS\n1. Mix flours. Add starter, salt, and warm water. Mix to a sticky dough.\n2. Rest 30 minutes. Perform four stretch-and-folds at 30-minute intervals.\n3. Ferment 4–6 hours until doubled.\n4. Shape into a boule, place in floured proofing basket, refrigerate overnight.\n5. Preheat Dutch oven to 475°F.\n6. Bake: covered 20 min, uncovered 25 min until golden brown.\n7. Cool completely before slicing.`,
      },
      {
        title: "Beginner's Guide to Sourdough",
        catId: flourCat2.id,
        pinned: 1,
        content: `A comprehensive guide covering everything from creating a starter to baking the perfect loaf.\n\nFull guide: https://arvaflourmills.com/blogs/recipes/a-beginners-guide-to-sourdough\n\nUNDERSTANDING SOURDOUGH\nSourdough is made using a natural leavening agent called a starter — a mixture of flour and water fermented over time, containing wild yeast and beneficial bacteria.\n\nBUILDING YOUR STARTER\nMix equal parts flour and water (50g each). Feed daily by discarding half and adding fresh flour and water. Over 5–7 days your starter will become reliably active.\n\nFLOUR OPTIONS FROM ARVA — https://arvaflourmills.com/pages/flour-guide\n- Daisy Unbleached Hard Flour — everyday workhorse, protein 11–12%\n- Daisy 100% Whole Wheat — adds fibre and earthiness\n- Red Fife — heritage grain with cinnamon-sweet notes\n- Emmer — ancient grain with nutty sweetness\n- Einkorn — most ancient wheat, easier to digest\n- Organic White Spelt — lighter and nuttier, ferments faster\n\nTHE BASIC FORMULA\nStarter + Flour + Water + Salt. Mix, stretch and fold, bulk ferment, shape, cold proof, score, bake hot.`,
      },
      {
        title: "Building and Maintaining Your Sourdough Starter",
        catId: flourCat2.id,
        content: `Everything you need to know about creating and keeping a healthy sourdough starter.\n\nFull guide: https://arvaflourmills.com/blogs/recipes/the-secret-to-delicious-sourdough-bread-a-homemade-starter-recipe\n\nGETTING STARTED\nDay 1: Mix 50g Arva Flour + 50g filtered water. Cover loosely. Leave at room temperature 24 hours.\nDay 2 onward: Discard half, feed with 50g flour + 50g water daily. Bubbles should appear by Day 2–3.\nDays 4–7: Starter rises and falls predictably. When it doubles within 4–6 hours, it's ready.\n\nTHE FLOAT TEST\nDrop a spoonful into water — if it floats, your starter is ready to bake with.\n\nMAINTAINING\n- Baking regularly: Leave on counter, feed once or twice daily.\n- Baking occasionally: Store in fridge, feed once a week. Bring to room temperature before baking.\n\nTROUBLESHOOTING\n- Liquid on top (hooch): Starter is hungry — pour it off and feed.\n- Not rising: Try a warmer spot or switch to unbleached flour.\n- Pink/orange streaks: Discard and start fresh — contamination.`,
      },
    ];

    let offset2 = 10;
    for (const recipe of recipes2) {
      const rt = db.insert(threads).values({
        title: recipe.title,
        categoryId: recipe.catId,
        authorId: adminUserForSeed.id,
        isPinned: recipe.pinned || 0,
        isLocked: 0,
        viewCount: 0,
        replyCount: 0,
        lastReplyAt: t2(offset2),
        lastReplyUserId: adminUserForSeed.id,
        createdAt: t2(offset2),
      }).returning().get();

      db.insert(posts).values({
        threadId: rt.id,
        authorId: adminUserForSeed.id,
        content: recipe.content,
        isFirstPost: 1,
        likeCount: 0,
        createdAt: t2(offset2),
      }).run();

      offset2 += 10;
    }
  }
}

// ─── Seed new content (New Bakers guides, Discard recipes, Bake Journal, May Group Bake) ───
// Safe: each block checks for thread existence before inserting
const adminSeed = db.select().from(users).where(eq(users.username, "admin")).get();
if (adminSeed) {
  const NOW_SEED = Date.now();

  const newBakersCat = db.select().from(categories).where(eq(categories.slug, "new-bakers")).get();
  const discardCat = db.select().from(categories).where(eq(categories.slug, "discard-recipes")).get();
  const bakeJournalCat = db.select().from(categories).where(eq(categories.slug, "bake-journals")).get();
  const recipeCatSeed = db.select().from(categories).where(eq(categories.slug, "sourdough-recipes")).get();

  function seedThread(title: string, catId: number, content: string, isPinned = 1) {
    const exists = db.select().from(threads)
      .where(eq(threads.title, title))
      .get();
    if (exists) return;
    const thread = db.insert(threads).values({
      title, categoryId: catId, authorId: adminSeed!.id,
      isPinned, isLocked: 0, viewCount: 0, replyCount: 0,
      createdAt: NOW_SEED,
    }).returning().get();
    db.insert(posts).values({
      threadId: thread.id, authorId: adminSeed!.id, content,
      isFirstPost: 1, likeCount: 0, createdAt: NOW_SEED,
    }).run();
  }

  // ── New Bakers ──
  if (newBakersCat) {
    seedThread(
      "\uD83D\uDC4B Welcome to the Arva Sourdough Community \u2014 Read This First",
      newBakersCat.id,
      `Welcome to the Arva Sourdough Community \u2014 we're glad you're here.\n\nThis forum was built for bakers of every level, from those who've never touched a starter to those who've been baking for decades.\n\n**A few things to know:**\n\n\uD83C\uDF3E **All skill levels are welcome.** There are no silly questions here. Whether your loaf came out flat, gummy, too sour, or didn't rise at all \u2014 post it. We don't shame loaves; we help fix them.\n\n\uD83D\uDCF8 **Photos are encouraged.** Crumb shots, starters, scoring patterns, even the disasters \u2014 share them.\n\n\uD83C\uDFE1 **This is a community, not a competition.** Be generous with your knowledge, patient with beginners, and kind in your feedback.\n\n\uD83C\uDF31 **New to sourdough?** Check out the pinned guides in this category.\n\n\uD83C\uDFED **About Arva Flour Mills:** Canada's oldest commercial Flour Mill. Farm to Table since 1819. Visit our [Flour Guide](https://arvaflourmills.com/pages/flour-guide) to learn more.\n\nHappy baking. \uD83C\uDF5E\n\n*\u2014 Arva Flour Mills*`
    );
    seedThread(
      "How to Start and Maintain a Sourdough Starter",
      newBakersCat.id,
      `Your starter is a living culture of wild yeast and beneficial bacteria \u2014 the heart of every sourdough loaf.\n\n## What You Need\n- Clean glass jar (500mL+)\n- Kitchen scale\n- Arva All-Purpose or Whole Wheat Flour\n- Unchlorinated water\n\n## Day 1\nMix 50g flour + 50g water. Cover loosely. Leave at room temperature (21\u201324\u00b0C).\n\n## Days 2\u20137 \u2014 Daily Feeding\nDiscard all but 50g, then feed: 50g flour + 50g water. Stir well, cover loosely.\n\n**Signs of progress:**\n- Days 1\u20132: Little activity. Normal.\n- Days 2\u20134: Bubbles appear. May smell unpleasant \u2014 normal.\n- Days 5\u20137: Consistent bubbles, pleasant tangy smell, regular rise and fall.\n\n## Ready to Bake When:\n1. Doubles within 4\u20138 hours of feeding\n2. Domed top at peak\n3. Passes the float test \u2014 drop a spoonful in water; if it floats, it's ready\n\n## Long-Term Storage\n- **Baking often:** Keep on counter, feed daily.\n- **Baking occasionally:** Store in fridge, feed weekly.\n- **Going away?** Feed well, refrigerate. Fine for 2\u20133 weeks.\n\n*\u2014 Arva Flour Mills | [Flour Guide](https://arvaflourmills.com/pages/flour-guide)*`
    );
    seedThread(
      "Your First Sourdough Loaf \u2014 A Step-by-Step Walkthrough",
      newBakersCat.id,
      `You have an active starter. Time to bake your first loaf.\n\n## Ingredients\n- 450g Arva All-Purpose Flour\n- 325g water (72% hydration)\n- 100g active starter\n- 9g salt\n\n## Steps\n1. **Autolyse (30 min):** Mix flour and water. Rest covered.\n2. **Add starter + salt:** Squeeze through fingers until incorporated.\n3. **Stretch & fold:** Every 30 min \u00d7 4 sets over 2 hours.\n4. **Bulk ferment:** 4\u20136 more hours until 50\u201375% growth.\n5. **Pre-shape:** Fold edges under, bench rest 20 min.\n6. **Final shape:** Shape into boule, place seam-up in floured banneton.\n7. **Cold proof:** Refrigerate overnight (8\u201316 hours).\n8. **Bake:** Preheat Dutch oven to 250\u00b0C. Bake covered 20 min, lid off at 230\u00b0C for 20\u201325 min.\n9. **Cool 1 hour** before slicing.\n\nYour first loaf probably won't look like Instagram. That's normal \u2014 post a photo here and we'll help you read what happened.\n\n*\u2014 Arva Flour Mills*`
    );
    seedThread(
      "Reading Your Crumb \u2014 What Your Loaf Is Telling You",
      newBakersCat.id,
      `The crumb is a map of everything that happened during fermentation.\n\n## What to Look For\n- **Dense, few bubbles:** Underfermented or starter not active enough.\n- **Large holes + gummy patches:** Underfermented. More bulk time needed.\n- **Dense, gummy throughout:** Overfermented or underbaked.\n- **Even tight crumb:** Often correct for whole grain or lower hydration.\n- **Tunnelling (one large hole):** Shaping issue \u2014 air trapped.\n- **Collapsed/torn:** Overproofed.\n\n## The Fastest Way to Improve\nKeep a simple bake log: date, flour, hydration, bulk time + temp, crumb photo. After 5\u20136 bakes you'll see your own patterns.\n\nPost crumb photos here \u2014 experienced bakers can often diagnose a fermentation issue from a photo in seconds.\n\n*\u2014 Arva Flour Mills*`
    );
    seedThread(
      "What to Do With Your Discard (and Why You Should Save It)",
      newBakersCat.id,
      `Discard is starter removed before each feeding. Most beginners throw it away. Once you know what you can make with it, you never will again.\n\n## What Is Discard?\nLess active starter, full of flavour. Adds tang and depth to baked goods using chemical leavening.\n\n## How to Store It\nSeparate jar in the fridge, up to 2 weeks. Add to it every time you feed your starter.\n\n## What You Can Make\n**Quick (under 30 min):** Pancakes, waffles, crackers, flatbread\n**Baking:** Banana bread, muffins, chocolate chip cookies, cinnamon rolls\n**Savoury:** Crepes, pizza dough, onion ring batter\n\nHead to the **Discard Recipes** category for recipes using Arva flour. We'd love for you to share your own favourites too.\n\n*\u2014 Arva Flour Mills*`
    );
  }

  // ── Discard Recipes ──
  if (discardCat) {
    seedThread(
      "Sourdough Discard Pancakes \u2014 Light, Tangy, and Perfect Every Time",
      discardCat.id,
      `The best pancakes you'll ever make. The discard adds a subtle tang that regular pancakes don't have.\n\n## Ingredients (serves 2\u20133)\n- 150g sourdough discard\n- 120ml milk\n- 1 large egg\n- 1 tbsp melted butter\n- 1 tsp vanilla\n- 1 tbsp maple syrup or sugar\n- 120g Arva All-Purpose Flour\n- 1 tsp baking powder\n- \u00bd tsp baking soda\n- Pinch of salt\n\n## Instructions\n1. Whisk discard, milk, egg, butter, vanilla, and sugar until smooth.\n2. In a separate bowl whisk flour, baking powder, baking soda, and salt.\n3. Fold dry into wet \u2014 do not overmix. Rest 5 min.\n4. Cook on medium-heat buttered skillet ~2\u20133 min per side.\n\n## Tips\n- Older discard = more tang\n- Add blueberries or chocolate chips before cooking\n- Batter keeps overnight in the fridge\n\n*Uses: [Arva All-Purpose Flour](https://arvaflourmills.com/products/all-purpose-flour)*`
    );
    seedThread(
      "Sourdough Discard Crackers \u2014 Crispy, Seeded, and Endlessly Customizable",
      discardCat.id,
      `30 minutes, uses up a good amount of discard, tastes far better than anything from a box.\n\n## Ingredients (~40 crackers)\n- 200g sourdough discard\n- 60g Arva All-Purpose Flour\n- 40g melted butter or olive oil\n- \u00bd tsp salt\n- Toppings: sesame seeds, flax, everything bagel seasoning, rosemary, flaky sea salt\n\n## Instructions\n1. Preheat oven to 175\u00b0C (350\u00b0F).\n2. Mix all ingredients into a cohesive dough.\n3. Roll as thin as possible (~2mm) between parchment sheets.\n4. Remove top parchment, add toppings, score into cracker shapes.\n5. Bake 25\u201335 min until golden. Crisp further as they cool.\n\n**Variations:** Whole wheat, parmesan, herbs, spicy\n\n*Uses: [Arva All-Purpose Flour](https://arvaflourmills.com/products/all-purpose-flour)*`
    );
    seedThread(
      "Sourdough Discard Banana Bread \u2014 Moist, Tangy, and Perfect for Overripe Bananas",
      discardCat.id,
      `Two pantry problems solved at once.\n\n## Ingredients (one 9\u00d75 loaf)\n- 3 very ripe bananas (~300g), mashed\n- 150g sourdough discard\n- 2 eggs\n- 100g butter, melted\n- 150g brown sugar\n- 1 tsp vanilla\n- 250g Arva All-Purpose Flour\n- 1 tsp baking soda\n- \u00bd tsp salt\n- 1 tsp cinnamon\n- Optional: 100g walnuts or chocolate chips\n\n## Instructions\n1. Preheat 175\u00b0C (350\u00b0F). Grease a loaf pan.\n2. Mash bananas, whisk in discard, eggs, butter, sugar, and vanilla.\n3. Fold in flour, baking soda, salt, cinnamon. Do not overmix.\n4. Fold in walnuts/chips if using. Pour into pan.\n5. Bake 55\u201365 min until a toothpick comes out clean.\n6. Cool 30 min before slicing.\n\n*Uses: [Arva All-Purpose Flour](https://arvaflourmills.com/products/all-purpose-flour)*`,
      0
    );
  }

  // ── Bake Journals ──
  if (bakeJournalCat) {
    seedThread(
      "\uD83D\uDCD6 How to Use This Category \u2014 Your Personal Bake Journal",
      bakeJournalCat.id,
      `Welcome to Bake Journals \u2014 one of the most valuable things you can do as a developing baker is keep a record of your bakes.\n\n## How It Works\n**Start one thread with your name** (e.g. \"Sarah's Bake Journal\") and add to it over time. Every bake: what you made, what you changed, what happened, a photo if you have one.\n\n## What to Include\n- Date and recipe\n- Flour used (which Arva flour, blend)\n- Hydration %\n- Starter health \u2014 time since last feed\n- Bulk fermentation time + temperature\n- What changed from last time\n- Result + crumb photo\n- What to try next time\n\n## Why It Matters\nThe difference between a baker who improves quickly and one who stays stuck is almost always the bake journal.\n\n**To start:** Create a new thread in this category with your name in the title.\n\n*\u2014 Arva Flour Mills*`
    );
  }

  // ── May Group Bake ──
  if (recipeCatSeed) {
    seedThread(
      "\uD83C\uDF5E May Group Bake \u2014 Classic Sourdough Loaf",
      recipeCatSeed.id,
      `Welcome to our first Arva Community Group Bake \u2014 kicking off with the Classic Sourdough Loaf.\n\n## The Challenge\nBake the Classic Sourdough Loaf this month using Arva flour. Share your results here \u2014 photos, notes, questions, wins, and honest failures all welcome.\n\n## How to Participate\n1. Bake the loaf any time this month (May 2026)\n2. Reply below with a photo + a few notes\n3. Ask questions, offer tips, celebrate each other's bakes\n\n## Tell Us:\n- Which Arva flour did you use?\n- Any modifications?\n- How did your bulk fermentation go?\n- Crumb photo if you have one\n- One thing you'd do differently next time\n\nWe'll run a group bake every month with a different recipe.\n\nLet's bake. \uD83C\uDF3E\n\n*\u2014 Arva Flour Mills*`
    );
  }
}

export interface IStorage {
  // Auth
  getUserByEmail(email: string): User | undefined;
  getUserByUsername(username: string): User | undefined;
  setPasswordResetToken(email: string, token: string, expiry: number): boolean;
  getUserByResetToken(token: string): User | undefined;
  resetPassword(token: string, newHash: string): boolean;
  updateAvatar(userId: number, avatarUrl: string): void;
  getUserById(id: number): User | undefined;
  createUser(data: Omit<InsertUser, "passwordHash"> & { password: string }): User;
  verifyPassword(user: User, password: string): boolean;

  // Categories
  getCategories(): (Category & { threadCount: number; latestThreadTitle?: string })[];

  // Threads
  getThreadsByCategory(categorySlug: string): (Thread & { author: User; category: Category })[];
  getThreadById(id: number): (Thread & { author: User; category: Category }) | undefined;
  createThread(data: { title: string; categoryId: number; authorId: number; content: string; imageUrl?: string; flair?: string }): Thread;
  incrementViewCount(threadId: number): void;
  deleteThread(threadId: number): void;
  setPinned(threadId: number, pinned: boolean): void;
  setLocked(threadId: number, locked: boolean): void;
  
  // Posts
  getPostsByThread(threadId: number, userId?: number): (Post & { author: User; likedByMe: boolean; myReactions: Record<string, boolean> })[];
  createPost(data: { threadId: number; authorId: number; content: string; imageUrl?: string }): Post;
  deletePost(postId: number): void;
  
  // Likes
  toggleLike(postId: number, userId: number): { liked: boolean; likeCount: number };
  
  // Reactions
  toggleReaction(postId: number, userId: number, reaction: string): { counts: Record<string, number>; myReactions: Record<string, boolean> };
  
  // Best Answer
  markBestAnswer(postId: number, threadId: number, markerId: number): { ok: boolean };
  
  // Search
  searchThreads(query: string): (Thread & { author: User; category: Category })[];

  // Waitlist
  addToWaitlist(data: { name: string; email: string }): { ok: boolean; duplicate: boolean };
  getWaitlist(): Waitlist[];

  // Admin
  getAllUsers(): User[];
  getAllThreads(): (Thread & { author: User; category: Category })[];
  setUserRole(userId: number, role: string): void;
  banUser(userId: number): void;
  getAdminStats(): { totalUsers: number; totalThreads: number; totalPosts: number; waitlistCount: number };
}

export const storage: IStorage = {
  getUserByEmail(email) {
    return db.select().from(users).where(eq(users.email, email)).get();
  },
  getUserByUsername(username) {
    return db.select().from(users).where(eq(users.username, username)).get();
  },
  getUserById(id) {
    return db.select().from(users).where(eq(users.id, id)).get();
  },
  createUser({ password, ...data }) {
    return db.insert(users).values({
      ...data,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
    }).returning().get();
  },
  verifyPassword(user, password) {
    return user.passwordHash === hashPassword(password);
  },

  setPasswordResetToken(email, token, expiry) {
    const user = db.select().from(users).where(eq(users.email, email)).get();
    if (!user) return false;
    sqlite.prepare("UPDATE users SET password_reset_token = ?, password_reset_expiry = ? WHERE email = ?")
      .run(token, expiry, email);
    return true;
  },

  getUserByResetToken(token) {
    return sqlite.prepare("SELECT * FROM users WHERE password_reset_token = ?").get(token) as User | undefined;
  },

  resetPassword(token, newHash) {
    const user = sqlite.prepare("SELECT * FROM users WHERE password_reset_token = ?").get(token) as User | undefined;
    if (!user) return false;
    if (user.passwordResetExpiry && user.passwordResetExpiry < Date.now()) return false;
    sqlite.prepare("UPDATE users SET password_hash = ?, password_reset_token = NULL, password_reset_expiry = NULL WHERE id = ?")
      .run(newHash, user.id);
    return true;
  },

  updateAvatar(userId, avatarUrl) {
    sqlite.prepare("UPDATE users SET avatar_url = ? WHERE id = ?").run(avatarUrl, userId);
  },

  getCategories() {
    const cats = db.select().from(categories).all();
    return cats.map(cat => {
      const threadCount = db.select().from(threads).where(eq(threads.categoryId, cat.id)).all().length;
      const latest = db.select().from(threads)
        .where(eq(threads.categoryId, cat.id))
        .orderBy(desc(threads.createdAt))
        .get();
      return { ...cat, threadCount, latestThreadTitle: latest?.title };
    });
  },

  getThreadsByCategory(categorySlug) {
    const cat = db.select().from(categories).where(eq(categories.slug, categorySlug)).get();
    if (!cat) return [];
    const threadList = db.select().from(threads)
      .where(eq(threads.categoryId, cat.id))
      .orderBy(desc(threads.isPinned), desc(threads.lastReplyAt), desc(threads.createdAt))
      .all();
    return threadList.map(t => {
      const author = db.select().from(users).where(eq(users.id, t.authorId)).get()!;
      return { ...t, author, category: cat };
    });
  },

  getThreadById(id) {
    const thread = db.select().from(threads).where(eq(threads.id, id)).get();
    if (!thread) return undefined;
    const author = db.select().from(users).where(eq(users.id, thread.authorId)).get()!;
    const cat = db.select().from(categories).where(eq(categories.id, thread.categoryId)).get()!;
    return { ...thread, author, category: cat };
  },

  createThread({ title, categoryId, authorId, content, imageUrl, flair }: { title: string; categoryId: number; authorId: number; content: string; imageUrl?: string; flair?: string }) {
    const now = Date.now();
    const thread = db.insert(threads).values({
      title,
      categoryId,
      authorId,
      flair: flair || null,
      isPinned: 0,
      isLocked: 0,
      viewCount: 0,
      replyCount: 0,
      lastReplyAt: now,
      lastReplyUserId: authorId,
      createdAt: now,
    }).returning().get();

    db.insert(posts).values({
      threadId: thread.id,
      authorId,
      content,
      imageUrl: imageUrl || null,
      isFirstPost: 1,
      likeCount: 0,
      createdAt: now,
    }).run();

    return thread;
  },

  incrementViewCount(threadId) {
    const thread = db.select().from(threads).where(eq(threads.id, threadId)).get();
    if (thread) {
      sqlite.prepare("UPDATE threads SET view_count = view_count + 1 WHERE id = ?").run(threadId);
    }
  },

  getPostsByThread(threadId, userId?: number) {
    const postList = db.select().from(posts)
      .where(eq(posts.threadId, threadId))
      .orderBy(posts.createdAt)
      .all();
    return postList.map(p => {
      const author = db.select().from(users).where(eq(users.id, p.authorId)).get()!;
      const likedByMe = userId
        ? !!db.select().from(likes).where(and(eq(likes.postId, p.id), eq(likes.userId, userId))).get()
        : false;
      // Per-user reaction state
      const myReactions: Record<string, boolean> = {};
      if (userId) {
        const rows = sqlite.prepare("SELECT reaction FROM post_reactions WHERE post_id = ? AND user_id = ?").all(p.id, userId) as { reaction: string }[];
        for (const r of rows) myReactions[r.reaction] = true;
      }
      return { ...p, author, likedByMe, myReactions };
    });
  },

  toggleReaction(postId: number, userId: number, reaction: string): { counts: Record<string, number>; myReactions: Record<string, boolean> } {
    const existing = sqlite.prepare("SELECT id FROM post_reactions WHERE post_id = ? AND user_id = ? AND reaction = ?").get(postId, userId, reaction);
    if (existing) {
      sqlite.prepare("DELETE FROM post_reactions WHERE post_id = ? AND user_id = ? AND reaction = ?").run(postId, userId, reaction);
    } else {
      sqlite.prepare("INSERT INTO post_reactions (post_id, user_id, reaction, created_at) VALUES (?, ?, ?, ?)").run(postId, userId, reaction, Date.now());
    }
    // Rebuild counts from post_reactions table
    const allRows = sqlite.prepare("SELECT reaction, COUNT(*) as cnt FROM post_reactions WHERE post_id = ? GROUP BY reaction").all(postId) as { reaction: string; cnt: number }[];
    const counts: Record<string, number> = {};
    for (const r of allRows) counts[r.reaction] = r.cnt;
    // Update the JSON cache in posts.reactions
    sqlite.prepare("UPDATE posts SET reactions = ? WHERE id = ?").run(JSON.stringify(counts), postId);
    // Return per-user state
    const myRows = sqlite.prepare("SELECT reaction FROM post_reactions WHERE post_id = ? AND user_id = ?").all(postId, userId) as { reaction: string }[];
    const myReactions: Record<string, boolean> = {};
    for (const r of myRows) myReactions[r.reaction] = true;
    return { counts, myReactions };
  },

  markBestAnswer(postId: number, threadId: number, markerId: number): { ok: boolean } {
    // Only the thread author or admin can mark
    const thread = sqlite.prepare("SELECT * FROM threads WHERE id = ?").get(threadId) as any;
    if (!thread) return { ok: false };
    const marker = db.select().from(users).where(eq(users.id, markerId)).get();
    if (!marker) return { ok: false };
    if (marker.role !== "admin" && thread.author_id !== markerId) return { ok: false };
    // Check if this post is already the best answer (toggle)
    const post = db.select().from(posts).where(eq(posts.id, postId)).get();
    if (!post) return { ok: false };
    const alreadyBest = post.isBestAnswer === 1;
    // Clear any existing best answer in this thread
    sqlite.prepare("UPDATE posts SET is_best_answer = 0 WHERE thread_id = ?").run(threadId);
    if (alreadyBest) {
      // Toggle off
      sqlite.prepare("UPDATE threads SET is_solved = 0 WHERE id = ?").run(threadId);
    } else {
      sqlite.prepare("UPDATE posts SET is_best_answer = 1 WHERE id = ?").run(postId);
      sqlite.prepare("UPDATE threads SET is_solved = 1 WHERE id = ?").run(threadId);
    }
    return { ok: true };
  },

  createPost({ threadId, authorId, content, imageUrl }) {
    const now = Date.now();
    const post = db.insert(posts).values({
      threadId,
      authorId,
      content,
      imageUrl: imageUrl || null,
      isFirstPost: 0,
      likeCount: 0,
      createdAt: now,
    }).returning().get();

    sqlite.prepare("UPDATE threads SET reply_count = reply_count + 1, last_reply_at = ?, last_reply_user_id = ? WHERE id = ?")
      .run(now, authorId, threadId);

    return post;
  },

  toggleLike(postId, userId) {
    const existing = db.select().from(likes)
      .where(and(eq(likes.postId, postId), eq(likes.userId, userId)))
      .get();

    if (existing) {
      db.delete(likes).where(and(eq(likes.postId, postId), eq(likes.userId, userId))).run();
      sqlite.prepare("UPDATE posts SET like_count = like_count - 1 WHERE id = ?").run(postId);
      const updated = db.select().from(posts).where(eq(posts.id, postId)).get()!;
      return { liked: false, likeCount: updated.likeCount };
    } else {
      db.insert(likes).values({ postId, userId, createdAt: Date.now() }).run();
      sqlite.prepare("UPDATE posts SET like_count = like_count + 1 WHERE id = ?").run(postId);
      const updated = db.select().from(posts).where(eq(posts.id, postId)).get()!;
      return { liked: true, likeCount: updated.likeCount };
    }
  },

  deleteThread(threadId) {
    sqlite.prepare("DELETE FROM posts WHERE thread_id = ?").run(threadId);
    sqlite.prepare("DELETE FROM threads WHERE id = ?").run(threadId);
  },

  setPinned(threadId, pinned) {
    sqlite.prepare("UPDATE threads SET is_pinned = ? WHERE id = ?").run(pinned ? 1 : 0, threadId);
  },

  setLocked(threadId, locked) {
    sqlite.prepare("UPDATE threads SET is_locked = ? WHERE id = ?").run(locked ? 1 : 0, threadId);
  },

  deletePost(postId) {
    const post = db.select().from(posts).where(eq(posts.id, postId)).get();
    if (post) {
      sqlite.prepare("UPDATE threads SET reply_count = MAX(0, reply_count - 1) WHERE id = ?").run(post.threadId);
      sqlite.prepare("DELETE FROM likes WHERE post_id = ?").run(postId);
      sqlite.prepare("DELETE FROM posts WHERE id = ?").run(postId);
    }
  },

  getAllUsers() {
    return db.select().from(users).orderBy(desc(users.createdAt)).all();
  },

  getAllThreads() {
    const threadList = db.select().from(threads).orderBy(desc(threads.createdAt)).all();
    return threadList.map(t => {
      const author = db.select().from(users).where(eq(users.id, t.authorId)).get()!;
      const cat = db.select().from(categories).where(eq(categories.id, t.categoryId)).get()!;
      return { ...t, author, category: cat };
    });
  },

  setUserRole(userId, role) {
    sqlite.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
  },

  banUser(userId) {
    sqlite.prepare("UPDATE users SET role = 'banned' WHERE id = ?").run(userId);
  },

  getAdminStats() {
    const totalUsers = (sqlite.prepare("SELECT COUNT(*) as c FROM users").get() as any).c;
    const totalThreads = (sqlite.prepare("SELECT COUNT(*) as c FROM threads").get() as any).c;
    const totalPosts = (sqlite.prepare("SELECT COUNT(*) as c FROM posts").get() as any).c;
    const waitlistCount = (sqlite.prepare("SELECT COUNT(*) as c FROM waitlist").get() as any).c;
    return { totalUsers, totalThreads, totalPosts, waitlistCount };
  },

  searchThreads(query) {
    const lower = `%${query.toLowerCase()}%`;
    const results = sqlite.prepare(
      "SELECT * FROM threads WHERE LOWER(title) LIKE ? ORDER BY created_at DESC LIMIT 20"
    ).all(lower) as Thread[];
    return results.map(t => {
      const author = db.select().from(users).where(eq(users.id, t.authorId)).get()!;
      const cat = db.select().from(categories).where(eq(categories.id, t.categoryId)).get()!;
      return { ...t, author, category: cat };
    });
  },

  addToWaitlist({ name, email }) {
    const existing = db.select().from(waitlist).where(eq(waitlist.email, email.toLowerCase().trim())).get();
    if (existing) return { ok: false, duplicate: true };
    db.insert(waitlist).values({ name: name.trim(), email: email.toLowerCase().trim(), createdAt: Date.now() }).run();
    return { ok: true, duplicate: false };
  },

  getWaitlist() {
    return db.select().from(waitlist).orderBy(desc(waitlist.createdAt)).all();
  },
};
