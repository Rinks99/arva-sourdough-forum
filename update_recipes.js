// Recipe format update script
// - Weight-first format: grams first, then volume in parentheses
// - Replace "Arva All-Purpose Flour" variants → "Daisy Hard Unbleached Flour (All Purpose)"
// - Update both DB and storage.ts

const Database = require('better-sqlite3');
const db = new Database('/home/user/workspace/arva-sourdough-forum/forum.db');

// ============================================================
// POST 5 — Sourdough Sandwich Bread (All Purpose) [thread 4]
// Already weight-only → add volume parens
// ============================================================
const post5Content = `Soft, tender, buttery with a hint of sweetness — perfect for toast and sandwiches.

Full recipe: https://arvaflourmills.com/blogs/recipes/basic-all-purpose-sourdough-sandwich-bread

Yield: 1 loaf | Prep: 25 min | Bake: 55 min

INGREDIENTS
- 430g (3½ cups) Arva Daisy Unbleached Hard Flour
- 180g (¾ cup) water
- 100g (⅖ cup / 6½ tbsp) milk
- 100g (⅖ cup / 6½ tbsp) ripe starter
- 56g (¼ cup) unsalted butter, softened
- 25g (2 tbsp) sugar
- 8g (1⅓ tsp) salt

INSTRUCTIONS
Feed starter 3–6 hours before mixing. Combine all dough ingredients and mix thoroughly. Bulk ferment until doubled (~5 hours). Shape into sandwich loaf and place in a greased 8.5x4.5" pan. Rise until doubled. Bake at 375°F for 55 minutes, turning halfway. Internal temp 190°F. Brush warm crust with butter.`;

// ============================================================
// POST 6 — Einkorn Sourdough Bread [thread 5]
// Volume only → full conversion
// 5 cups whole grain einkorn = 5 × 120g = 600g
// 1¼ cup water = 300g
// 1 cup sourdough starter = 240g
// 1.5 tsp salt = 9g
// ============================================================
const post6Content = `Wonderfully fluffy with a chewy interior. Einkorn is an ancient wheat with easier digestibility.

Full recipe: https://arvaflourmills.com/blogs/recipes/einkorn-sourdough-bread

Yield: 1 loaf | Prep: 5 min | Bake: 45 min

INGREDIENTS
- 600g (5 cups) whole grain einkorn flour
- 300g (1¼ cups) water
- 240g (1 cup) sourdough starter
- 9g (1½ tsp) salt

INSTRUCTIONS
1. Feed starter 4–12 hours before starting.
2. Mix flour, starter, salt, and water. Rest 15 minutes. Stretch and fold.
3. Repeat stretch-and-fold 3 sets total, 20 minutes apart.
4. Rise until doubled (3–12 hours depending on temperature).
5. Shape, place in floured banneton, refrigerate overnight.
6. Preheat oven to 450°F with Dutch oven inside.
7. Score and bake: lid on 30 min, lid off 15 min.`;

// ============================================================
// POST 7 — Sourdough Einkorn Pizza Dough [thread 6]
// Volume only → full conversion
// 6 cups all-purpose einkorn = 6 × 120g = 720g
// 2 tsp fine sea salt = 12g
// 1 tsp dried oregano = 1g (keep as 1 tsp — herb, not worth converting)
// ½ tsp dried basil = keep as ½ tsp
// ¼ tsp crushed red pepper = keep as ¼ tsp
// 2 Tbsp olive oil = 30mL (28g)
// ¼ cup sourdough starter = 60g
// 1½ cups water = 360g
// ============================================================
const post7Content = `Einkorn makes an exceptional sourdough pizza crust with bright, complex flavour.

Full recipe: https://arvaflourmills.com/blogs/recipes/sourdough-einkorn-pizza

INGREDIENTS (makes 2 pizza crusts)
- 720g (6 cups) all-purpose einkorn flour
- 12g (2 tsp) fine sea salt
- 1 tsp dried oregano
- ½ tsp dried basil
- ¼ tsp crushed red pepper flakes
- 28g (2 tbsp) extra virgin olive oil
- 60g (¼ cup) sourdough starter
- 360g (1½ cups) water

INSTRUCTIONS
1. Whisk dry ingredients together.
2. Add olive oil, starter, and water. Mix to a shaggy dough.
3. Cover tightly, leave 12 hours until doubled.
4. Knead 10 minutes. Rest 15 minutes.
5. Heat oven to 425°F. Divide into 2 balls, roll to ¼ inch thick.
6. Par-bake 10 min. Add toppings. Bake 10–12 min more.`;

