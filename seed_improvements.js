// Forum Improvement Seeding Script
// Adds: New Bakers category, Discard Recipes category, Bake Journal category,
// Community Guidelines, Beginner Hub posts, May Group Bake thread

const Database = require('better-sqlite3');
const db = new Database('forum.db');

const ADMIN_ID = 1; // mark@arvaflourmills.com
const NOW = Math.floor(Date.now() / 1000);

// ─── 1. Add new categories ────────────────────────────────────────────────────

const existingSlugs = db.prepare("SELECT slug FROM categories").all().map(r => r.slug);

function addCategory(name, description, slug, icon, color, sortOrder) {
  if (existingSlugs.includes(slug)) {
    console.log(`  Skipping existing category: ${slug}`);
    return db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug).id;
  }
  const result = db.prepare(
    "INSERT INTO categories (name, description, slug, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(name, description, slug, icon, color, sortOrder);
  console.log(`  Added category: ${name} (id ${result.lastInsertRowid})`);
  return result.lastInsertRowid;
}

console.log("\n── Adding categories ──");

const newBakersId = addCategory(
  'New Bakers',
  'Just starting out? Welcome! Find guides, tips, and encouragement for your first sourdough journey.',
  'new-bakers',
  'Sprout',
  'bg-green-50 text-green-700',
  0  // sort_order 0 = appears first
);

const discardId = addCategory(
  'Discard Recipes',
  'Don\'t throw it away — bake with it. Pancakes, crackers, waffles, pizza dough and more.',
  'discard-recipes',
  'Recycle',
  'bg-amber-50 text-amber-700',
  5
);

const bakeJournalId = addCategory(
  'Bake Journals',
  'Keep a running log of your bakes. One thread per baker — document your progress, wins, and lessons.',
  'bake-journals',
  'BookOpen',
  'bg-blue-50 text-blue-700',
  6
);

// ─── 2. Helper: create thread + opening post ──────────────────────────────────

function createThread(title, categoryId, content, isPinned = 0) {
  // Check if thread already exists
  const existing = db.prepare("SELECT id FROM threads WHERE title = ? AND category_id = ?").get(title, categoryId);
  if (existing) {
    console.log(`  Skipping existing thread: "${title}"`);
    return existing.id;
  }

  const thread = db.prepare(`
    INSERT INTO threads (title, category_id, author_id, is_pinned, is_locked, view_count, reply_count, created_at)
    VALUES (?, ?, ?, ?, 0, 0, 0, ?)
  `).run(title, categoryId, ADMIN_ID, isPinned, NOW);

  const threadId = thread.lastInsertRowid;

  db.prepare(`
    INSERT INTO posts (thread_id, author_id, content, created_at)
    VALUES (?, ?, ?, ?)
  `).run(threadId, ADMIN_ID, content, NOW);

  console.log(`  Added thread: "${title}" (id ${threadId})`);
  return threadId;
}

// ─── 3. NEW BAKERS category content ──────────────────────────────────────────

console.log("\n── New Bakers threads ──");

createThread(
  '👋 Welcome to the Arva Sourdough Community — Read This First',
  newBakersId,
  `Welcome to the Arva Sourdough Community — we're glad you're here.

This forum was built for bakers of every level, from those who've never touched a starter to those who've been baking for decades. We gather here because we share a love of real ingredients, slow fermentation, and the deeply satisfying craft of sourdough.

**A few things to know before you dive in:**

🌾 **All skill levels are welcome.** There are no silly questions here. Whether your loaf came out flat, gummy, too sour, or didn't rise at all — post it. Every baker who's been at this a while has had exactly the same experience. We don't shame loaves; we help fix them.

📸 **Photos are encouraged.** Crumb shots, starters, scoring patterns, even the disasters — share them. A photo tells us more than a paragraph of description and it's always fun to see what everyone is baking.

🏡 **This is a community, not a competition.** Be generous with your knowledge, patient with beginners, and kind in your feedback.

🌱 **New to sourdough?** Start in this New Bakers category. Check out the pinned guides below — they'll walk you through everything from building your first starter to your first bake.

🏭 **About Arva Flour Mills:** Canada's oldest commercial Flour Mill. Farm to Table since 1819. Our flours are milled from 100% Canadian grain and we take great pride in the quality and consistency that goes into every bag. You'll find our [Flour Guide](https://arvaflourmills.com/pages/flour-guide) helpful when selecting the right flour for your bakes.

**Explore the categories:**
- **Flour & Ingredients** — talk flour, water, salt, and starters
- **Sourdough Recipes** — full recipes, tips, and variations
- **Discard Recipes** — creative ways to use your discard
- **Troubleshooting** — something went wrong? We'll help figure it out
- **Bake Journals** — keep a running log of your bakes
- **Workshop Alumni** — a space for those who've joined us at the mill

Happy baking. 🍞

*— Arva Flour Mills*`,
  1 // pinned
);

