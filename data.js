/*
 * Akasha Terminal: INVENTED demo data for the public Showcase.
 *
 * A drop-in replacement for Akasha's data.js (same shape, read by the same script.js). Everything
 * here is made up: the player, the characters, the weapons, the codes, the notes and the wish
 * numbers. Nothing was copied from the real account. The game rules at the bottom (artifact
 * roll sizes, pity thresholds) are public Genshin facts, so they mirror the real structure.
 *
 * The fake wishesSync (what sync-wishes.ps1 would normally write into wishes-sync.js) is at the
 * end of this file, so the real wishes-sync.js can be answered with an empty file.
 *
 * Because it is only a demo, the banner clock is relative to "now": the banner always ends in
 * about 8 days. That keeps a future live demo from ever showing "Banner window closed".
 */
(function () {
  const pad2 = (n) => String(n).padStart(2, "0");
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const ends = new Date(Date.now() + ((8 * 24 + 14) * 60 + 23) * 60000);
  const endsIso = `${ends.getFullYear()}-${pad2(ends.getMonth() + 1)}-${pad2(ends.getDate())}` +
                  `T${pad2(ends.getHours())}:${pad2(ends.getMinutes())}:00`;
  const endsLabel = `Banners end ${MONTHS[ends.getMonth()]} ${ends.getDate()}, ${pad2(ends.getHours())}:${pad2(ends.getMinutes())} (server time)`;

  // Invented material names, one set per element, so every card has a Materials block.
  const LOCAL = ["Glimmerbloom", "Duskpetal", "Windreed", "Saltroot", "Emberthistle", "Moonfern", "Hollowberry", "Sunmoss"];
  const COMMON = [
    "Faded Sigil, Worn Insignia, Hollow Crest",
    "Cracked Lantern, Dim Lantern, Bright Lantern",
    "Rusted Token, Plain Token, Gilded Token",
    "Scuffed Mask, Plain Mask, Painted Mask"
  ];
  const BOSS = ["Stormcore Fragment", "Tidal Crown Shard", "Emberheart Seed", "Frostveil Crystal", "Mossback Plume"];
  const BOOK = ["Resolve", "Cadence", "Harvest", "Vigil", "Bearing", "Tempo"];
  const WEEKLY = ["Dusk Tooth", "Ember Plume", "Tidal Scale", "Gale Feather", "Frost Claw"];
  const EL = { pyro: "Pyro", hydro: "Hydro", electro: "Electro", anemo: "Anemo", cryo: "Cryo", dendro: "Dendro", geo: "Geo" };

  function mat(i, element) {
    return {
      local: LOCAL[i % LOCAL.length],
      gem: `${EL[element]} Gemstone line`,
      common: COMMON[i % COMMON.length],
      boss: BOSS[i % BOSS.length],
      book: BOOK[i % BOOK.length],
      talCommon: COMMON[(i + 1) % COMMON.length],
      talBoss: WEEKLY[i % WEEKLY.length]
    };
  }

  const squad = [
    { rank: "MAIN DPS", name: "Aster",   role: "Burst-window damage dealer. Builds energy with the skill, then spends it on a big burst while Orin keeps the team grouped up.", element: "pyro",    elementLabel: "Pyro",    status: "C0 · Lv.80",
      build: { weapon5: "Starfall Edge", weaponAlt: "Ironwake Blade", artifact: "4pc Emberglass", er: "120–130%" } },
    { rank: "SUB DPS", name: "Veyra",   role: "Applies Hydro from the back row and fires off-field hits between Aster's burst windows.", element: "hydro",   elementLabel: "Hydro",   status: "C2 · Lv.70",
      build: { weapon5: "Tidecaller Orb", weaponAlt: "Brightwater Codex", artifact: "4pc Tidebound Regalia", er: "140–160%" } },
    { rank: "ENABLER", name: "Tamsin",  role: "Starts the reactions with a quick Electro skill on a short cooldown. Cheap to build, does a lot.", element: "electro", elementLabel: "Electro", status: "C0 · Lv.60",
      build: { weapon5: "Stormreach Spear", weaponAlt: "Copperpoint Lance", artifact: "2pc Gale + 2pc Emberglass", er: "180%+" } },
    { rank: "BUFFER", name: "Orin",    role: "Anemo support that pulls enemies together and shreds their resistance for the whole team.", element: "anemo",   elementLabel: "Anemo",   status: "C1 · Lv.70",
      build: { weapon5: "Skyfeather Bow", weaponAlt: "Hunter's Reed Bow", artifact: "4pc Galewalker", er: "200%+" } },
    { rank: "HEALER", name: "Marlowe", role: "Keeps the team standing with a steady heal, and adds Dendro on the side.", element: "dendro",  elementLabel: "Dendro",  status: "C0 · Lv.60",
      build: { weapon5: "Verdant Rite", weaponAlt: "Leaflight Tome", artifact: "4pc Bloomkeeper", er: "no fixed target" } }
  ];

  const bench = [
    { name: "Kestrel", status: "Lv.50", element: "cryo",  elementLabel: "Cryo",  weapon: "Bow",
      note: "A freeze-reaction option that works well with Veyra. Not built yet, kept as a backup for the second team.",
      build: { weapon5: null, weaponAlt: "Hoarfrost Longbow", artifact: null, er: "no fixed target" } },
    { name: "Fennel",  status: "Lv.40", element: "geo",   elementLabel: "Geo",   weapon: "Claymore",
      note: "A sturdy Geo shield-bearer. Used for the Abyss floors that need a protected carry.",
      build: { weapon5: "Granite Maul", weaponAlt: "Quarry Greatblade", artifact: "4pc Bulwark Sworn", er: "130%" } },
    { name: "Lumen",   status: "Lv.30", element: "anemo", elementLabel: "Anemo", weapon: "Catalyst",
      note: "Second Anemo swirler. Levelled just enough to fill in for Orin on the other team.",
      build: { weapon5: null, weaponAlt: "Lanternglass Tome", artifact: "4pc Galewalker", er: "160%+" } },
    { name: "Brindle", status: "Lv.20", element: "pyro",  elementLabel: "Pyro",  weapon: "Polearm",
      note: "A friendly early Pyro unit who still earns a slot in a pinch.",
      build: { weapon5: null, weaponAlt: "Cinder Pike", artifact: null, er: "120%" } }
  ];

  const referenceBase = [
    ["Cael", "pyro", "Sword", "Fast melee carry that wants big burst windows.", "4★"],
    ["Dune", "geo", "Polearm", "Tanky field Geo with a long-lasting shield.", "4★"],
    ["Isolde", "hydro", "Catalyst", "Off-field Hydro applier that sits on the bench most of the fight.", "5★"],
    ["Perrin", "electro", "Bow", "Quick-swap Electro enabler with a short burst.", "4★"],
    ["Sable", "cryo", "Sword", "Cryo carry that rewards tight rotations.", "5★"],
    ["Talon", "anemo", "Claymore", "Heavy Anemo hitter that doubles as a group puller.", "4★"],
    ["Wren", "dendro", "Catalyst", "Dendro applier that is easy to fit onto almost any team.", "4★"],
    ["Yarrow", "geo", "Sword", "Geo support that boosts the whole team's damage.", "5★"],
    ["Hollis", "pyro", "Bow", "Ranged Pyro damage with a charged-shot style.", "4★"],
    ["Idris", "electro", "Claymore", "Electro bruiser that buffs allies while it fights.", "5★"],
    ["Juniper", "cryo", "Polearm", "Cryo healer that keeps the front line topped up.", "4★"],
    ["Zephra", "hydro", "Sword", "Steady Hydro support with a long skill duration.", "4★"]
  ];
  const reference = referenceBase.map(([name, element, weapon, kit, rarity], i) => ({
    name, element, elementLabel: EL[element], weapon, rarity, kit,
    build: {
      weapon5: `${name}'s signature ${weapon.toLowerCase()}`,
      weaponAlt: "Any 4★ with a matching main stat",
      artifact: "4pc set that suits the role",
      er: i % 3 === 0 ? "100–120%" : "140%+"
    }
  }));
  reference[0].note = "Example card, written for the demo.";

  // Materials: every owned character, spelled exactly as in squad / bench / reference.
  const materials = {};
  [...squad, ...bench, ...reference].forEach((c, i) => {
    materials[c.name] = mat(i, c.element);
  });
  materials["Lumen"].lowerConfidence = true;

  window.__AKASHA_FAKE__ = true; // lets the screenshot script prove it is the invented file

  window.LEDGER_DATA = {
    meta: {
      lastSynced: "today, 09:41",
      note: "Demo account · made-up data"
    },

    player: {
      name: "Traveler",
      uid: "000000000",
      ar: 56,
      wl: 6,
      story: "Chapter II · Act 3",
      region: "Mondstadt"
    },

    squad: {
      title: "Main team · sample build",
      tag: "In focus",
      members: squad,
      rotation: "Orin Skill → Tamsin Skill → Veyra Burst → Aster Skill → Aster Burst → Marlowe Skill → Aster Normal attacks",
      rotationNote: "Invented rotation for the demo: group the enemies first, start the reactions, then spend Aster's burst while the buffs are up."
    },

    farming: {
      targets: [
        { name: "Aster",   element: "pyro",    domain: "Hall of Embers",      domainRegion: "Mondstadt", book: "Resolve books", days: [0, 1, 4] },
        { name: "Orin",    element: "anemo",   domain: "Hall of Gales",       domainRegion: "Mondstadt", book: "Cadence books", days: [0, 1, 4] },
        { name: "Veyra",   element: "hydro",   domain: "Hall of Tides",       domainRegion: "Liyue",     book: "Harvest books", days: [0, 2, 5] },
        { name: "Tamsin",  element: "electro", domain: "Hall of Storms",      domainRegion: "Liyue",     book: "Vigil books",   days: [0, 3, 6] },
        { name: "Marlowe", element: "dendro",  domain: "Hall of Roots",       domainRegion: "Liyue",     book: "Bearing books", days: [0, 3, 6] }
      ],
      emptyLabel: "No talent domain is open today"
    },

    routine: {
      title: "Daily routine",
      goalLabel: "Goal",
      goal: "Keep the main team levelling a little every day: finish the quick chores first, then spend resin where it helps the most.",
      steps: [
        { id: "commissions", label: "Daily commissions", detail: "Four short quests from the guild board. Claim the reward when the fourth is done." },
        { id: "checkin",     label: "Check in",          detail: "Open the event page, claim the daily login, then close it." },
        { id: "resin", label: "Spend resin", kind: "resin", budget: "160 resin",
          detail: "Talent domains first when one is open for the main team; otherwise the artifact domain.",
          fallbackLabel: "Artifact domains instead",
          routes: [
            { set: "Emberglass",  who: "Aster, Tamsin" },
            { set: "Tidebound Regalia", who: "Veyra" },
            { set: "Galewalker",  who: "Orin" }
          ],
          weekliesLabel: "Weekly bosses",
          weeklies: [
            { name: "Dusk Tooth",  who: "Aster, Orin" },
            { name: "Tidal Scale", who: "Veyra" },
            { name: "Ember Plume", who: "Tamsin" }
          ] },
        { id: "gather", label: "Gather", cadence: "Daily", detail: "Quick loop past the herb patches for the ascension plants." },
        { id: "shop",   label: "Shop reset", cadence: "Weekly", detail: "Buy the discounted books and the weekly Fates." }
      ],
      note: "Sample checklist. Tap a step to tick it off; the ticks clear themselves each morning."
    },

    patch: {
      version: "Patch 1.0 — demo build",
      banners: [
        { name: "Sunniva", element: "electro", elementLabel: "Electro · 5★" },
        { name: "Corvin",  element: "cryo",    elementLabel: "Cryo · 5★" }
      ],
      bannerEndsLabel: endsLabel,
      bannerEndsAt: endsIso,
      progressPct: 62,
      nextLabel: "Next patch in about 3 weeks"
    },

    wishes: {
      asOf: null,
      asOfLabel: null,
      // Typed in by hand in the real app; invented here.
      currency: { primogems: 9680, intertwined: 11, acquaint: 6, starglitter: 40 },
      banners: null,
      history: [],
      // Game rules (public): pity thresholds and rates.
      rules: {
        character: { label: "Character Event", short: "Character", hard: 90, softStart: 74, base: 0.006, step: 0.06, featuredRate: 0.55,  avgPity: 62, fate: "intertwined" },
        weapon:    { label: "Weapon Event",    short: "Weapon",    hard: 80, softStart: 63, base: 0.007, step: 0.07, featuredRate: 0.375, avgPity: 54, fate: "intertwined" },
        standard:  { label: "Standard",        short: "Standard",  hard: 90, softStart: 74, base: 0.006, step: 0.06, featuredRate: null,  avgPity: 62, fate: "acquaint" }
      }
    },

    // Game rules (public): substat roll sizes, slot main stats, Crit Value bands. No picks here.
    artifacts: {
      tiers: [0.7, 0.8, 0.9, 1],
      substats: {
        HP:   { label: "HP",                max: 298.75, decimals: 0, weight: 6 },
        ATK:  { label: "ATK",               max: 19.45,  decimals: 0, weight: 6 },
        DEF:  { label: "DEF",               max: 23.15,  decimals: 0, weight: 6 },
        HPp:  { label: "HP%",               max: 5.83,   decimals: 1, weight: 4 },
        ATKp: { label: "ATK%",              max: 5.83,   decimals: 1, weight: 4 },
        DEFp: { label: "DEF%",              max: 7.29,   decimals: 1, weight: 4 },
        ER:   { label: "Energy Recharge",   max: 6.48,   decimals: 1, weight: 4 },
        EM:   { label: "Elemental Mastery", max: 23.31,  decimals: 0, weight: 4 },
        CR:   { label: "CRIT Rate",         max: 3.89,   decimals: 1, weight: 3 },
        CD:   { label: "CRIT DMG",          max: 7.77,   decimals: 1, weight: 3 }
      },
      slots: {
        flower: { label: "Flower", mains: [{ key: "HP", label: "HP", sub: "HP" }] },
        plume:  { label: "Plume",  mains: [{ key: "ATK", label: "ATK", sub: "ATK" }] },
        sands:  { label: "Sands",  mains: [
          { key: "ATKp", label: "ATK%", sub: "ATKp" }, { key: "HPp", label: "HP%", sub: "HPp" },
          { key: "DEFp", label: "DEF%", sub: "DEFp" }, { key: "ER", label: "Energy Recharge", sub: "ER" },
          { key: "EM", label: "Elemental Mastery", sub: "EM" }
        ] },
        goblet: { label: "Goblet", mains: [
          { key: "ELEM", label: "Elemental DMG Bonus", sub: null }, { key: "PHYS", label: "Physical DMG Bonus", sub: null },
          { key: "ATKp", label: "ATK%", sub: "ATKp" }, { key: "HPp", label: "HP%", sub: "HPp" },
          { key: "DEFp", label: "DEF%", sub: "DEFp" }, { key: "EM", label: "Elemental Mastery", sub: "EM" }
        ] },
        circlet: { label: "Circlet", mains: [
          { key: "CR", label: "CRIT Rate", sub: "CR" }, { key: "CD", label: "CRIT DMG", sub: "CD" },
          { key: "ATKp", label: "ATK%", sub: "ATKp" }, { key: "HPp", label: "HP%", sub: "HPp" },
          { key: "DEFp", label: "DEF%", sub: "DEFp" }, { key: "HEAL", label: "Healing Bonus", sub: null },
          { key: "EM", label: "Elemental Mastery", sub: "EM" }
        ] }
      },
      cvBands: [{ min: 30, label: "decent" }, { min: 40, label: "good" }, { min: 50, label: "great" }],
      keep: { level: 0.5, retry: 0.2 }
    },

    codes: {
      verifiedLabel: "Demo codes",
      items: [
        { code: "DEMOCODE2026",  reward: "Primogems ×60",   status: "good", label: "WORKED" },
        { code: "SAMPLEGIFT01",  reward: "Mora ×20,000",    status: "good", label: "WORKED" },
        { code: "FAKECODE0000",  reward: "Hero's Wit ×3",   status: "good", label: "WORKED" },
        { code: "OLDDEMO2025",   reward: "Primogems ×100",  status: "bad",  label: "EXPIRED" }
      ]
    },

    notices: [
      { date: "Oct 18", text: "A new sample event starts on Friday. Its login reward is worth claiming." },
      { date: "Oct 15", text: "Demo maintenance finished. Nothing was lost, and the codes below were re-checked." },
      { date: "Oct 12", text: "Reminder: the weekly shop resets on Monday, so spend the spare Fates before then." }
    ],

    abyss: {
      title: "Abyss teams · sample floor",
      clash: "Tamsin",
      teams: [
        { label: "First half",  members: "Aster, Veyra, Tamsin, Orin" },
        { label: "Second half", members: "Kestrel, Fennel, Tamsin, Marlowe" }
      ],
      conflict: "Tamsin is wanted in both halves, but a character can only stand in one team per run.",
      resolution: "Give Tamsin to the first half and swap the second half's enabler for Lumen."
    },

    roster: {
      tiles: [
        { n: 5,  label: "Built" },
        { n: 7,  label: "Levelling" },
        { n: 12, label: "Bench" }
      ],
      p1Unbuilt: "Nobody is waiting: the whole main team is built.",
      benchTitle: "Next in line",
      bench,
      deprioritized: { names: "Brindle, Zephra", note: "Fine for story quests; not worth resin yet." },
      referenceTitle: "Reference roster",
      referenceNote: "Made-up cards, only to show what this view looks like. They are not a priority list.",
      reference
    },

    materials,

    unconfirmed: {
      title: "Needs checking",
      items: [
        { subject: "Sample item A", text: "Demo note: this one is waiting for a second source before it is trusted." },
        { subject: "Sample item B", text: "Demo note: the numbers here came from a single post and may be out of date." }
      ]
    },

    links: {
      title: "Links",
      items: [
        { label: "Example link", note: "A placeholder", url: "https://example.com/" }
      ]
    },

    footer: {
      line1: "Akasha Terminal · demo build with made-up data",
      line2: "Nothing here belongs to a real account."
    },

    // What sync-wishes.ps1 would normally write into wishes-sync.js. Invented numbers.
    wishesSync: {
      source: "demo",
      asOf: "2026-10-18T21:04:00",
      asOfLabel: "Oct 18, 21:04",
      banners: {
        character: { pity5: 31, pity4: 7, guaranteed: false },
        weapon:    { pity5: 19, pity4: 4, fatePoint: 0 },
        standard:  { pity5: 22, pity4: 6 }
      },
      totals: {
        character: { wishes: 409, fours: 44 },
        weapon:    { wishes: 151, fours: 19 },
        standard:  { wishes: 188, fours: 21 }
      },
      history: [
        { banner: "standard",  name: "Hartley",  pity: 64, result: null,         date: "2025-02-11" },
        { banner: "character", name: "Elowen",   pity: 58, result: "won",        date: "2025-03-02" },
        { banner: "weapon",    name: "Dawnglass Greatsword", pity: 62, result: "chosen", date: "2025-04-19" },
        { banner: "character", name: "Rhys",     pity: 81, result: "lost",       date: "2025-05-27" },
        { banner: "character", name: "Sunniva",  pity: 44, result: "guaranteed", date: "2025-06-14" },
        { banner: "standard",  name: "Maribel",  pity: 71, result: null,         date: "2025-08-05" },
        { banner: "weapon",    name: "Moonlit Reed", pity: 77, result: "other",  date: "2025-09-09" },
        { banner: "character", name: "Corvin",   pity: 66, result: "won",        date: "2025-11-23" },
        { banner: "weapon",    name: "Ashen Quill", pity: 48, result: "chosen",  date: "2026-01-17" },
        { banner: "character", name: "Odalys",   pity: 77, result: "lost",       date: "2026-03-30" },
        { banner: "character", name: "Pippin",   pity: 52, result: "guaranteed", date: "2026-06-21" },
        { banner: "standard",  name: "Thessaly", pity: 58, result: null,         date: "2026-08-14" }
      ],
      spend: []
    }
  };
})();
