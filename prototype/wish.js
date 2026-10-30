/* ============================================================
   Wish Counter — prototype
   Reads LEDGER_DATA.wishes (the last sync from claude.ai) and
   replays wishes logged here on top of it. Logged wishes live in
   localStorage under a key stamped with wishes.asOf, so a newer
   sync starts a clean log.
   ============================================================ */

(function () {
  "use strict";

  const D = window.LEDGER_DATA;
  const W = D.wishes;
  const RULES = W.rules;
  const BANNERS = ["character", "weapon", "standard"];
  const KEY = "akasha-wishes:" + W.asOf;
  const PRIMOS_PER_WISH = 160;

  /* ---------- storage ---------- */

  function readLog() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  }
  function writeLog(log) {
    try {
      localStorage.setItem(KEY, JSON.stringify(log));
      // Logs from older syncs are already folded into the new baseline.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith("akasha-wishes:") && k !== KEY) localStorage.removeItem(k);
      }
    } catch (e) {}
  }

  let log = readLog();
  let active = "character";

  /* ---------- replay: baseline + logged events → current state ---------- */

  function replay() {
    const s = {
      cur: { ...W.currency },
      b: {
        character: { ...W.banners.character },
        weapon: { ...W.banners.weapon },
        standard: { ...W.banners.standard }
      },
      history: W.history.map((h) => ({ ...h, synced: true })),
      logged: { character: 0, weapon: 0, standard: 0 },
      fours: { character: 0, weapon: 0, standard: 0 }
    };

    for (const ev of log) {
      if (ev.kind === "cur") { s.cur[ev.field] = ev.value; continue; }

      const B = s.b[ev.b];
      const fate = RULES[ev.b].fate;
      if (s.cur[fate] > 0) s.cur[fate]--;
      else s.cur.primogems -= PRIMOS_PER_WISH;

      s.logged[ev.b]++;
      B.pity5++;
      B.pity4++;
      if (ev.r === 4) { B.pity4 = 0; s.fours[ev.b]++; }
      if (ev.r === 5) {
        s.history.push({ banner: ev.b, name: ev.name || "Unnamed 5★", pity: B.pity5, result: ev.outcome || null, date: ev.date });
        B.pity5 = 0;
        if (ev.b === "character") B.guaranteed = ev.outcome === "lost";
        if (ev.b === "weapon") B.fatePoint = ev.outcome === "other" ? 1 : 0;
      }
    }
    return s;
  }

  /* ---------- odds ---------- */

  // Chance that wish number `i` since the last 5★ is a 5★.
  function rate(R, i) {
    if (i >= R.hard) return 1;
    if (i >= R.softStart) return Math.min(1, R.base + R.step * (i - R.softStart + 1));
    return R.base;
  }

  function isGuaranteed(bannerId, B) {
    if (bannerId === "character") return !!B.guaranteed;
    if (bannerId === "weapon") return B.fatePoint >= 1;
    return true; // standard has nothing to lose to
  }

  // Wishes needed to be 100% sure of the one you want.
  function sureThing(bannerId, B) {
    const R = RULES[bannerId];
    const toHard = R.hard - B.pity5;
    return isGuaranteed(bannerId, B) ? toHard : toHard + R.hard;
  }

  // Curves of "chance of at least one 5★" and "chance of the one you want"
  // after n more wishes, n = 0..maxN.
  function forecast(bannerId, B, maxN) {
    const R = RULES[bannerId];
    const any = [0], want = [0];

    let noneYet = 1;
    for (let n = 1; n <= maxN; n++) {
      noneYet *= 1 - rate(R, B.pity5 + n);
      any.push(1 - noneYet);
    }

    // Track probability mass over (pity, guaranteed) that hasn't got it yet.
    let states = new Map([[`${B.pity5}|${isGuaranteed(bannerId, B) ? 1 : 0}`, 1]]);
    let got = 0;
    const win = R.featuredRate == null ? 1 : R.featuredRate;
    for (let n = 1; n <= maxN; n++) {
      const next = new Map();
      const add = (k, p) => next.set(k, (next.get(k) || 0) + p);
      for (const [k, p] of states) {
        const [pity, g] = k.split("|").map(Number);
        const r = rate(R, pity + 1);
        add(`${pity + 1}|${g}`, p * (1 - r));
        if (g) got += p * r;
        else { got += p * r * win; add(`0|1`, p * r * (1 - win)); }
      }
      states = next;
      want.push(Math.min(1, got));
    }
    return { any, want };
  }

  function affordable(s, bannerId) {
    const fate = RULES[bannerId].fate;
    const fromPrimos = Math.max(0, Math.floor(s.cur.primogems / PRIMOS_PER_WISH));
    // Paimon's Bargains: 5 Starglitter per Fate, 5 Fates of each kind a month.
    const fromGlitter = Math.min(5, Math.floor((s.cur.starglitter || 0) / 5));
    return { total: fromPrimos + s.cur[fate] + fromGlitter, fromPrimos, fates: s.cur[fate], fromGlitter, fate };
  }

  /* ---------- helpers ---------- */

  const fmt = (n) => n.toLocaleString("en-US");
  const pct = (p) => (p >= 0.995 && p < 1 ? ">99" : Math.round(p * 100)) + "%";
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function featuredNames() {
    return D.patch.banners.map((b) => b.name);
  }

  function wantLabel(bannerId) {
    if (bannerId === "character") return "the featured 5★";
    if (bannerId === "weapon") return "your charted weapon";
    return "a 5★";
  }

  /* ---------- plain-English lines ---------- */

  function pityLine(bannerId, B) {
    const R = RULES[bannerId];
    const p = B.pity5;
    if (p >= R.softStart) {
      return `<b>You're in soft pity.</b> Every wish now has a big chance of a 5★, and wish ${R.hard} is a sure thing — at most <b>${R.hard - p}</b> to go.`;
    }
    return `<b>${p}</b> wishes since your last 5★. Odds stay low (${(R.base * 100).toFixed(1)}% a wish) until wish <b>${R.softStart}</b>, then climb fast. At wish ${R.hard} it's certain — <b>${R.hard - p}</b> to go at most.`;
  }

  function guaranteeChip(bannerId, B) {
    if (bannerId === "character") {
      return B.guaranteed
        ? `<span class="wc-chip good">Guaranteed</span><span class="wc-chip-note">You lost your last 50/50, so your next 5★ <b>is</b> the featured character of whichever banner you wish on (${esc(featuredNames().join(" or "))}).</span>`
        : `<span class="wc-chip">50/50</span><span class="wc-chip-note">Your next 5★ is a coin flip — about 55% it's the featured character of the banner you wish on (${esc(featuredNames().join(" or "))}), otherwise a standard character. Lose it and the one after is guaranteed. Both banners share this.</span>`;
    }
    if (bannerId === "weapon") {
      return B.fatePoint >= 1
        ? `<span class="wc-chip good">Fate Point 1/1</span><span class="wc-chip-note">Your next 5★ weapon <b>is</b> the one you charted.</span>`
        : `<span class="wc-chip">Fate Point 0/1</span><span class="wc-chip-note">Chart a weapon first. Your next 5★ has about a 38% chance of being it; if not, the one after is guaranteed.</span>`;
    }
    return `<span class="wc-chip">No 50/50</span><span class="wc-chip-note">Any 5★ from the permanent pool — nothing to win or lose here.</span>`;
  }

  /* ---------- render ---------- */

  function renderTabs(s) {
    return BANNERS.map((id) => {
      const B = s.b[id];
      return `<button type="button" class="wc-tab" role="tab" data-banner="${id}" aria-selected="${id === active}">
          <span class="wc-tab-name">${RULES[id].short}</span>
          <span class="wc-tab-pity num">${B.pity5}<i>/${RULES[id].hard}</i></span>
        </button>`;
    }).join("");
  }

  function renderMeter(bannerId, B) {
    const R = RULES[bannerId];
    const at = (n) => (n / R.hard) * 100;
    const soft = R.softStart - 1;
    const inSoft = B.pity5 >= soft;
    const pips = Array.from({ length: 10 }, (_, i) =>
      `<span class="wc-pip${i < B.pity4 ? " on" : ""}"></span>`).join("");
    return `
      <div class="wc-hero">
        <div class="wc-hero-num">
          <span class="wc-k">Wishes since last 5★</span>
          <span class="wc-big num" data-roll="${B.pity5}">${B.pity5}</span>
        </div>
        <div class="wc-meter${inSoft ? " soft" : ""}" role="img"
             aria-label="${B.pity5} of ${R.hard} wishes; soft pity from ${R.softStart}">
          <div class="wc-track">
            <span class="wc-softzone" style="left:${at(soft)}%"></span>
            <span class="wc-fill" style="width:${at(B.pity5)}%"></span>
          </div>
          <div class="wc-scale num">
            <span style="left:0">0</span>
            <span style="left:${at(soft)}%">${R.softStart}</span>
            <span style="left:100%">${R.hard}</span>
          </div>
        </div>
      </div>
      <p class="wc-line">${pityLine(bannerId, B)}</p>
      <div class="wc-four">
        <span class="wc-k">4★ within</span>
        <span class="wc-pips" aria-label="${B.pity4} of 10 wishes since last 4★">${pips}</span>
        <span class="wc-four-note">${10 - B.pity4 <= 0 ? "next wish" : `<b class="num">${10 - B.pity4}</b> wishes at most`}</span>
      </div>
      <div class="wc-guarantee">${guaranteeChip(bannerId, B)}</div>`;
  }

  function renderActions(bannerId) {
    return `
      <div class="wc-actions" role="group" aria-label="Log wishes">
        <button type="button" class="wc-btn" data-act="one" data-r="3"><b>+1</b><i>3★</i></button>
        <button type="button" class="wc-btn four" data-act="one" data-r="4"><b>+1</b><i>4★</i></button>
        <button type="button" class="wc-btn five" data-act="one" data-r="5"><b>+1</b><i>5★</i></button>
        <button type="button" class="wc-btn ten" data-act="ten"><b>+10</b><i>10-pull</i></button>
        <button type="button" class="wc-btn ghost" data-act="undo" ${log.length ? "" : "disabled"}><b>Undo</b><i>last log</i></button>
      </div>
      <div class="wc-tray" id="wc-tray" hidden></div>`;
  }

  function renderForecast(s, bannerId) {
    const B = s.b[bannerId];
    const R = RULES[bannerId];
    const a = affordable(s, bannerId);
    const sure = sureThing(bannerId, B);
    const maxN = Math.min(200, Math.max(sure, a.total, 10));
    const f = forecast(bannerId, B, maxN);
    const n = Math.min(a.total, maxN);
    const guaranteed = isGuaranteed(bannerId, B) && R.featuredRate != null;
    const hasWant = R.featuredRate != null && !guaranteed;
    const short = Math.max(0, sure - a.total);

    const fateName = a.fate === "intertwined" ? "Intertwined" : "Acquaint";
    const parts = [
      `<b class="num">${fmt(Math.max(0, s.cur.primogems))}</b> Primogems = ${a.fromPrimos}`,
      `<b class="num">${a.fates}</b> ${fateName} Fates`,
      a.fromGlitter ? `<b class="num">${s.cur.starglitter}</b> Starglitter = ${a.fromGlitter} more` : ""
    ].filter(Boolean).join(" · ");

    return `
      <div class="wc-forecast">
        <div class="wc-fc-head">
          <div>
            <span class="wc-k">Wishes you can afford</span>
            <span class="wc-afford num">${a.total}</span>
          </div>
          <p class="wc-afford-how">${parts}</p>
        </div>

        <div class="wc-tiles">
          <div class="wc-tile">
            <span class="wc-k">Chance of ${guaranteed ? esc(wantLabel(bannerId)) : "any 5★"}</span>
            <span class="wc-tile-v">${pct(f.any[n])}</span>
            <span class="wc-tile-note">if you use all ${a.total}${guaranteed ? " · guaranteed, so any 5★ is it" : ""}</span>
          </div>
          ${hasWant ? `
          <div class="wc-tile">
            <span class="wc-k">Chance of ${esc(wantLabel(bannerId))}</span>
            <span class="wc-tile-v">${pct(f.want[n])}</span>
            <span class="wc-tile-note">if you use all ${a.total}</span>
          </div>` : ""}
          <div class="wc-tile">
            <span class="wc-k">Sure thing after</span>
            <span class="wc-tile-v">${sure} <small>wishes</small></span>
            <span class="wc-tile-note">${short === 0
              ? `<span class="wc-ok">✓ you already have enough</span>`
              : `${short} short · ≈ ${fmt(short * PRIMOS_PER_WISH)} Primogems`}</span>
          </div>
        </div>

        ${renderChart(f, maxN, a.total, hasWant, bannerId)}
      </div>`;
  }

  /* ---------- odds chart (SVG, hover crosshair, table fallback) ---------- */

  const CH = 210, PAD = { l: 38, r: 14, t: 14, b: 26 };
  let chartState = null; // {f, maxN, afford, hasWant, bannerId}

  function renderChart(f, maxN, afford, hasWant, bannerId) {
    chartState = { f, maxN, afford, hasWant, bannerId };
    const legend = hasWant
      ? `<span class="lg"><span class="sw any"></span>Any 5★</span><span class="lg"><span class="sw want"></span>${esc(wantLabel(bannerId))}</span>`
      : "";

    const rows = [];
    for (let n = 10; n <= maxN; n += 10) rows.push(n);
    if (afford && afford <= maxN && !rows.includes(afford)) rows.push(afford);
    rows.sort((a, b) => a - b);
    const table = `<table class="wc-table"><thead><tr><th>Wishes</th><th>Any 5★</th>${hasWant ? `<th>${esc(wantLabel(bannerId))}</th>` : ""}</tr></thead>
      <tbody>${rows.map((n) => `<tr${n === afford ? ` class="hl"` : ""}><td class="num">${n}</td><td class="num">${pct(f.any[n])}</td>${hasWant ? `<td class="num">${pct(f.want[n])}</td>` : ""}</tr>`).join("")}</tbody></table>`;

    return `
      <figure class="wc-chart">
        <figcaption>
          <span class="wc-k">Your odds, wish by wish</span>
          <span class="wc-legend">${legend}</span>
        </figcaption>
        <div class="wc-plot"><div class="wc-tip" hidden></div></div>
        <details class="wc-tablebox"><summary>Show these odds as a table</summary>${table}</details>
      </figure>`;
  }

  // Drawn at the plot's real pixel width so text and lines are never stretched.
  function drawChart() {
    const plot = document.querySelector("#wish-panel .wc-plot");
    if (!plot || !chartState) return;
    const { f, maxN, afford, hasWant, bannerId } = chartState;
    const CW = Math.max(240, plot.clientWidth);
    const x = (n) => PAD.l + (n / maxN) * (CW - PAD.l - PAD.r);
    const y = (p) => PAD.t + (1 - p) * (CH - PAD.t - PAD.b);
    const path = (arr) => arr.map((p, n) => `${n ? "L" : "M"}${x(n).toFixed(1)},${y(p).toFixed(1)}`).join("");

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) =>
      `<line class="grid" x1="${PAD.l}" x2="${CW - PAD.r}" y1="${y(p)}" y2="${y(p)}"/>
       <text class="tick" x="${PAD.l - 6}" y="${y(p) + 3.5}" text-anchor="end">${p * 100}%</text>`).join("");
    const step = maxN > 120 ? 30 : maxN > 50 ? 20 : 10;
    let xTicks = "";
    for (let n = 0; n <= maxN; n += step) xTicks += `<text class="tick" x="${x(n)}" y="${CH - 8}" text-anchor="middle">${n}</text>`;

    const aN = Math.min(afford, maxN);
    const flip = aN > maxN * 0.6;
    const afMark = afford > 0 ? `
      <line class="afford" x1="${x(aN)}" x2="${x(aN)}" y1="${PAD.t}" y2="${CH - PAD.b}"/>
      <text class="afford-label" x="${x(aN) + (flip ? -6 : 6)}" y="${CH - PAD.b - 8}" text-anchor="${flip ? "end" : "start"}">you can afford ${afford}</text>` : "";
    const dots = `<circle class="dot any" cx="${x(aN)}" cy="${y(f.any[aN])}" r="4.5"/>
      ${hasWant ? `<circle class="dot want" cx="${x(aN)}" cy="${y(f.want[aN])}" r="4.5"/>` : ""}`;

    const old = plot.querySelector("svg");
    if (old) old.remove();
    plot.insertAdjacentHTML("afterbegin", `
      <svg width="${CW}" height="${CH}" viewBox="0 0 ${CW} ${CH}" aria-hidden="true">
        ${yTicks}${xTicks}
        <path class="area ${hasWant ? "want" : "any"}" d="${path(hasWant ? f.want : f.any)}L${x(maxN)},${y(0)}L${x(0)},${y(0)}Z"/>
        <path class="line any" d="${path(f.any)}"/>
        ${hasWant ? `<path class="line want" d="${path(f.want)}"/>` : ""}
        ${afMark}${dots}
        <line class="xhair" y1="${PAD.t}" y2="${CH - PAD.b}" x1="-10" x2="-10"/>
      </svg>`);

    const tip = plot.querySelector(".wc-tip");
    const xh = plot.querySelector(".xhair");
    const hide = () => { tip.hidden = true; xh.setAttribute("x1", -10); xh.setAttribute("x2", -10); };
    plot.onpointermove = (e) => {
      const px0 = e.clientX - plot.getBoundingClientRect().left;
      const n = Math.round(((px0 - PAD.l) / (CW - PAD.l - PAD.r)) * maxN);
      if (n < 1 || n > maxN) return hide();
      const px = x(n);
      xh.setAttribute("x1", px); xh.setAttribute("x2", px);
      tip.hidden = false;
      tip.innerHTML = `<b>After ${n} wish${n > 1 ? "es" : ""}</b>
        <span><span class="sw any"></span>Any 5★ <b class="num">${pct(f.any[n])}</b></span>
        ${hasWant ? `<span><span class="sw want"></span>${esc(wantLabel(bannerId))} <b class="num">${pct(f.want[n])}</b></span>` : ""}`;
      tip.style.left = Math.min(Math.max(px, 80), CW - 80) + "px";
    };
    plot.onpointerleave = hide;
  }

  window.addEventListener("resize", () => { clearTimeout(drawChart.t); drawChart.t = setTimeout(drawChart, 80); });

  /* ---------- history & luck ---------- */

  function luckLine(bannerId, list) {
    if (!list.length) return `No 5★s recorded on this banner yet.`;
    const avg = Math.round(list.reduce((t, h) => t + h.pity, 0) / list.length);
    const typical = RULES[bannerId].avgPity;
    const verdict = avg <= typical - 4 ? "luckier than most players"
      : avg >= typical + 4 ? "a bit unluckier than most players"
      : "right around normal";
    return `Your 5★s came at wish <b class="num">${avg}</b> on average. Most players land around ${typical}, so you've been <b>${verdict}</b>.`;
  }

  function renderHistory(s, bannerId) {
    const list = s.history.filter((h) => h.banner === bannerId);
    let record = "";
    if (bannerId === "character") {
      const won = list.filter((h) => h.result === "won").length;
      const lost = list.filter((h) => h.result === "lost").length;
      record = won + lost ? `<span class="wc-stat"><span class="wc-k wc-k-num">50/50s</span><b class="num">${won}</b> won · <b class="num">${lost}</b> lost</span>` : "";
    }
    const tag = (h) => ({
      won: `<span class="wc-res good">won 50/50</span>`,
      lost: `<span class="wc-res bad">lost 50/50</span>`,
      guaranteed: `<span class="wc-res">guaranteed</span>`,
      chosen: `<span class="wc-res good">charted</span>`,
      other: `<span class="wc-res bad">off-target</span>`
    }[h.result] || "");
    const R = RULES[bannerId];
    const items = list.slice().reverse().map((h) => `
      <li class="wc-h${h.synced ? "" : " fresh"}">
        <span class="wc-h-star" aria-hidden="true">★</span>
        <span class="wc-h-name">${esc(h.name)}</span>
        ${tag(h)}
        <span class="wc-h-bar" aria-hidden="true"><span style="width:${(h.pity / R.hard) * 100}%"></span></span>
        <span class="wc-h-pity num">${h.pity}</span>
      </li>`).join("");

    return `
      <div class="wc-history">
        <div class="wc-hist-head">
          <span class="wc-k">5★ history · ${RULES[bannerId].label}</span>
          <span class="wc-stats">
            ${record}
            <span class="wc-stat"><span class="wc-k">4★ logged here</span><b class="num">${s.fours[bannerId]}</b></span>
          </span>
        </div>
        <p class="wc-line">${luckLine(bannerId, list)}</p>
        ${items ? `<ol class="wc-h-list">${items}</ol>` : ""}
        <p class="wc-h-legend">Bar = how deep into pity each 5★ came. Shorter is luckier.</p>
      </div>`;
  }

  /* ---------- currency ---------- */

  function renderCurrency(s) {
    const cell = (field, label) => `
      <button type="button" class="wc-cur" data-field="${field}" title="Click to correct">
        <span class="wc-k">${label}</span><b class="num">${fmt(Math.max(0, s.cur[field]))}</b>
      </button>`;
    return `<div class="wc-currency">
      ${cell("primogems", "Primogems")}${cell("intertwined", "Intertwined")}${cell("acquaint", "Acquaint")}${cell("starglitter", "Starglitter")}
    </div>`;
  }

  /* ---------- the whole panel ---------- */

  function render() {
    const s = replay();
    const B = s.b[active];
    const loggedTotal = s.logged.character + s.logged.weapon + s.logged.standard;

    document.getElementById("wish-root").innerHTML = `
      <section class="panel pad-lg wish" id="wish-panel">
        <div class="wc-fx" aria-hidden="true"></div>
        <div class="panel-head">
          <h2>Wish Counter</h2>
          <span class="tag${loggedTotal ? " hot" : ""}">Synced ${W.asOfLabel}${loggedTotal ? ` + ${loggedTotal} logged here` : ""}</span>
        </div>

        ${renderCurrency(s)}
        <div class="wc-tabs" role="tablist">${renderTabs(s)}</div>

        <div class="wc-body">
          <div class="wc-col">
            ${renderMeter(active, B)}
            ${renderActions(active)}
          </div>
          <div class="wc-col">${renderForecast(s, active)}</div>
        </div>

        ${renderHistory(s, active)}

        <div class="wc-foot">
          <span>Wishes logged here stack on top of the ${W.asOfLabel} sync. When claude.ai sends newer numbers, this log clears itself.</span>
          <button type="button" class="icon-btn" data-act="copy">Copy update for claude.ai</button>
        </div>
      </section>`;

    renderRail(s);

    drawChart();
  }

  function renderRail(s) {
    const host = document.getElementById("wish-rail");
    if (!host) return;
    const row = (id) => {
      const B = s.b[id], R = RULES[id];
      const state = id === "character" ? (B.guaranteed ? "guaranteed" : "50/50")
        : id === "weapon" ? `fate pt ${B.fatePoint}/1` : "";
      return `<div class="wr-row">
          <span class="wr-name">${R.short}</span>
          <span class="wr-bar"><span style="width:${(B.pity5 / R.hard) * 100}%"></span><i style="left:${((R.softStart - 1) / R.hard) * 100}%"></i></span>
          <span class="wr-num num">${B.pity5}</span>
          <span class="wr-state">${state}</span>
        </div>`;
    };
    const a = affordable(s, "character");
    host.innerHTML = `
      <section class="panel wish-rail">
        <span class="cd-label">Wish pity</span>
        ${BANNERS.map(row).join("")}
        <p class="wr-afford"><b class="num">${a.total}</b> character wishes saved up</p>
      </section>`;
  }

  /* ---------- logging ---------- */

  const today = () => new Date().toISOString().slice(0, 10);
  let groupSeq = Date.now();

  function commit(events) {
    const g = ++groupSeq;
    const rs = events.map((e) => e.r);
    log.push(...events.map((e) => ({ ...e, g })));
    writeLog(log);
    render();
    if (rs.includes(5)) fx("five");
    else if (rs.includes(4)) fx("four");
  }

  function undo() {
    if (!log.length) return;
    const g = log[log.length - 1].g;
    log = log.filter((e) => e.g !== g);
    writeLog(log);
    render();
  }

  function fx(kind) {
    const host = document.querySelector("#wish-panel .wc-fx");
    if (!host) return;
    host.className = "wc-fx " + kind;
    void host.offsetWidth;
    host.classList.add("go");
  }

  // Ask who a 5★ was, then hand back {name, outcome}.
  function askFive(bannerId, label, done) {
    const tray = document.getElementById("wc-tray");
    const s = replay();
    let chips = "";
    if (bannerId === "character") {
      const g = s.b.character.guaranteed;
      chips = featuredNames().map((n) =>
        `<button type="button" class="wc-pick" data-name="${esc(n)}" data-outcome="${g ? "guaranteed" : "won"}">${esc(n)}</button>`).join("")
        + `<button type="button" class="wc-pick lost" data-outcome="lost">Someone else (lost 50/50)</button>`;
    } else if (bannerId === "weapon") {
      chips = `<button type="button" class="wc-pick" data-outcome="chosen">The one I charted</button>
               <button type="button" class="wc-pick lost" data-outcome="other">The other one</button>`;
    } else {
      chips = `<button type="button" class="wc-pick" data-outcome="">Save</button>`;
    }
    tray.hidden = false;
    tray.innerHTML = `
      <div class="wc-ask">
        <span class="wc-ask-star" aria-hidden="true">★</span>
        <span class="wc-k">${label}</span>
        <input type="text" class="wc-name" placeholder="Name (optional)" aria-label="5★ name">
        <div class="wc-picks">${chips}</div>
        <button type="button" class="wc-cancel" data-act="cancel">Cancel</button>
      </div>`;
    tray.querySelector(".wc-name").focus();
    tray.onclick = (e) => {
      const b = e.target.closest(".wc-pick, [data-act='cancel']");
      if (!b) return;
      if (b.dataset.act === "cancel") { closeTray(); return; }
      const typed = tray.querySelector(".wc-name").value.trim();
      done({ name: b.dataset.name || typed || "", outcome: b.dataset.outcome || null });
    };
  }

  function closeTray() {
    const tray = document.getElementById("wc-tray");
    if (tray) { tray.hidden = true; tray.innerHTML = ""; tray.onclick = null; }
  }

  function openTen(bannerId) {
    const tray = document.getElementById("wc-tray");
    const slots = Array(10).fill(3);
    const draw = () => {
      tray.innerHTML = `
        <div class="wc-ten">
          <p class="wc-ten-help">Tap a slot once for <b>4★</b>, twice for <b>5★</b>. Leave the rest — they're 3★.
             Slot order only matters for 5★s (it sets your pity exactly).</p>
          <div class="wc-slots">${slots.map((r, i) =>
            `<button type="button" class="wc-slot r${r}" data-i="${i}" aria-label="Wish ${i + 1}: ${r}★"><span class="num">${i + 1}</span><b>${r === 3 ? "" : r + "★"}</b></button>`).join("")}</div>
          <div class="wc-ten-row">
            <button type="button" class="wc-btn ten" data-act="save-ten"><b>Log 10 wishes</b><i>${slots.filter((r) => r === 4).length} × 4★ · ${slots.filter((r) => r === 5).length} × 5★</i></button>
            <button type="button" class="wc-cancel" data-act="cancel">Cancel</button>
          </div>
        </div>`;
    };
    tray.hidden = false;
    draw();
    tray.onclick = (e) => {
      const slot = e.target.closest(".wc-slot");
      if (slot) { const i = +slot.dataset.i; slots[i] = slots[i] === 5 ? 3 : slots[i] + 1; draw(); return; }
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "cancel") closeTray();
      if (act === "save-ten") {
        const events = slots.map((r) => ({ b: bannerId, r, date: today() }));
        const fives = events.filter((ev) => ev.r === 5);
        let k = 0;
        const next = () => {
          if (k >= fives.length) { closeTray(); commit(events); return; }
          askFive(bannerId, `5★ in slot ${events.indexOf(fives[k]) + 1} — who was it?`, (ans) => {
            Object.assign(fives[k], ans); k++; next();
          });
        };
        next();
      }
    };
  }

  function editCurrency(btn) {
    const field = btn.dataset.field;
    const s = replay();
    const input = document.createElement("input");
    input.type = "number"; input.min = "0"; input.className = "wc-cur-input num";
    input.value = Math.max(0, s.cur[field]);
    btn.querySelector("b").replaceWith(input);
    input.focus(); input.select();
    const save = () => {
      const v = Math.max(0, Math.floor(Number(input.value) || 0));
      if (v !== s.cur[field]) commit([{ kind: "cur", field, value: v }]);
      else render();
    };
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") save(); if (e.key === "Escape") render(); });
    input.addEventListener("blur", save);
  }

  function copyUpdate() {
    const s = replay();
    const lines = [`Wish update — logged in Akasha Terminal on top of the ${W.asOfLabel} sync:`];
    for (const id of BANNERS) {
      const B = s.b[id];
      const extra = id === "character" ? (B.guaranteed ? ", next 5★ guaranteed" : ", next 5★ is 50/50")
        : id === "weapon" ? `, Fate Point ${B.fatePoint}/1` : "";
      lines.push(`- ${RULES[id].label}: ${B.pity5} since last 5★, ${B.pity4} since last 4★${extra} (${s.logged[id]} wishes logged)`);
    }
    lines.push(`- Resources: ${fmt(Math.max(0, s.cur.primogems))} Primogems, ${s.cur.intertwined} Intertwined, ${s.cur.acquaint} Acquaint, ${s.cur.starglitter} Starglitter`);
    const fresh = s.history.filter((h) => !h.synced);
    for (const h of fresh) lines.push(`- New 5★: ${h.name} (${RULES[h.banner].label}, pity ${h.pity}${h.result ? ", " + h.result : ""}, ${h.date})`);
    const text = lines.join("\n");
    navigator.clipboard?.writeText(text).then(
      () => flash("Copied — paste it into your Genshin project on claude.ai"),
      () => flash("Couldn't reach the clipboard")
    );
  }

  function flash(msg) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(flash.t);
    flash.t = setTimeout(() => t.classList.remove("show"), 2200);
  }

  /* ---------- events ---------- */

  document.addEventListener("click", (e) => {
    const root = e.target.closest("#wish-panel");
    if (!root) return;
    const tab = e.target.closest(".wc-tab");
    if (tab) { active = tab.dataset.banner; render(); return; }
    const cur = e.target.closest(".wc-cur");
    if (cur && !cur.querySelector("input")) { editCurrency(cur); return; }
    const btn = e.target.closest("[data-act]");
    if (!btn || btn.closest("#wc-tray")) return;
    const act = btn.dataset.act;
    if (act === "undo") undo();
    if (act === "copy") copyUpdate();
    if (act === "ten") openTen(active);
    if (act === "one") {
      const r = Number(btn.dataset.r);
      if (r < 5) commit([{ b: active, r, date: today() }]);
      else askFive(active, "Nice — who did you get?", (ans) => { closeTray(); commit([{ b: active, r: 5, date: today(), ...ans }]); });
    }
  });

  render();
})();