createThread(
  'How to Start and Maintain a Sourdough Starter',
  newBakersId,
  `Your starter is a living culture of wild yeast and beneficial bacteria — it's the heart of every sourdough loaf you'll ever make. Here's how to get one going with Arva flour.

---

## What You Need

- A clean glass jar (500 mL or larger)
- Kitchen scale (measuring by weight is far more reliable than volume)
- **Arva All-Purpose or Whole Wheat Flour** — whole wheat gets things going faster because of the bran's natural wild yeast
- Unchlorinated water (filtered, or tap water left to sit for 30 minutes)

---

## Day 1 — The First Feed

Mix together:
- **50g flour** (whole wheat or all-purpose, or half and half)
- **50g water** at room temperature

Stir vigorously until no dry flour remains. Cover loosely (not airtight — it needs airflow) and leave at room temperature (ideally 21–24°C / 70–75°F).

---

## Days 2–7 — Daily Feeding

Each day, discard all but **50g of your starter**, then feed it:
- **50g flour**
- **50g water**

Stir well, cover loosely, leave at room temperature.

**What you'll see:**
- Days 1–2: May not do much. That's normal.
- Days 2–4: Bubbles, possibly some rise. Might smell quite sour or even unpleasant — that's normal. Unwanted bacteria are dying off.
- Days 5–7: Consistent bubbles, a pleasant tangy/yeasty smell, and regular rise and fall between feedings. This is a healthy, active starter.

---

## Is It Ready to Bake With?

Your starter is ready when it:
1. **Doubles in size** within 4–8 hours of feeding
2. Has a domed top at peak rise
3. Smells pleasantly tangy and yeasty (not acetone or unpleasant)
4. Passes the **float test** — drop a small spoonful in water; if it floats, it's ready

---

## Maintaining Your Starter Long-Term

**Baking regularly (a few times a week):** Keep on the counter, feed once or twice daily.

**Baking occasionally:** Store in the fridge, feed once a week. Take it out the night before you want to bake, feed it, and let it peak before using.

**Going away?** Feed it well, put it in the fridge. It'll be fine for 2–3 weeks unfed. When you return, pour off most of it, feed twice at room temperature, and it'll bounce back.

---

## Troubleshooting

- **Liquid on top (hooch):** Grey/brown liquid means it's hungry. Pour it off and feed immediately.
- **Pink or orange streaks:** Discard everything and start fresh. This is contamination.
- **Not rising after a week:** Try a warmer spot, switch to whole wheat flour, or try a different water source.

---

Have questions about your starter? Post them in the **Troubleshooting** category — include your flour type, water type, temperatures, and a photo if you can. We'll help you figure it out.

*— Arva Flour Mills*

🔗 [Explore our flour options](https://arvaflourmills.com/pages/flour-guide)`,
  1 // pinned
);

