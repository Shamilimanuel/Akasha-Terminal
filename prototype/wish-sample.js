/*
 * PROTOTYPE ONLY — sample numbers, not a real account.
 * The real version lives in data.js as LEDGER_DATA.wishes, filled from the
 * Wishing Status section of your own player profile notes.
 */
window.LEDGER_DATA.wishes = {
  // The day these numbers were true. Wishes logged in the dashboard are
  // stored against this date, so a newer sync starts a fresh local log.
  asOf: "2026-10-14",
  asOfLabel: "Oct 14",

  currency: { primogems: 6400, intertwined: 7, acquaint: 12, starglitter: 25 },

  banners: {
    character: { pity5: 33, pity4: 4, guaranteed: false },
    weapon:    { pity5: 12, pity4: 7, fatePoint: 0 },
    standard:  { pity5: 51, pity4: 2 }
  },

  // 5★ results only. result: "won" | "lost" | "guaranteed" (character),
  // "chosen" | "other" (weapon), null (standard).
  history: [
    { banner: "character", name: "Sample A", pity: 77, result: "won",        date: "2026-03-02" },
    { banner: "character", name: "Sample B", pity: 68, result: "lost",       date: "2026-05-19" },
    { banner: "character", name: "Sample C", pity: 81, result: "guaranteed", date: "2026-07-08" },
    { banner: "standard",  name: "Sample D", pity: 64, result: null,         date: "2026-04-11" }
  ],

  // Game rules (gameplay facts, not account data). Odds per wish: `base`
  // until `softStart`, then +`step` per wish, certain at `hard`.
  // featuredRate: chance a non-guaranteed 5★ is the one you want
  // (~55% on character banners since Capturing Radiance; 37.5% for one
  // specific weapon without a Fate Point). avgPity: typical 5★ pity.
  rules: {
    character: { label: "Character Event", short: "Character", hard: 90, softStart: 74, base: 0.006, step: 0.06, featuredRate: 0.55, avgPity: 62, fate: "intertwined" },
    weapon:    { label: "Weapon Event",    short: "Weapon",    hard: 80, softStart: 63, base: 0.007, step: 0.07, featuredRate: 0.375, avgPity: 54, fate: "intertwined" },
    standard:  { label: "Standard",        short: "Standard",  hard: 90, softStart: 74, base: 0.006, step: 0.06, featuredRate: null,  avgPity: 62, fate: "acquaint" }
  }
};
