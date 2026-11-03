/* =========================================================
   Puff's brain — a curated pet-care knowledge base.
   No API, no server: js/assistant.js matches questions
   against these intents right in the browser.

   Editing tips
   - keys:     words/phrases that strongly signal the topic
   - weak:     words that hint at it (count for less)
   - patterns: regexes tested on the normalized question
   - only:     limit an intent to certain species
   Phrases are written normalized: lowercase, no apostrophes
   ("wont eat", not "won't eat").
   ========================================================= */
(() => {
  const plural = { cat: 'cats', dog: 'dogs', rabbit: 'rabbits' };
  const single = { cat: 'cat', dog: 'dog', rabbit: 'bunny' };
  const pets = (sp) => plural[sp] || 'pets';
  const pet = (sp) => single[sp] || 'pet';
  const by = (sp, map) => map[sp] || map.any;

  /* ---------- species words (incl. popular breeds) ---------- */
  const species = {
    cat: ['cat', 'kitten', 'kitty', 'feline', 'persian', 'siamese', 'ragdoll', 'maine coon', 'bengal', 'sphynx',
      'british shorthair', 'scottish fold', 'tabby'],
    dog: ['dog', 'puppy', 'pup', 'doggo', 'canine', 'husky', 'labrador', 'lab', 'retriever', 'poodle', 'beagle', 'bulldog',
      'corgi', 'shiba', 'pug', 'chihuahua', 'terrier', 'shepherd', 'dachshund', 'pomeranian', 'schnauzer', 'spaniel',
      'collie', 'rottweiler', 'doberman', 'shih tzu', 'maltese', 'greyhound', 'samoyed', 'akita'],
    rabbit: ['rabbit', 'bunny', 'bun', 'holland lop', 'lionhead', 'netherland dwarf'],
  };

  /* ---------- foods: "can my pet eat X?" ----------
     verdicts: safe | caution | avoid | toxic          */
  const foods = [
    { names: ['grape', 'raisin', 'sultana', 'currant'], label: 'Grapes and raisins', plural: true,
      any: ['toxic', 'Even a small amount can cause sudden kidney failure in dogs, and cats should avoid them too.'],
      rabbit: ['caution', 'A single grape now and then is generally considered okay for rabbits, but fruit is sugary — keep it a rare treat, and skip raisins.'] },
    { names: ['chocolate', 'cocoa', 'brownie'], label: 'Chocolate',
      any: ['toxic', 'It contains theobromine and caffeine, which can cause vomiting, a racing heart, tremors and seizures. Dark and baking chocolate are the most dangerous.'] },
    { names: ['onion', 'garlic', 'leek', 'chive', 'shallot'], label: 'Onions and garlic', plural: true,
      any: ['toxic', 'Onions, garlic, leeks and chives (raw, cooked or powdered) damage red blood cells and can cause anaemia. Cats are especially sensitive.'] },
    { names: ['xylitol', 'chewing gum', 'sugar free gum', 'sweetener', 'birch sugar'], label: 'Xylitol',
      any: ['toxic', 'This sweetener — found in sugar-free gum, sweets and some peanut butters — can cause a dangerous drop in blood sugar and liver failure in dogs, even in tiny amounts. Keep it away from all pets.'] },
    { names: ['macadamia'], label: 'Macadamia nuts', plural: true,
      any: ['toxic', 'They can cause weakness, vomiting, tremors and fever in dogs. Best kept away from all pets.'] },
    { names: ['alcohol', 'beer', 'wine', 'vodka'], label: 'Alcohol',
      any: ['toxic', 'Even small amounts can cause vomiting, wobbliness, breathing problems and low blood sugar.'] },
    { names: ['coffee', 'caffeine', 'energy drink', 'tea'], label: 'Coffee and caffeine', plural: true,
      any: ['toxic', 'Caffeine can cause restlessness, a racing heart and tremors in pets.'] },
    { names: ['lily', 'lilies'], label: 'Lilies', plural: true,
      cat: ['toxic', 'Lilies are extremely toxic to cats — even licking pollen off their fur or drinking vase water can cause fatal kidney failure. Keep them out of any home with cats.'],
      any: ['caution', 'Lilies are most dangerous for cats (even the pollen can cause kidney failure). Some types, like lily of the valley, also affect dogs’ hearts, so keep them out of reach.'] },
    { names: ['avocado', 'guacamole'], label: 'Avocado',
      any: ['avoid', 'It’s very fatty and can upset tummies, and the pit is a choking and blockage risk.'],
      rabbit: ['toxic', 'Avocado contains persin, which is toxic to rabbits (and birds) and can cause breathing and heart problems.'] },
    { names: ['milk', 'dairy', 'ice cream', 'yogurt', 'yoghurt'], label: 'Milk and dairy', plural: false,
      cat: ['avoid', 'Most adult cats are lactose intolerant, so milk can cause an upset stomach and diarrhoea. Fresh water is all they need.'],
      dog: ['caution', 'A spoonful of plain, unsweetened yoghurt is usually fine, but many dogs struggle with lactose — milk and ice cream are best avoided.'],
      rabbit: ['avoid', 'Rabbits can’t digest dairy at all — stick to hay, greens and water.'],
      any: ['avoid', 'Many pets are lactose intolerant, so milk and ice cream often cause tummy trouble.'] },
    { names: ['cheese'], label: 'Cheese',
      any: ['caution', 'Small cubes are fine as an occasional training treat, but cheese is high in fat and salt — and some pets are lactose intolerant.'],
      rabbit: ['avoid', 'Rabbits are herbivores and can’t digest dairy.'] },
    { names: ['apple'], label: 'Apple',
      any: ['safe', 'Apple slices make a crunchy treat — just remove the core and seeds first.'],
      rabbit: ['caution', 'A small slice is a lovely occasional treat — no seeds, and keep fruit to a tiny part of their diet.'] },
    { names: ['banana'], label: 'Banana',
      any: ['caution', 'A few small pieces are fine as an occasional treat, but bananas are high in sugar.'] },
    { names: ['carrot'], label: 'Carrots', plural: true,
      dog: ['safe', 'Raw or cooked carrots are a great low-calorie, crunchy snack for dogs.'],
      cat: ['caution', 'Small pieces of cooked carrot are fine, though cats don’t really need veggies in their diet.'],
      rabbit: ['caution', 'Despite the cartoons, carrots are sugary for bunnies — offer only a small piece as an occasional treat. Hay and leafy greens are much better.'],
      any: ['safe', 'Plain carrots are a healthy, low-calorie snack for dogs; cats can nibble small cooked pieces.'] },
    { names: ['strawberry', 'blueberry', 'raspberry', 'berry', 'berries'], label: 'Berries', plural: true,
      any: ['safe', 'Fresh strawberries, blueberries and raspberries are fine in small amounts — wash them and cut big ones up.'] },
    { names: ['watermelon', 'melon'], label: 'Watermelon',
      any: ['safe', 'Seedless, rind-free watermelon is a hydrating summer treat in small amounts.'] },
    { names: ['cucumber'], label: 'Cucumber',
      any: ['safe', 'Cucumber is a crunchy, low-calorie treat — slice it into small pieces.'] },
    { names: ['pumpkin'], label: 'Pumpkin',
      any: ['safe', 'Plain cooked or canned pumpkin (not pie filling) is fibre-rich and can help with digestion.'],
      rabbit: ['caution', 'A small piece of fresh pumpkin is fine occasionally — no seeds.'] },
    { names: ['chicken', 'turkey'], label: 'Chicken',
      any: ['safe', 'Plain, cooked, boneless chicken or turkey is a great treat — no seasoning, skin or cooked bones.'],
      rabbit: ['avoid', 'Rabbits are herbivores — no meat, please.'] },
    { names: ['rice'], label: 'Rice',
      any: ['safe', 'Plain cooked rice is easy to digest and is often part of a bland diet for upset tummies.'],
      rabbit: ['avoid', 'Grains and starchy foods can upset a rabbit’s sensitive gut.'] },
    { names: ['egg'], label: 'Eggs', plural: true,
      any: ['safe', 'Cooked eggs are a good source of protein. Avoid raw eggs, which can carry salmonella.'],
      rabbit: ['avoid', 'Rabbits are herbivores — no eggs, meat or dairy.'] },
    { names: ['tuna', 'salmon', 'sardine', 'fish'], label: 'Fish',
      cat: ['caution', 'A little plain cooked fish is a tasty treat, but tuna shouldn’t be a regular meal — too much can cause nutritional imbalances.'],
      dog: ['safe', 'Plain cooked fish is fine in small amounts — remove every bone first.'],
      rabbit: ['avoid', 'Rabbits are herbivores — no fish.'],
      any: ['caution', 'Plain cooked, boneless fish is fine as an occasional treat, but not as a main meal.'] },
    { names: ['peanut butter', 'peanut'], label: 'Peanut butter',
      any: ['caution', 'Yes, in small amounts — but check the label: it must be xylitol-free, and unsalted is best.'],
      rabbit: ['avoid', 'Too fatty for rabbits — skip it.'] },
    { names: ['bread', 'toast', 'dough'], label: 'Bread',
      any: ['caution', 'Plain bread is okay in small bites but has little nutritional value. Raw yeast dough is dangerous — it can expand in the stomach.'],
      rabbit: ['avoid', 'Bread and other starchy foods can upset a rabbit’s gut.'] },
    { names: ['bone', 'bones'], label: 'Cooked bones', plural: true,
      any: ['avoid', 'Cooked bones can splinter and cause choking or internal injuries. Ask your vet about safe chew alternatives.'] },
    { names: ['lettuce', 'romaine', 'spinach', 'kale', 'parsley', 'coriander', 'cilantro'], label: 'Leafy greens', plural: true,
      rabbit: ['safe', 'Dark leafy greens like romaine, parsley and coriander are great daily foods for bunnies. Avoid iceberg lettuce — it has little nutrition and can upset their tummy.'],
      any: ['safe', 'Small amounts of leafy greens are fine, though cats and dogs don’t need many veggies.'] },
  ];

  const verdictRank = { safe: 0, caution: 1, avoid: 2, toxic: 3 };

  // ate: "my dog ate…" · worried: "is X toxic/bad…?" (flips the yes/no wording)
  const foodAnswer = (food, sp, { ate = false, worried = false } = {}) => {
    const pick = (s) => food[s] || food.any;
    let rows;
    if (sp) rows = [[sp, ...pick(sp)]];
    else {
      const d = pick('dog');
      const c = pick('cat');
      rows = d === c ? [[null, ...d]] : [['dog', ...d], ['cat', ...c]];
    }
    const worst = rows.map((r) => r[1]).sort((a, b) => verdictRank[b] - verdictRank[a])[0];
    const label = food.label.toLowerCase();
    const isAre = food.plural ? 'are' : 'is';
    const who = sp ? plural[sp] : 'cats and dogs';

    if (ate && worst === 'toxic') {
      return {
        urgent: true,
        p: [`${food.label} can be dangerous for ${who}. Please call your vet or a pet poison helpline now — even if your ${pet(sp)} seems fine, symptoms can be delayed and quick treatment makes a big difference.`],
        list: ['Note roughly how much they ate, and when', 'Keep any packaging to show the vet', 'Don’t try to make them vomit unless a vet tells you to'],
        tip: 'Puffin’s vet finder shows the nearest open clinic in one tap.',
        follow: [`Which foods are toxic to ${pets(sp)}?`],
      };
    }

    const head = {
      toxic: rows.length > 1 ? `${food.label} can be dangerous — here’s the breakdown:` : `${worried ? 'Yes' : 'No'} — ${label} ${isAre} toxic to ${who}.`,
      avoid: `Best not — ${label} ${isAre}n’t a good fit for ${who}.`,
      caution: 'A little is okay — with a few cautions.',
      safe: worried ? `Not at all — ${label} ${isAre} a safe treat for ${who} in moderation.` : `Yes! ${food.label} ${isAre} a safe treat for ${who} in moderation.`,
    }[worst];

    const p = rows.length > 1
      ? [head, ...rows.map(([s, , text]) => `For ${plural[s]}: ${text}`)]
      : [`${head} ${rows[0][2]}`];
    if (worst === 'toxic') p.push(`If your ${pet(sp)} has eaten some, call your vet straight away.`);

    return {
      p,
      tip: 'Save a list of safe treats in your pet’s Puffin profile so everyone at home knows the rules.',
      follow: [`Which foods are toxic to ${pets(sp)}?`, `What are healthy treats for my ${pet(sp)}?`],
    };
  };

  /* ---------- emergencies ---------- */
  const emergency = {
    keys: ['seizure', 'seizing', 'fitting', 'convulsion', 'convulsing', 'not breathing', 'cant breathe', 'struggling to breathe',
      'difficulty breathing', 'trouble breathing', 'choking', 'unconscious', 'unresponsive', 'collapsed', 'hit by a car',
      'hit by car', 'bleeding heavily', 'wont stop bleeding', 'broken leg', 'broken bone', 'swollen belly', 'bloated', 'bloat',
      'heatstroke', 'heat stroke', 'cant pee', 'straining to pee', 'not peeing', 'cant urinate', 'rat poison', 'antifreeze',
      'poisoned', 'snake bite', 'bitten by a snake', 'pale gums', 'blue gums', 'swallowed'],
    answer: (sp, n) => {
      const p = ['This sounds like it could be an emergency. Please contact your vet or the nearest emergency animal clinic right away — don’t wait to see if it gets better.'];
      if (/ (pee|urinate|peeing) /.test(n) && sp !== 'dog') p.push('A cat (especially a male) straining to pee with little or nothing coming out may have a blocked bladder, which can become life-threatening within a day.');
      if (/ (bloat|bloated|swollen belly) /.test(n)) p.push('In dogs, a swollen, tight belly with retching can mean bloat (GDV), which needs surgery fast.');
      if (/ (heatstroke|heat stroke) /.test(n)) p.push('Move them somewhere cool and offer water while you call — cool (not ice-cold) water on their body helps.');
      if (/ (poison|poisoned|antifreeze|swallowed) /.test(n)) p.push('If you can, call a pet poison helpline as well, and bring any packaging with you.');
      return {
        urgent: true,
        p,
        list: ['Keep your pet calm, warm and still', 'Don’t give human medicines', 'Call ahead so the clinic can prepare'],
        tip: 'Puffin’s vet finder shows the nearest open clinic and directions in one tap.',
        follow: [],
      };
    },
  };

  // "my dog ate…" — turns a food question into an urgent one when the food is toxic
  const ingested = / (ate|eaten|swallowed|got into|licked|chewed|stole|has had|drank|just had) /;
  // "is X toxic / bad for…?" — the answer starts with "Yes" instead of "No"
  const askedIfBad = / (toxic|poisonous|poison|dangerous|bad|harmful|unsafe) /;

  /* ---------- intents ---------- */
  const intents = [
    {
      id: 'vaccines',
      keys: ['vaccine', 'vaccination', 'vaccinate', 'vaccinated', 'shot', 'jab', 'booster', 'immunization', 'immunisation',
        'rabies', 'parvo', 'parvovirus', 'distemper', 'fvrcp', 'dhpp', 'leptospirosis', 'myxomatosis', 'kennel cough'],
      answer: (sp) => ({
        ...by(sp, {
          dog: {
            p: ['Puppies usually start their core vaccines at 6–8 weeks old, with boosters every 2–4 weeks until they’re about 16 weeks.'],
            list: ['Core vaccines: distemper, parvovirus, adenovirus (hepatitis) and rabies', 'Rabies: usually around 12–16 weeks, depending on local law', 'Boosters: at about 1 year, then every 1–3 years as your vet advises', 'Extras like leptospirosis or kennel cough depend on where you live and your dog’s lifestyle'],
          },
          cat: {
            p: ['Kittens usually start their core vaccines at 6–8 weeks old, with boosters every 3–4 weeks until about 16 weeks.'],
            list: ['Core vaccines: panleukopenia, herpesvirus and calicivirus (often combined as FVRCP)', 'Rabies: as required where you live', 'FeLV (feline leukaemia): recommended for kittens and cats who go outdoors', 'Boosters: at 1 year, then every 1–3 years'],
          },
          rabbit: {
            p: ['In many countries rabbits are vaccinated against myxomatosis and rabbit haemorrhagic disease (RHDV1 and RHDV2) — usually from around 5–10 weeks old, then with yearly boosters.', 'Availability varies by region, so ask a rabbit-savvy vet what’s recommended where you live.'],
          },
          any: {
            p: ['Cats and dogs both start their core vaccines young — usually at 6–8 weeks — with boosters every few weeks until about 16 weeks, then again at 1 year.'],
            list: ['Dogs: distemper, parvovirus, adenovirus and rabies', 'Cats: panleukopenia, herpesvirus, calicivirus — and rabies where required', 'Adults: boosters every 1–3 years, depending on the vaccine'],
          },
        }),
        tip: 'Puffin tracks every dose and reminds you before the next booster is due.',
        follow: ['How often should I deworm?', 'When should I spay or neuter?', 'Can Puffin remind me about vaccines?'],
      }),
    },
    {
      id: 'toxic-list',
      keys: ['toxic', 'poisonous', 'dangerous food', 'foods to avoid', 'human food', 'people food', 'table scraps'],
      weak: ['food', 'avoid', 'dangerous'],
      patterns: [/ (cant|cannot|shouldnt|should not|never|must not) .*\beat /],
      answer: (sp) => ({
        p: [`These common foods are dangerous for ${by(sp, { any: 'cats and dogs', cat: 'cats', dog: 'dogs', rabbit: 'rabbits' })}:`],
        list: by(sp, {
          rabbit: ['Avocado, chocolate, onions and garlic', 'Meat, eggs and dairy — rabbits are strict herbivores', 'Bread, crackers, cereal and other starchy snacks', 'Iceberg lettuce and lots of sugary fruit'],
          cat: ['Lilies — even the pollen (extremely toxic)', 'Onions, garlic, leeks and chives', 'Chocolate, caffeine and alcohol', 'Grapes and raisins', 'Dog flea treatments containing permethrin'],
          any: ['Grapes and raisins', 'Chocolate, caffeine and alcohol', 'Onions, garlic, leeks and chives', 'Xylitol (sugar-free gum, sweets, some peanut butters)', 'Macadamia nuts and cooked bones'],
        }),
        tip: 'Not sure about a specific food? Just ask — “Can my dog eat apples?”',
        follow: [`What are healthy treats for my ${pet(sp)}?`, `Can ${pets(sp)} eat chocolate?`],
      }),
    },
    {
      id: 'treats',
      keys: ['treat', 'snack', 'reward', 'healthy treat', 'healthy snack'],
      answer: (sp) => ({
        p: [by(sp, {
          rabbit: 'The best bunny treats are fresh herbs and leafy greens. Fruit is a sweet extra — think a blueberry or a thumbnail-sized piece of apple, a couple of times a week.',
          cat: 'Most cats love tiny pieces of plain cooked chicken, turkey or fish. Freeze-dried meat treats are great for training too.',
          any: 'Great everyday treats include carrot sticks, cucumber, apple slices (no seeds), blueberries and small pieces of plain cooked chicken.',
        })],
        list: ['Keep treats under about 10% of daily calories', 'Cut treats small — pets care about the reward, not the size', 'Skip anything salty, sugary, fatty or seasoned'],
        follow: [`Which foods are toxic to ${pets(sp)}?`, `How often should I feed my ${pet(sp)}?`],
      }),
    },
    {
      id: 'feeding',
      keys: ['feed', 'feeding', 'meal', 'breakfast', 'dinner', 'portion', 'kibble', 'diet', 'hay', 'pellet', 'how much food', 'wet food', 'dry food', 'what to feed'],
      weak: ['food', 'eat', 'hungry'],
      patterns: [/ (what|how much|how often) .*\b(eat|food|feed) /],
      answer: (sp) => ({
        ...by(sp, {
          dog: {
            p: ['Most adult dogs do well on 2 meals a day, about 8–12 hours apart. Puppies need 3–4 smaller meals a day until around 6 months old.'],
            list: ['Use the guide on the food bag as a starting point', 'Adjust portions to keep a visible waist and ribs you can feel', 'Treats should stay under about 10% of daily calories'],
          },
          cat: {
            p: ['Adult cats are happiest with at least 2 meals a day — many prefer several small ones. Kittens need 3–4 small meals a day until about 6 months.'],
            list: ['A mix of wet and dry food helps with hydration', 'Measure portions rather than free-feeding to prevent weight gain', 'Puzzle feeders make mealtime fun and slow down fast eaters'],
          },
          rabbit: {
            p: ['A bunny’s diet should be mostly hay — unlimited, fresh, every single day (around 80–85% of what they eat).'],
            list: ['A handful of leafy greens daily (romaine, coriander, parsley, basil)', 'A small, measured portion of plain pellets', 'Fruit and carrots only as occasional tiny treats', 'Fresh water at all times'],
          },
          any: {
            p: ['Most adult cats and dogs do well on 2 meals a day, while puppies and kittens need 3–4 smaller meals until around 6 months old.'],
            list: ['Measure portions using the food label as a starting point', 'Adjust based on body shape — you should feel ribs, not see them', 'Keep treats under about 10% of daily calories'],
          },
        }),
        tip: 'Set feeding-time reminders in Puffin so everyone at home knows whether your pet has already eaten.',
        follow: [`What are healthy treats for my ${pet(sp)}?`, `How much water should my ${pet(sp)} drink?`],
      }),
    },
    {
      id: 'appetite',
      keys: ['not eating', 'stopped eating', 'no appetite', 'lost appetite', 'loss of appetite', 'refusing food', 'off food', 'off their food', 'appetite'],
      patterns: [/ (wont|isnt|not|doesnt|stopped|refuses|refusing|hasnt) (\w+ ){0,3}(eat|eating|ate) /],
      answer: (sp) => ({
        ...by(sp, {
          cat: {
            p: ['A cat who hasn’t eaten for 24 hours should see a vet — cats can develop a serious liver condition (hepatic lipidosis) if they go without food for too long.'],
            list: ['Look for other signs: vomiting, hiding, drooling or lethargy', 'Try warming wet food slightly so it smells more tempting', 'Recent changes (new food, a move, visitors) can cause short-term fussiness'],
          },
          dog: {
            p: ['Skipping one meal isn’t unusual for a dog, especially in hot weather. But if your dog hasn’t eaten for more than 24 hours, or seems unwell, call your vet.'],
            list: ['Go sooner if there’s vomiting, diarrhoea, lethargy or a swollen belly', 'Puppies, seniors and small breeds should be seen sooner', 'Switch foods gradually over 7–10 days to avoid tummy upsets'],
          },
          rabbit: {
            p: ['A bunny who stops eating or pooping is an emergency — call a vet within a few hours. It can be a sign of gut stasis, which gets dangerous quickly.'],
            list: ['Keep offering fresh hay and water', 'Note when they last ate and pooped', 'Don’t wait overnight to see if it passes'],
          },
          any: {
            p: ['Loss of appetite is worth taking seriously:'],
            list: ['Cats: see a vet if they haven’t eaten in 24 hours', 'Dogs: call your vet after 24 hours, or sooner if they seem unwell', 'Rabbits: not eating for even a few hours is an emergency'],
          },
        }),
        follow: [`What are signs my ${pet(sp)} is sick?`, `How often should I feed my ${pet(sp)}?`],
      }),
    },
    {
      id: 'tummy',
      keys: ['vomit', 'vomiting', 'vomited', 'throwing up', 'threw up', 'puke', 'puking', 'diarrhea', 'diarrhoea', 'runny poop', 'loose stool', 'upset stomach', 'upset tummy', 'hairball', 'nausea', 'blood in poop', 'blood in stool'],
      answer: (sp) => (sp === 'rabbit'
        ? {
          p: ['Rabbits can’t vomit, and diarrhoea in a rabbit can become serious very quickly — please contact your vet straight away.', 'Soft, sticky droppings (caecotrophs) are different — bunnies normally eat these, but if you see lots of them stuck to their bottom, mention it to your vet.'],
          follow: ['Why won’t my bunny eat?'],
        }
        : {
          p: [`An occasional one-off vomit${sp === 'cat' ? ' (or hairball)' : ''} can happen and isn’t always a worry if your ${pet(sp)} is otherwise bright and eating. Call your vet if you notice:`],
          list: ['Repeated vomiting or diarrhoea, or it lasts more than 24 hours', 'Blood, or black, tarry stools', 'Lethargy, a painful or swollen belly, or refusing water', 'It’s a puppy, kitten or senior — or they may have eaten something toxic'],
          tip: sp === 'cat' ? 'Regular brushing cuts down on hairballs.' : 'Keep fresh water available and avoid switching foods suddenly.',
          follow: [`What are signs my ${pet(sp)} is sick?`, `Which foods are toxic to ${pets(sp)}?`],
        }),
    },
    {
      id: 'water',
      keys: ['water', 'drink', 'drinking', 'thirsty', 'thirst', 'hydration', 'hydrated', 'dehydrated'],
      answer: (sp) => ({
        p: [by(sp, {
          dog: 'As a rough guide, dogs drink about 50–60 ml of water per kg of body weight a day — more in hot weather or after exercise.',
          cat: 'Cats drink roughly 40–60 ml of water per kg of body weight a day, but cats on wet food drink less because their meals contain water.',
          rabbit: 'Rabbits drink a lot — roughly 50–150 ml per kg of body weight a day — so always offer fresh water, ideally in a heavy bowl as well as a bottle.',
          any: 'As a rough guide, dogs drink about 50–60 ml of water per kg of body weight a day, and cats about 40–60 ml per kg.',
        })],
        list: ['Fresh, clean water should always be available', 'Wet food counts toward daily water intake', 'A sudden increase in thirst can signal diabetes or kidney problems — worth a vet check'],
        tip: sp === 'cat' ? 'Many cats drink more from a running water fountain placed away from their food.' : undefined,
        follow: [`How often should I feed my ${pet(sp)}?`, `How do I keep my ${pet(sp)} cool in summer?`],
      }),
    },
    {
      id: 'grooming',
      keys: ['bath', 'bathe', 'bathing', 'wash', 'shampoo', 'groom', 'grooming', 'brush', 'brushing', 'shedding', 'shed', 'moult', 'molt', 'matted', 'nail', 'claw trim', 'trim', 'clip', 'smell', 'smelly', 'stinky'],
      weak: ['fur', 'coat', 'hair'],
      answer: (sp) => ({
        ...by(sp, {
          dog: {
            p: ['Most dogs need a bath every 4–8 weeks, depending on their coat and how much they love rolling in things.'],
            list: ['Use a dog-specific shampoo — human products can irritate their skin', 'Brush a few times a week (daily for long or double coats)', 'Trim nails every 3–4 weeks, or when you hear them clicking on the floor'],
          },
          cat: {
            p: ['Cats are expert self-groomers and rarely need a bath — only if they get into something sticky or your vet recommends it.'],
            list: ['Brush short-haired cats weekly and long-haired cats daily', 'Trim nails every 2–3 weeks', 'Sudden over- or under-grooming can be a sign of stress or illness'],
          },
          rabbit: {
            p: ['Please don’t bathe your bunny — getting soaked is very stressful for rabbits and can lead to shock or chills. Spot-clean with a damp cloth instead.'],
            list: ['Brush weekly, and daily during moulting season', 'Trim nails every 4–6 weeks', 'Check their bottom is clean, especially in warm weather, to prevent flystrike'],
          },
          any: {
            p: ['It depends on the pet:'],
            list: ['Dogs: a bath every 4–8 weeks, brushing a few times a week', 'Cats: rarely need baths — brush weekly (daily for long hair)', 'Rabbits: never bathe — spot-clean and brush instead', 'Everyone: nail trims every few weeks'],
          },
        }),
        tip: 'Puffin can remind you about grooming and nail trims so they never sneak up on you.',
        follow: [`How do I brush my ${pet(sp)}’s teeth?`, `How do I get rid of fleas?`],
      }),
    },
    {
      id: 'dental',
      keys: ['teeth', 'tooth', 'dental', 'brush teeth', 'brush their teeth', 'brush my', 'bad breath', 'breath', 'gums', 'toothpaste', 'tartar', 'plaque'],
      answer: (sp) => (sp === 'rabbit'
        ? {
          p: ['Rabbit teeth never stop growing — unlimited hay is the best dental care, because chewing it wears teeth down naturally.'],
          list: ['Offer safe chews like willow, apple wood or untreated cardboard', 'Watch for drooling, a wet chin or eating less — signs of overgrown teeth', 'A rabbit-savvy vet should check their teeth at each visit'],
          follow: ['What should rabbits eat?'],
        }
        : {
          p: ['Brushing is the gold standard — daily is ideal, but even a few times a week makes a real difference.'],
          list: ['Only use pet toothpaste — human toothpaste can contain xylitol or fluoride, which are harmful', 'Start slowly: let them lick the paste, then work up to a soft brush', 'Dental chews help, but don’t replace brushing', 'Bad breath, red gums or dropping food can signal dental disease — see your vet'],
          follow: [`How often should I bathe my ${pet(sp)}?`, `When should my ${pet(sp)} see a vet?`],
        }),
    },
    {
      id: 'exercise',
      keys: ['exercise', 'walk', 'walking', 'activity', 'active', 'play', 'playtime', 'energy', 'energetic', 'run', 'running', 'bored', 'boredom', 'zoomies', 'enrichment'],
      answer: (sp) => ({
        ...by(sp, {
          dog: {
            p: ['Most dogs need 30 minutes to 2 hours of activity a day, depending on breed, age and health — working and herding breeds sit at the top end.'],
            list: ['Split it into 2 or more walks, plus play sessions', 'Puppies: keep sessions short and gentle while they grow', 'Sniffing walks and puzzle toys tire them out mentally too'],
          },
          cat: {
            p: ['Aim for 2–3 play sessions of 10–15 minutes a day. Wand toys that mimic prey are a hit with most cats.'],
            list: ['Play before meals to mimic the hunt–eat–sleep cycle', 'Rotate toys weekly so they stay exciting', 'Cat trees and window perches add daily movement'],
          },
          rabbit: {
            p: ['Bunnies need several hours of exercise outside their enclosure every day — ideally in a safe, bunny-proofed space where they can run, jump and binky.'],
            list: ['Offer tunnels, boxes and a dig box', 'Rabbits are most active at dawn and dusk', 'Bunny-proof cables and furniture before free-roam time'],
          },
          any: {
            p: ['Dogs usually need 30 minutes to 2 hours of activity a day, while cats do best with 2–3 short play sessions of 10–15 minutes.'],
            list: ['Mix physical exercise with brain games and puzzle feeders', 'Adjust for age — puppies, kittens and seniors need gentler sessions', 'Boredom often shows up as chewing, scratching or extra noise'],
          },
        }),
        tip: 'Puffin’s activity tracker logs walks and playtime so you can see weekly trends.',
        follow: [`How much should my ${pet(sp)} sleep?`, `How can I tell if my ${pet(sp)} is overweight?`],
      }),
    },
    {
      id: 'weight',
      keys: ['weight', 'overweight', 'fat', 'obese', 'chubby', 'lose weight', 'gain weight', 'underweight', 'skinny', 'thin'],
      answer: (sp) => ({
        p: [`A quick check: you should be able to feel your ${pet(sp)}’s ribs with light pressure, and see a waist when looking from above.`],
        list: ['Measure meals with a cup or kitchen scale', 'Keep treats under about 10% of daily calories', 'Add a little more daily activity', 'Aim for slow, steady changes — your vet can set a target weight'],
        tip: 'Unexplained weight loss can be an early sign of illness, so book a check-up if it happens. Logging weekly weigh-ins in Puffin makes trends easy to spot.',
        follow: [`How often should I feed my ${pet(sp)}?`, `How much exercise does my ${pet(sp)} need?`],
      }),
    },
    {
      id: 'parasites',
      keys: ['flea', 'tick', 'worm', 'deworm', 'deworming', 'dewormer', 'wormer', 'worming', 'parasite', 'heartworm', 'lice', 'mite', 'itchy', 'itching'],
      answer: (sp) => (sp === 'rabbit'
        ? {
          p: ['Rabbits can get fleas, mites and worms too, but many dog and cat products are dangerous for them. Always use a rabbit-safe treatment recommended by your vet.'],
          list: ['Check their fur and skin during weekly brushing', 'Check their bottom daily in warm weather to prevent flystrike', 'Keep their litter tray clean and dry'],
          follow: ['How do I groom my bunny?'],
        }
        : {
          p: ['Year-round prevention is the easiest way to keep fleas, ticks and worms away.'],
          list: ['Fleas & ticks: monthly spot-ons, tablets or collars — your vet will suggest the best option', 'Worms: puppies and kittens are dewormed often (every 2 weeks at first), adults usually every 1–3 months', 'Heartworm prevention is important in many regions — ask your vet', 'Never use dog flea products on cats — some contain permethrin, which is toxic to cats'],
          tip: 'Set a monthly flea-and-worming reminder in Puffin so you never lose track.',
          follow: [`When does my ${pet(sp)} need vaccines?`, `How often should I bathe my ${pet(sp)}?`],
        }),
    },
    {
      id: 'neuter',
      keys: ['spay', 'spayed', 'spaying', 'neuter', 'neutered', 'neutering', 'castrate', 'castration', 'desex', 'desexing', 'sterilize', 'sterilise', 'sterilization', 'sterilisation', 'in heat'],
      answer: (sp) => ({
        p: [by(sp, {
          cat: 'Most vets recommend spaying or neutering cats at around 4–6 months old, before they reach sexual maturity.',
          dog: 'Timing for dogs depends on size and breed — small dogs are often done at around 6 months, while large and giant breeds may benefit from waiting until 12–18 months. Your vet can recommend the best timing.',
          rabbit: 'Rabbits are usually neutered at around 4–6 months. Spaying greatly reduces a female rabbit’s risk of uterine cancer, and it helps with litter training and bonding.',
          any: 'Cats are usually spayed or neutered at around 4–6 months. For dogs it depends on size — often around 6 months for small breeds, and later (12–18 months) for large breeds.',
        })],
        list: ['Prevents unplanned litters', 'Can reduce roaming, marking and some behaviour problems', 'Lowers the risk of certain cancers and infections'],
        tip: 'Recovery usually takes 10–14 days — keep them calm and stop them licking the wound.',
        follow: [`When does my ${pet(sp)} need vaccines?`],
      }),
    },
    {
      id: 'litter',
      keys: ['litter', 'litter box', 'litter tray', 'peeing outside', 'pooping outside', 'spraying', 'pee on the', 'pees on', 'toilet'],
      answer: (sp) => (sp === 'dog' ? intents.find((i) => i.id === 'potty').answer(sp) : sp === 'rabbit'
        ? {
          p: ['Bunnies can be litter trained! Use a large tray with paper-based litter topped with fresh hay — rabbits love to munch while they go.'],
          list: ['Put the tray where they already like to go', 'Avoid clumping or clay cat litter, which can harm rabbits', 'Neutering makes litter training much easier'],
          follow: ['What should rabbits eat?'],
        }
        : {
          p: ['A good rule is one litter box per cat, plus one extra — in quiet, easy-to-reach spots.'],
          list: ['Scoop at least once a day and fully change the litter weekly', 'Most cats prefer unscented, clumping litter', 'If your cat starts peeing outside the box, see a vet first — urinary problems are common'],
          tip: 'A male cat straining to pee with little or nothing coming out is an emergency.',
          follow: ['How do I stop my cat scratching furniture?', 'How can I help my anxious cat?'],
        }),
    },
    {
      id: 'scratching',
      keys: ['scratching furniture', 'scratches furniture', 'scratching the sofa', 'scratching post', 'scratch post', 'scratcher', 'sofa', 'couch', 'furniture', 'curtains'],
      answer: () => ({
        p: ['Scratching is natural — it keeps claws healthy and marks territory — so the goal is to redirect it, not stop it.'],
        list: ['Offer a tall, sturdy scratching post (sisal is a favourite) right next to the furniture they target', 'Try both vertical posts and horizontal scratchers', 'Reward with treats or play when they use the post', 'Make the sofa less tempting for a while with double-sided tape or a throw'],
        tip: 'Regular nail trims help too.',
        follow: ['How much should my cat play?', 'How do I keep my cat’s litter box clean?'],
      }),
    },
    {
      id: 'potty',
      keys: ['potty training', 'potty train', 'house training', 'house train', 'housetrain', 'housebreak', 'toilet training', 'toilet train', 'accident', 'pee inside', 'peeing inside', 'pees in the house', 'peeing in the house', 'crate'],
      answer: () => ({
        p: ['Consistency is everything with potty training:'],
        list: ['Take your puppy outside after waking, eating, playing — and every 1–2 hours', 'Use the same spot and a cue word, like “go potty”', 'Reward immediately with a treat and praise when they go outside', 'Never punish accidents — clean with an enzyme cleaner to remove the scent'],
        tip: 'Most puppies get the hang of it within a few weeks to a few months.',
        follow: ['How do I stop my puppy biting?', 'How much exercise does my dog need?'],
      }),
    },
    {
      id: 'behaviour',
      keys: ['train', 'training', 'trick', 'obedience', 'recall', 'barking', 'bark', 'bite', 'biting', 'nip', 'nipping', 'chew', 'chewing', 'jumping', 'behavior', 'behaviour', 'aggressive', 'aggression', 'misbehave', 'naughty', 'destructive', 'pulling', 'leash', 'lead', 'whine', 'whining', 'howl', 'howling', 'meowing', 'yowling'],
      answer: (sp) => ({
        ...by(sp, {
          cat: {
            p: ['Cats can learn too! Short, treat-based sessions work best for tricks like sit or high-five.'],
            list: ['Biting during play usually means they need more interactive play with toys', 'Never use hands as toys — swap in a wand toy', 'Reward calm behaviour instead of punishing mistakes'],
          },
          rabbit: {
            p: ['Rabbits respond well to gentle, treat-based training — many learn their name, to come when called, and to hop onto a scale.'],
            list: ['Chewing is natural: offer willow, apple wood or cardboard', 'Bunny-proof cables and skirting boards', 'Nipping or grunting often means “give me space”'],
          },
          any: {
            p: ['Positive reinforcement — rewarding the behaviour you want — is the most effective (and kindest) way to train.'],
            list: ['Keep sessions short: 5–10 minutes, a few times a day', 'Reward within a second or two so they connect the dots', 'Puppy nipping: swap hands for a toy, and pause play if teeth touch skin', 'Chewing and barking often come from boredom — more exercise and puzzle toys help a lot'],
          },
        }),
        tip: 'If aggression appears suddenly, check in with your vet — pain is a common cause.',
        follow: [`How much exercise does my ${pet(sp)} need?`, `How can I help my anxious ${pet(sp)}?`],
      }),
    },
    {
      id: 'anxiety',
      keys: ['anxiety', 'anxious', 'nervous', 'scared', 'fear', 'fearful', 'stressed', 'stress', 'separation anxiety', 'home alone', 'left alone', 'fireworks', 'thunder', 'storm', 'hiding', 'shaking', 'trembling', 'calm'],
      answer: (sp) => ({
        p: [`Lots of ${pets(sp)} get anxious — about being alone, loud noises or new places. A few things help:`],
        list: by(sp, {
          cat: ['Give them high perches and hiding spots so they feel safe', 'Keep routines predictable — meals and play at the same times', 'Pheromone diffusers can help some cats relax', 'Introduce changes (new pets, furniture, visitors) gradually'],
          rabbit: ['Provide hideouts with two exits so they never feel trapped', 'Keep them away from loud noises and predators’ scents', 'Let them come to you — sit on the floor and stay calm', 'Rabbits are social, so a bonded friend can help'],
          any: ['Build up alone time gradually, starting with just a few minutes', 'Create a cosy safe space with familiar bedding', 'Keep departures and arrivals low-key', 'For fireworks and storms, close curtains and play calm background sound'],
        }),
        tip: 'If anxiety is severe — destruction, non-stop crying or not eating — talk to your vet or a certified behaviourist.',
        follow: [`How much exercise does my ${pet(sp)} need?`],
      }),
    },
    {
      id: 'senior',
      keys: ['senior', 'elderly', 'older', 'old age', 'aging', 'ageing', 'geriatric', 'arthritis', 'stiff'],
      answer: (sp) => ({
        p: [by(sp, {
          rabbit: 'Rabbits are usually considered seniors from around 6–8 years old.',
          any: 'Cats and dogs are usually considered seniors from around 7–10 years old (large dogs a little earlier).',
        })],
        list: ['Twice-yearly vet check-ups help catch problems early', 'Watch for changes in thirst, weight, mobility or behaviour', 'Soft bedding, ramps and non-slip rugs help stiff joints', 'Keep them moving with gentle, regular exercise'],
        follow: [`How old is my ${pet(sp)} in human years?`, `When should my ${pet(sp)} see a vet?`],
      }),
    },
    {
      id: 'age',
      keys: ['human years', 'dog years', 'cat years', 'in human', 'lifespan', 'life expectancy', 'how long do', 'how long will'],
      weak: ['old', 'age'],
      answer: (sp) => ({
        p: [by(sp, {
          dog: 'The “multiply by 7” rule isn’t accurate! A rough guide: a dog’s first year equals about 15 human years, the second adds about 9, and each year after adds 4–5 (large breeds age faster).',
          cat: 'A cat’s first year equals about 15 human years, the second adds about 9 (so a 2-year-old cat is about 24), and each year after adds about 4. Indoor cats often live 12–18 years.',
          rabbit: 'Rabbits grow up fast — a 1-year-old bunny is roughly like a young adult — and with good care they often live 8–12 years.',
          any: 'The “multiply by 7” rule isn’t accurate! For both cats and dogs, the first year equals about 15 human years and the second adds about 9. After that, cats age about 4 years per year and dogs 4–5 (large breeds faster).',
        })],
        follow: [`How do I care for a senior ${pet(sp)}?`],
      }),
    },
    {
      id: 'sleep',
      keys: ['sleep', 'sleeping', 'sleepy', 'nap', 'napping', 'tired', 'lazy'],
      answer: (sp) => ({
        p: [by(sp, {
          rabbit: 'Rabbits nap on and off through the day and are most active at dawn and dusk — they’re crepuscular, not nocturnal.',
          cat: 'Cats sleep a whopping 12–16 hours a day — kittens and seniors even more.',
          dog: 'Adult dogs sleep around 12–14 hours a day, and puppies can sleep up to 18–20 hours.',
          any: 'Lots of sleep is normal! Adult dogs sleep around 12–14 hours a day (puppies up to 18–20), and cats a whopping 12–16 hours.',
        }), 'A sudden change — sleeping far more, or restlessness at night — is worth mentioning to your vet.'],
        follow: [`How much exercise does my ${pet(sp)} need?`],
      }),
    },
    {
      id: 'heat',
      keys: ['hot weather', 'heatwave', 'summer', 'overheating', 'overheat', 'pavement', 'hot car', 'sunburn', 'keep cool', 'cool down', 'cold weather', 'winter'],
      weak: ['hot', 'heat', 'cool', 'cold', 'temperature'],
      answer: (sp) => (sp === 'rabbit'
        ? {
          p: ['Rabbits are very sensitive to heat — temperatures above about 25°C (77°F) can be risky.'],
          list: ['Keep them in a cool, shaded, well-ventilated room', 'Offer a frozen water bottle wrapped in a towel to lean against', 'Lightly dampen their ears if they’re hot', 'Floppy, panting or wet-nosed bunnies need a vet urgently'],
          follow: ['How much water should my bunny drink?'],
        }
        : {
          p: ['Pets can overheat quickly — here’s how to keep them cool:'],
          list: ['Never leave a pet in a parked car, even for a few minutes', 'Walk dogs early or late; if pavement is too hot for your hand, it’s too hot for paws', 'Provide shade and plenty of fresh water', 'Heavy panting, drooling, weakness or vomiting can mean heatstroke — call a vet immediately'],
          follow: [`How much water should my ${pet(sp)} drink?`],
        }),
    },
    {
      id: 'health',
      keys: ['vet', 'veterinarian', 'see a vet', 'to the vet', 'checkup', 'check up', 'sick', 'ill', 'illness', 'unwell', 'symptom', 'signs of', 'lethargic', 'lethargy', 'limping', 'limp', 'cough', 'coughing', 'sneezing', 'sneeze', 'runny nose', 'discharge', 'eye', 'ear', 'lump', 'healthy'],
      answer: (sp) => ({
        p: [`Most adult ${pets(sp)} should have a check-up once a year (twice a year for seniors). Book a visit sooner if you notice:`],
        list: ['Changes in appetite, thirst, weight or energy', 'Limping, coughing, sneezing or discharge from eyes, nose or ears', 'Vomiting or diarrhoea lasting over 24 hours', 'New lumps, or changes in toilet habits'],
        tip: 'Trust your instincts — you know your pet best. Puffin’s vet finder shows clinics near you with opening hours and directions.',
        follow: ['How does Puffin’s vet finder work?', `When does my ${pet(sp)} need vaccines?`],
      }),
    },
    {
      id: 'newpet',
      keys: ['new puppy', 'new kitten', 'new pet', 'new dog', 'new cat', 'new bunny', 'new rabbit', 'adopt', 'adopted', 'adopting', 'adoption', 'bring home', 'first time', 'first pet', 'checklist', 'essentials', 'supplies', 'what do i need'],
      weak: ['care', 'take care', 'look after', 'getting'],
      answer: (sp) => ({
        p: [`Exciting! Here’s a starter checklist for a new ${pet(sp)}:`],
        list: by(sp, {
          dog: ['Food and water bowls, plus the food they’re used to', 'Collar, ID tag and lead', 'A cosy bed or crate', 'Chew toys and puzzle toys', 'A vet visit in the first week for a check-up and vaccine plan'],
          cat: ['Litter box, litter and scoop', 'Food, bowls and a water fountain', 'Scratching post and a cat tree', 'A carrier for vet visits', 'Hiding spots so they can settle in at their own pace'],
          rabbit: ['A large enclosure or free-roam space (not a small hutch)', 'Unlimited hay and a hay rack', 'A litter tray with paper-based litter', 'Hideouts, tunnels and safe chew toys', 'A rabbit-savvy vet for a first check-up'],
          any: ['Food, bowls and fresh water', 'A comfy bed and a safe hiding spot', 'Toys for play and enrichment', 'ID tag or microchip details', 'A vet visit in the first week'],
        }),
        tip: 'Add your new pet to Puffin and it will build their care schedule from day one.',
        follow: [`When does my ${pet(sp)} need vaccines?`, `How often should I feed my ${pet(sp)}?`],
      }),
    },
    {
      id: 'rabbit-care',
      only: ['rabbit'],
      keys: ['care', 'take care', 'look after', 'pet rabbit', 'house rabbit'],
      weak: ['rabbit', 'bunny'],
      answer: () => ({
        p: ['Bunnies are wonderful companions — here are the essentials:'],
        list: ['Diet: unlimited hay, daily leafy greens and a few pellets', 'Space: several hours of exercise a day in a bunny-proofed area', 'Company: rabbits are social and usually happiest in bonded pairs', 'Health: a rabbit-savvy vet, and daily checks that they’re eating and pooping'],
        tip: 'Fun fact: a happy bunny jumps and twists in the air — that’s called a binky!',
        follow: ['What should rabbits eat?', 'Should I bathe my bunny?'],
      }),
    },

    /* ---------- about the Puffin app ---------- */
    {
      id: 'app-about',
      keys: ['what is puffin', 'about puffin', 'puffin app', 'feature', 'what does puffin', 'how does puffin work', 'what can puffin'],
      weak: ['puffin', 'app'],
      answer: () => ({
        p: ['Puffin is your pet’s all-in-one care app. It brings together:'],
        list: ['Health tracking — weight, symptoms, meds and vet visits', 'Reminders for vaccines, feeding, grooming and walks', 'Daily activity tracking', 'A nearby vet-clinic finder'],
        tip: 'The app also has the full version of me — unlimited questions, personalised to your pet’s profile.',
        follow: ['Can Puffin remind me about vaccines?', 'How does Puffin’s vet finder work?'],
      }),
    },
    {
      id: 'app-reminders',
      keys: ['remind', 'reminder', 'remind me', 'set a reminder', 'vaccine reminder', 'notification', 'notify', 'alert', 'alarm', 'schedule'],
      weak: ['puffin', 'app'],
      answer: () => ({
        p: ['Yes! In Puffin you can set one-off or repeating reminders for vaccines, medication, feeding, grooming and walks. Puffin nudges you at the right moment and keeps a record once it’s done.'],
        follow: ['How does Puffin’s vet finder work?', 'How do I download Puffin?'],
      }),
    },
    {
      id: 'app-vets',
      keys: ['near me', 'nearby', 'nearest', 'closest', 'find a vet', 'find vet', 'vet finder', 'vet clinic', 'clinic', 'animal hospital', 'emergency vet', 'local vet'],
      weak: ['puffin', 'app', 'vet', 'find'],
      answer: () => ({
        p: ['Puffin’s vet finder uses your location (only with your permission) to show veterinary clinics and animal healthcare services nearby — with distance, opening hours and one-tap directions.'],
        tip: 'In an emergency, call the clinic on your way so they can prepare.',
        follow: ['What is Puffin?', 'How do I download Puffin?'],
      }),
    },
    {
      id: 'app-get',
      keys: ['price', 'pricing', 'cost', 'is it free', 'puffin free', 'free to use', 'for free', 'pay', 'paid', 'subscription', 'premium', 'download', 'install', 'ios', 'android', 'iphone', 'app store', 'google play', 'play store', 'get the app'],
      weak: ['puffin', 'app'],
      answer: () => ({
        p: ['You can download Puffin on the App Store and Google Play — tap the buttons on this page to get started. Check the store listing for the latest plans and pricing.'],
        follow: ['What is Puffin?', 'Is my pet’s data private?'],
      }),
    },
    {
      id: 'app-privacy',
      keys: ['privacy', 'private', 'data', 'secure', 'security', 'personal information'],
      weak: ['puffin', 'app'],
      answer: () => ({
        p: ['Your pet’s records belong to you. Puffin only uses your data to power the features you use, and you can export or delete it whenever you like.', 'And here on the website, I run entirely in your browser — your questions never leave this page.'],
        follow: ['What is Puffin?'],
      }),
    },
  ];

  /* ---------- small talk (never counts toward the free limit) ---------- */
  const smalltalk = [
    { early: true, test: /^(thank|thanks|thx|ty|cheers)\b/, answer: { p: ['You’re very welcome! Give your pet a scratch behind the ears from me.'] } },
    { early: true, test: /\b(who are you|what are you|are you (real|a bot|a robot|ai|an ai|human|a vet)|what can you do|how do you work|what do you know)\b/,
      answer: { p: ['I’m Puff, Puffin’s AI care buddy! I can help with safe foods, feeding, vaccines, grooming, exercise, behaviour and everyday health for cats, dogs and rabbits.', 'I share general tips, not diagnoses — for anything urgent, your vet is the best call.'] } },
    { test: /^(hi|hey|hello|hiya|howdy|yo|good (morning|afternoon|evening))\b/, answer: { p: ['Hi there! What would you like to know about your pet today?'] } },
    { test: /\b(joke|funny)\b/, answer: { p: ['Why do bunnies make great listeners? Because they’re all ears!', 'Okay, back to business — what would you like to know about your pet?'] } },
    { test: /^(bye|goodbye|see you|see ya|cya)\b/, answer: { p: ['Bye for now! Give your pet a cuddle from me.'] } },
  ];

  const fallback = {
    p: ['Hmm, I don’t have a good answer for that one yet — I’m still a young bunny!', 'I know most about safe foods, feeding, vaccines, grooming, exercise, behaviour and everyday health for cats, dogs and rabbits. Try rephrasing, or tap a suggestion below.'],
  };

  const starters = ['Can dogs eat grapes?', 'When do kittens need vaccines?', 'How often should I bathe my dog?', 'Why won’t my cat eat?'];

  window.PuffKnowledge = { species, foods, foodAnswer, emergency, ingested, askedIfBad, intents, smalltalk, fallback, starters };
})();