createThread(
  'Your First Sourdough Loaf — A Step-by-Step Walkthrough',
  newBakersId,
  `You have an active starter. Now it's time to bake your first loaf. This walkthrough is designed to be clear, forgiving, and achievable — follow it closely the first time, then start experimenting once you understand how everything works together.

---

## Ingredients

- **450g Arva All-Purpose or Bread Flour** (or a blend — 400g all-purpose + 50g whole wheat adds flavour)
- **325g water** (72% hydration — manageable for beginners)
- **100g active starter** (fed 4–8 hours ago, at or just past peak)
- **9g salt**

---

## Schedule Overview

This is a same-day bake if you start in the morning, or an overnight cold proof if you prefer to bake in the morning.

| Step | Time |
|------|------|
| Mix dough | Day 1, morning |
| Stretch & fold | Every 30 min × 4 |
| Bulk fermentation | 4–6 hours total |
| Shape | After bulk |
| Cold proof | Overnight in fridge |
| Bake | Day 2 morning |

---

## Step 1 — Autolyse (30 min)

Mix flour and water together until no dry flour remains. Cover and rest 30 minutes. This hydrates the flour and begins gluten development before you even add the starter.

## Step 2 — Add Starter and Salt

Add starter and salt to the dough. Mix thoroughly — squeeze it through your fingers until fully incorporated. The dough will feel shaggy and sticky. That's fine.

## Step 3 — Stretch and Fold (2 hours)

Every 30 minutes for the first 2 hours, perform a set of stretch and folds: grab one side of the dough, stretch it up as high as it will go without tearing, and fold it over the top. Rotate the bowl 90° and repeat 3 more times. Cover and rest.

After 4 sets your dough should feel noticeably smoother, more elastic, and less sticky.

## Step 4 — Bulk Fermentation (continue 2–4 more hours)

Leave the dough covered at room temperature. You're waiting for it to increase in volume by 50–75% and develop a slightly domed top with bubbles visible on the sides and surface.

**Time varies with temperature.** A warm kitchen (24°C) = faster (4–5 hrs total). A cool kitchen (20°C) = slower (6–8 hrs total). Don't go by the clock — go by feel and look.

## Step 5 — Pre-shape and Bench Rest (20 min)

Turn the dough out onto an unfloured surface. Using a bench scraper, fold the edges under to create surface tension. Let it rest uncovered for 20 minutes.

## Step 6 — Final Shape

Flour your banneton (proofing basket) or a bowl lined with a well-floured towel. Shape the dough — fold the edges into the centre, then flip it over and use the bench scraper to drag it toward you, building tension on the bottom surface. Place it seam-side up in the banneton.

## Step 7 — Cold Proof (overnight)

Cover with plastic wrap or a shower cap and refrigerate overnight (8–16 hours). Cold fermentation develops flavour and makes the dough easier to score.

## Step 8 — Bake

Preheat your oven to 250°C (500°F) with a Dutch oven inside for 45–60 minutes.

1. Turn cold dough out onto parchment paper
2. Score the top with a lame or sharp knife (one confident slash at 45°)
3. Lift into the hot Dutch oven using the parchment
4. **Bake covered: 20 minutes** (steam = oven spring and crust development)
5. **Remove lid, reduce to 230°C (450°F): bake 20–25 more minutes** until deep golden brown

Cool on a wire rack for **at least 1 hour** before cutting. The crumb is still setting. Cutting too early = gummy interior.

---

## What to Expect

Your first loaf probably won't look like the ones on Instagram. That's completely normal and it will still taste incredible. Look at it as data: was it under or over-fermented? Too dense? Great flavour? Post a photo in this forum and we'll help you read what happened and improve on your next bake.

*— Arva Flour Mills*`,
  1 // pinned
);

createThread(
  'Reading Your Crumb — What Your Loaf Is Telling You',
  newBakersId,
  `The crumb — the interior texture of your baked loaf — is a map of everything that happened during fermentation and baking. Once you learn to read it, every loaf teaches you something.

---

## The Ideal Crumb (and What "Ideal" Actually Means)

First, let's reframe the goal. An open, holey crumb (like you see in bakery photos) is beautiful but it's not the only measure of a good loaf. A tighter, more even crumb is perfectly correct for sandwich bread. What you're looking for is:
- Even bubbles throughout (not all on one side)
- No large gummy or dense patches
- Fully baked through (not wet or doughy)
- Consistent texture from edge to edge

---

## What Your Crumb Is Telling You

**Dense with very few bubbles:**
The dough was underfermented, or your starter wasn't active enough. Give bulk fermentation more time, or check your starter — it should double within 4–8 hours of feeding before use.

**Large irregular holes + gummy dense patches:**
Classic underfermentation. The structure is uneven because fermentation was incomplete. More bulk time needed.

**Dense, gummy, slightly wet texture throughout:**
Overfermented or underbaked. If overfermented, the gluten breaks down and can't hold gas. If underbaked, the crumb hasn't fully set — bake longer with the lid off.

**Even, tight crumb (sandwich-bread style):**
This is often correct — especially with higher whole grain content or lower hydration. Not a problem unless you were aiming for an open crumb.

**Tunnelling (one large hole running through the middle):**
Usually a shaping issue — air got trapped during the final shape. Focus on degassing gently before shaping.

**Torn or collapsed looking:**
Overproofed. The dough exhausted its gas-holding capacity before baking.

---

## The Fastest Way to Improve

Keep a simple bake log: date, flour, hydration, bulk fermentation time and temperature, and a photo of the crumb. After 5–6 bakes you'll start to see your own patterns clearly.

Post your crumb photos in this forum — experienced bakers can often diagnose a fermentation issue from a photo in seconds.

*— Arva Flour Mills*`,
  1 // pinned
);