// ============================================================
// POST 9 — Whole Emmer Sourdough Bread [thread 8]
// Already weight-only → add volume parens
// 530g whole emmer flour ≈ 530/120 = ~4⅓ cups → use 4½ cups (conservative)
// 8g salt = ~1⅓ tsp → use 1⅓ tsp
// 360g water = 1½ cups
// 75g honey = ~3½ tbsp (honey is ~21g/tbsp)
// 80g active starter = ⅓ cup
// ============================================================
const post9Content = `A slightly sweet loaf with a delicate nutty flavour — perfect with cream cheese or jam.

Full recipe: https://arvaflourmills.com/blogs/recipes/whole-emmer-sourdough-bread

INGREDIENTS
- 530g (4½ cups) whole emmer flour
- 8g (1⅓ tsp) salt
- 360g (1½ cups) water
- 75g (3½ tbsp) honey
- 80g (⅓ cup) active starter

INSTRUCTIONS
1. Combine flour and salt. Mix water, starter, and honey separately. Combine wet and dry.
2. Rest 1 hour.
3. Perform four stretch-and-fold sets over the second hour.
4. Ferment 6–12 additional hours.
5. Shape and place in proofing basket. Refrigerate 10–20 hours.
6. Preheat Dutch oven to 450°F. Flip dough in, score.
7. Bake: lid on 35 min, lid off 10 min until internal temp reaches 205°F.`;

// ============================================================
// POST 10 — Sourdough Rye Bread [thread 9]
// Volume only → full conversion
// 2 cups dark rye flour = 2 × 102g = 204g
// 1 cup bread flour = 120g
// 1 tsp salt = 6g
// ½ cup sourdough starter = 120g
// ½ tsp sugar = 2g
// ¾ cup warm water = 180g
// ============================================================
const post10Content = `From the Arva Flour Mills Recipe Cookbook.

Download: https://arvaflourmills.com/blogs/news/bake-with-arva-the-arva-flour-mills-recipe-cookbook

INGREDIENTS
- 204g (2 cups) Dark Rye Flour
- 120g (1 cup) bread flour
- 6g (1 tsp) salt
- 120g (½ cup) sourdough starter
- 2g (½ tsp) sugar
- 180g (¾ cup) warm water

INSTRUCTIONS
1. Combine rye flour, bread flour, salt, and sugar.
2. Add starter and warm water, mix until a dough forms.
3. Knead 10 minutes until smooth and elastic.
4. Rise 4–6 hours or until doubled.
5. Shape into a round loaf, rise 1–2 hours.
6. Bake at 375°F for 35–40 minutes until golden.
7. Cool completely before slicing.`;

// ============================================================
// POST 11 — Classic Red Fife Sourdough [thread 10]
// Volume only → full conversion
// 2 cups Whole Red Fife Flour = 2 × 120g = 240g
// 1 cup bread flour = 120g
// ½ cup active sourdough starter = 120g
// 1 tsp salt = 6g
// ¾ cup warm water = 180g
// ============================================================
const post11Content = `From Chapter 6 of the Arva Flour Mills Recipe Cookbook.

Download: https://arvaflourmills.com/blogs/news/bake-with-arva-the-arva-flour-mills-recipe-cookbook

INGREDIENTS
- 240g (2 cups) Whole Red Fife Flour
- 120g (1 cup) bread flour
- 120g (½ cup) active sourdough starter
- 6g (1 tsp) salt
- 180g (¾ cup) warm water

INSTRUCTIONS
1. Mix flours. Add starter, salt, and warm water. Mix to a sticky dough.
2. Rest 30 minutes. Perform four stretch-and-folds at 30-minute intervals.
3. Ferment 4–6 hours until doubled.
4. Shape into a boule, place in floured proofing basket, refrigerate overnight.
5. Preheat Dutch oven to 475°F.
6. Bake: covered 20 min, uncovered 25 min until golden brown.
7. Cool completely before slicing.`;

// ============================================================
// POST 21 — How to Start and Maintain a Sourdough Starter [thread 20]
// Just fix flour name references
// ============================================================
const post21Content = `Your starter is a living culture of wild yeast and beneficial bacteria — it's the heart of every sourdough loaf you'll ever make. Here's how to get one going with Arva flour.

---

## What You Need

- A clean glass jar (500 mL or larger)
- Kitchen scale (measuring by weight is far more reliable than volume)
- **Daisy Hard Unbleached Flour (All Purpose) or Whole Wheat Flour** — whole wheat gets things going faster because of the bran's natural wild yeast
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

🔗 [Explore our flour options](https://arvaflourmills.com/pages/flour-guide)`;