createThread(
  'What to Do With Your Discard (and Why You Should Save It)',
  newBakersId,
  `If you're maintaining a sourdough starter, you're producing discard every day — the portion you remove before each feeding. Most beginners throw it away. Once you realize what you can make with it, you'll never waste it again.

---

## What Is Discard?

Discard is starter that hasn't been fed recently — it's less active and won't raise a loaf on its own, but it's full of flavour: tangy, complex, slightly yeasty. It adds remarkable depth to baked goods that use chemical leavening (baking powder or baking soda) instead of relying on the starter for rise.

---

## How to Store It

Keep discard in a separate jar in the fridge. It keeps well for **up to 2 weeks**. Add to it every time you feed your starter. When you have 200–300g, you have enough for most discard recipes.

The older the discard, the more sour and pronounced the flavour. Fresh discard (same day) is mild; week-old discard is quite tangy. Both are useful — it depends on the recipe.

---

## What You Can Make With It

**Quick and easy (under 30 minutes):**
- Sourdough pancakes or waffles — fluffier and more flavourful than regular ones
- Sourdough crackers — thin, crispy, and endlessly customizable with seeds and herbs
- Sourdough flatbread — great with soup or as a pizza base

**Baking projects:**
- Sourdough banana bread
- Sourdough chocolate chip cookies
- Sourdough muffins
- Sourdough pizza dough (with added yeast)
- Sourdough cinnamon rolls

**Savoury uses:**
- Sourdough crepes
- Sourdough onion rings batter
- Sourdough pasta

---

## Find Arva Discard Recipes

Head over to the **Discard Recipes** category on this forum for recipes using Arva flour. We'll be adding new ones regularly — and we'd love for you to share your own favourites.

*— Arva Flour Mills*`,
  1 // pinned
);

// ─── 4. DISCARD RECIPES category content ──────────────────────────────────────

console.log("\n── Discard Recipes threads ──");

createThread(
  'Sourdough Discard Pancakes — Light, Tangy, and Perfect Every Time',
  discardId,
  `These are genuinely the best pancakes you'll ever make. The discard adds a subtle tang and depth that regular pancakes simply don't have, and the batter comes together in minutes.

---

## Ingredients (serves 2–3, about 8 pancakes)

- **150g sourdough discard** (any age, straight from the fridge is fine)
- **120ml milk** (whole milk preferred, but any milk works)
- **1 large egg**
- **1 tbsp melted butter or neutral oil**, plus extra for the pan
- **1 tsp vanilla extract**
- **1 tbsp maple syrup or sugar**
- **120g Arva All-Purpose Flour**
- **1 tsp baking powder**
- **½ tsp baking soda**
- **Pinch of salt**

---

## Instructions

1. In a large bowl, whisk together discard, milk, egg, melted butter, vanilla, and sugar until smooth.
2. In a separate bowl, whisk together flour, baking powder, baking soda, and salt.
3. Add dry ingredients to wet and fold gently — **do not overmix**. A few lumps are fine. Overmixing makes tough pancakes. Let batter rest 5 minutes.
4. Heat a skillet or griddle over medium heat. Brush lightly with butter.
5. Pour about ¼ cup batter per pancake. Cook until bubbles form on the surface and edges look set (about 2–3 minutes), then flip and cook 1–2 minutes more.
6. Serve immediately with maple syrup, fresh fruit, or whatever you love.

---

## Tips

- **Older, more sour discard** = more tang. Adjust to taste.
- Add blueberries, chocolate chips, or sliced banana directly to the batter before cooking.
- Leftover batter keeps in the fridge overnight — give it a gentle stir before using.
- Use **Arva Whole Wheat Flour** for half the flour amount for a heartier, nuttier pancake.

---

*Made this recipe? Share a photo below — we'd love to see your stack!*

*Uses: [Arva All-Purpose Flour](https://arvaflourmills.com/products/all-purpose-flour)*`,
  1 // pinned
);

createThread(
  'Sourdough Discard Crackers — Crispy, Seeded, and Endlessly Customizable',
  discardId,
  `These crackers use up a good amount of discard in one go, take about 30 minutes start to finish, and taste far better than anything from a box. Serve with cheese, soup, or just eat them plain.

---

## Ingredients (makes about 40 crackers)

- **200g sourdough discard**
- **60g Arva All-Purpose Flour**
- **40g melted butter or olive oil**
- **½ tsp salt**
- **Optional toppings:** sesame seeds, flax seeds, poppy seeds, everything bagel seasoning, dried rosemary, flaky sea salt

---

## Instructions

1. Preheat oven to 175°C (350°F). Line a large baking sheet with parchment.
2. Mix discard, flour, butter/oil, and salt together until a cohesive dough forms.
3. Transfer dough to the parchment-lined baking sheet. Place another sheet of parchment on top and roll the dough as thin as possible — aim for about 2mm. The thinner, the crispier.
4. Remove the top parchment. Sprinkle with your chosen toppings and press lightly to adhere.
5. Score the dough into cracker shapes with a pizza cutter or knife — squares, rectangles, whatever you like.
6. Bake 25–35 minutes until golden and crisp. Check at 20 minutes — thin edges will crisp faster than the centre.
7. Cool completely on the pan — they crisp up further as they cool.

---

## Variations

- **Whole wheat version:** Replace all-purpose with Arva Whole Wheat for a nuttier flavour
- **Cheesy crackers:** Stir 50g finely grated parmesan into the dough
- **Herb crackers:** Add 1 tsp dried thyme or rosemary to the dough itself
- **Spicy crackers:** Add ½ tsp cayenne or a pinch of chili flakes

---

## Storage

Keep in an airtight container at room temperature for up to 5 days. If they soften, re-crisp in a 160°C oven for 5 minutes.

*Share your cracker photos below — we'd especially love to see creative topping combinations!*

*Uses: [Arva All-Purpose Flour](https://arvaflourmills.com/products/all-purpose-flour) or [Arva Whole Wheat](https://arvaflourmills.com/products/whole-wheat-flour)*`,
  1 // pinned
);

createThread(
  'Sourdough Discard Banana Bread — Moist, Tangy, and Perfect for Overripe Bananas',
  discardId,
  `Two pantry problems solved at once — overripe bananas and accumulated discard. This banana bread is deeply moist, slightly tangy from the starter, and completely satisfying.

---

## Ingredients (one 9×5 loaf)

- **3 very ripe bananas** (about 300g peeled), mashed
- **150g sourdough discard**
- **2 large eggs**
- **100g butter**, melted and cooled
- **150g brown sugar** (or 130g if your bananas are very sweet)
- **1 tsp vanilla extract**
- **250g Arva All-Purpose Flour**
- **1 tsp baking soda**
- **½ tsp salt**
- **1 tsp cinnamon**
- **Optional:** 100g chopped walnuts or chocolate chips

---

## Instructions

1. Preheat oven to 175°C (350°F). Grease a 9×5 loaf pan.
2. In a large bowl, mash bananas well. Whisk in discard, eggs, melted butter, sugar, and vanilla until combined.
3. Add flour, baking soda, salt, and cinnamon. Fold until just combined — do not overmix.
4. Fold in walnuts or chocolate chips if using.
5. Pour into prepared pan. Bake 55–65 minutes, until a toothpick inserted in the centre comes out clean.
6. Cool in pan 10 minutes, then turn out onto a rack. Cool at least 30 minutes before slicing.

---

## Tips

- Very ripe (black-spotted) bananas = sweeter, more flavourful bread. This is the ideal use for bananas you'd otherwise throw out.
- The discard flavour is subtle here — the banana is the dominant flavour. Older, more sour discard adds a pleasant complexity.
- Freezes beautifully — slice before freezing for easy grab-and-go portions.

*Share your loaf below!*

*Uses: [Arva All-Purpose Flour](https://arvaflourmills.com/products/all-purpose-flour)*`,
  0
);