// ============================================================
// POST 25 — Sourdough Discard Pancakes [thread 24]
// Fix flour name + add volume to 120g flour
// 120g flour ≈ 1 cup
// Also fix the "Uses:" link at bottom
// ============================================================
const post25Content = `These are genuinely the best pancakes you'll ever make. The discard adds a subtle tang and depth that regular pancakes simply don't have, and the batter comes together in minutes.

---

## Ingredients (serves 2–3, about 8 pancakes)

- **150g sourdough discard** (any age, straight from the fridge is fine)
- **120ml milk** (whole milk preferred, but any milk works)
- **1 large egg**
- **1 tbsp melted butter or neutral oil**, plus extra for the pan
- **1 tsp vanilla extract**
- **1 tbsp maple syrup or sugar**
- **120g (1 cup) Daisy Hard Unbleached Flour (All Purpose)**
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

*Uses: [Daisy Hard Unbleached Flour (All Purpose)](https://arvaflourmills.com/products/all-purpose-flour)*`;

// ============================================================
// POST 26 — Sourdough Discard Crackers [thread 25]
// Fix flour name + add volume to 60g flour
// 60g all-purpose flour ≈ ½ cup
// ============================================================
const post26Content = `These crackers use up a good amount of discard in one go, take about 30 minutes start to finish, and taste far better than anything from a box. Serve with cheese, soup, or just eat them plain.

---

## Ingredients (makes about 40 crackers)

- **200g sourdough discard**
- **60g (½ cup) Daisy Hard Unbleached Flour (All Purpose)**
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

*Uses: [Daisy Hard Unbleached Flour (All Purpose)](https://arvaflourmills.com/products/all-purpose-flour) or [Arva Whole Wheat](https://arvaflourmills.com/products/whole-wheat-flour)*`;

// ============================================================
// POST 27 — Sourdough Discard Banana Bread [thread 26]
// Fix flour name + add volume to 250g flour
// 250g all-purpose flour ≈ 2 cups (250/120 = 2.08)
// ============================================================
const post27Content = `Two pantry problems solved at once — overripe bananas and accumulated discard. This banana bread is deeply moist, slightly tangy from the starter, and completely satisfying.

---

## Ingredients (one 9×5 loaf)

- **3 very ripe bananas** (about 300g peeled), mashed
- **150g sourdough discard**
- **2 large eggs**
- **100g butter**, melted and cooled
- **150g brown sugar** (or 130g if your bananas are very sweet)
- **1 tsp vanilla extract**
- **250g (2 cups) Daisy Hard Unbleached Flour (All Purpose)**
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

*Uses: [Daisy Hard Unbleached Flour (All Purpose)](https://arvaflourmills.com/products/all-purpose-flour)*`;

// ============================================================
// Execute DB updates
// ============================================================
const updates = [
  { id: 5,  label: 'Sandwich Bread (post 5)',   content: post5Content },
  { id: 6,  label: 'Einkorn Sourdough (post 6)', content: post6Content },
  { id: 7,  label: 'Einkorn Pizza (post 7)',      content: post7Content },
  { id: 9,  label: 'Whole Emmer (post 9)',         content: post9Content },
  { id: 10, label: 'Sourdough Rye (post 10)',      content: post10Content },
  { id: 11, label: 'Classic Red Fife CB (post 11)', content: post11Content },
  { id: 21, label: 'Starter Guide (post 21)',      content: post21Content },
  { id: 25, label: 'Pancakes (post 25)',           content: post25Content },
  { id: 26, label: 'Crackers (post 26)',           content: post26Content },
  { id: 27, label: 'Banana Bread (post 27)',       content: post27Content },
];

const stmt = db.prepare('UPDATE posts SET content = ?, updated_at = ? WHERE id = ?');
const now = new Date().toISOString();

for (const u of updates) {
  const result = stmt.run(u.content, now, u.id);
  console.log(`✓ Updated post ${u.id} (${u.label}): ${result.changes} row(s) changed`);
}

// Verify
console.log('\n=== VERIFICATION ===');
for (const u of updates) {
  const post = db.prepare('SELECT content FROM posts WHERE id = ?').get(u.id);
  const hasWeight = /\d+g/.test(post.content);
  const hasDaisy = post.content.includes('Daisy Hard Unbleached') || !post.content.includes('Arva All-Purpose');
  console.log(`Post ${u.id}: weight format=${hasWeight}, no old brand=${hasDaisy}`);
}

db.close();
console.log('\nAll DB updates complete.');