// ─── 5. BAKE JOURNALS category content ────────────────────────────────────────

console.log("\n── Bake Journal threads ──");

createThread(
  '📖 How to Use This Category — Your Personal Bake Journal',
  bakeJournalId,
  `Welcome to the Bake Journals category — one of the most valuable things you can do as a developing baker is keep a record of your bakes.

---

## How It Works

**Start one thread with your name** (e.g., "Sarah's Bake Journal" or "Mark's Bake Log") and add to it over time. Every time you bake, post a quick entry: what you made, what you changed, what happened, and a photo if you have one.

Over time this becomes an invaluable personal record — you'll see your own progression, identify recurring patterns, and have a searchable log of every experiment you've tried.

---

## What to Include in Each Entry

There's no rigid format — write what's useful to you. Some ideas:

- **Date and recipe**
- **Flour used** (which Arva flour, blend percentages)
- **Hydration** (water as % of flour weight)
- **Starter health** — how long since last feed, how active
- **Bulk fermentation** — time and temperature
- **What changed** from last time
- **Result** — what worked, what didn't
- **Photo** — crumb shot especially useful
- **What to try next time**

---

## Why This Matters

The difference between a baker who improves quickly and one who stays stuck is almost always the bake journal. When something goes wrong (and it will), you can trace back exactly what changed. When something goes beautifully right, you can repeat it.

The Fresh Loaf community — one of the oldest sourdough forums on the internet — has bakers who've kept journals going for 15+ years. It's a remarkable thing to look back on.

---

**To start your journal:** Create a new thread in this category with your name in the title. We'll look forward to following your progress.

*— Arva Flour Mills*`,
  1 // pinned
);

// ─── 6. MAY GROUP BAKE thread ─────────────────────────────────────────────────

console.log("\n── May Group Bake thread ──");

// Get sourdough-recipes category id
const sourdoughRecipesCatId = db.prepare("SELECT id FROM categories WHERE slug = 'sourdough-recipes'").get().id;

createThread(
  '🍞 May Group Bake — Classic Sourdough Loaf',
  sourdoughRecipesCatId,
  `Welcome to our first Arva Community Group Bake — and we're kicking it off with the one that started it all for most of us: the Classic Sourdough Loaf.

---

## The Challenge

Bake the Classic Sourdough Loaf this month using **Arva flour**. Share your results here — photos, notes, questions, wins, and honest failures all welcome. There are no judging criteria and no pressure. This is purely about baking together and learning from each other.

---

## The Recipe

Find the full pinned recipe in the **Sourdough Recipes** category: [Classic Sourdough Bread](#)

Or use your own favourite sourdough loaf recipe — the point is to bake, share, and compare notes as a community.

---

## Why This Recipe?

The Classic Sourdough Loaf is the foundation. Every variation — the high-hydration batards, the seeded loaves, the enriched doughs — starts here. Understanding this one deeply makes everything else easier.

It's also genuinely challenging to make consistently, even for experienced bakers. Fermentation timing, shaping, scoring, oven temperatures — there are a dozen variables. Baking it alongside a community and comparing results is one of the fastest ways to improve.

---

## How to Participate

1. Bake the loaf any time this month (May 2026)
2. Post a reply below with your results — a photo, a few notes on what you changed or tried, and how it came out
3. Ask questions, offer tips, and celebrate each other's bakes

---

## A few things to tell us in your post:

- Which Arva flour did you use?
- Any modifications to the recipe?
- How did your bulk fermentation go?
- Crumb photo if you have one
- One thing you'd do differently next time

---

We'll run a group bake every month with a different recipe. This is a great way to build your skills and get to know fellow community members.

Let's bake. 🌾

*— Arva Flour Mills*`,
  1 // pinned
);

console.log("\n✅ All forum improvements seeded successfully.\n");
db.close();
