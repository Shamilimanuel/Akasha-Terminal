/**
 * Akasha Terminal — renderer
 * ------------------------------------------------------------
 * Reads window.LEDGER_DATA (data.js) and builds the page.
 * Content changes go in data.js; layout/behavior changes here
 * and in style.css.
 */
(function () {
  const D = window.LEDGER_DATA;
  const app = document.getElementById("app");
  const bootEl = document.getElementById("boot");

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ============================================================
     Theme
     ============================================================ */

  const THEME_KEY = "akasha-theme";

  function readTheme() {
    try { return localStorage.getItem(THEME_KEY) || "auto"; } catch { return "auto"; }
  }

  function applyTheme(mode) {
    const root = document.documentElement;
    if (mode === "light" || mode === "dark") root.setAttribute("data-theme", mode);
    else root.removeAttribute("data-theme");
    try {
      if (mode === "auto") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, mode);
    } catch { /* private mode — theme just won't persist */ }
    app.querySelectorAll(".theme-switch button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.theme === mode));
    });
  }

  /* ============================================================
     Boot sequence
     ============================================================ */

  const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/\\<>*";

  function scramble(node, text, duration) {
    if (reducedMotion) { node.textContent = text; return; }

    const start = performance.now();
    let settled = false;

    // rAF stops firing in a background tab, which would strand the title as
    // gibberish — so guarantee the resolved text on a timer either way.
    const settle = () => {
      if (settled) return;
      settled = true;
      node.textContent = text;
    };

    const frame = (now) => {
      if (settled) return;
      const p = Math.min(1, (now - start) / duration);
      if (p >= 1) { settle(); return; }
      const locked = Math.floor(p * text.length);
      let out = text.slice(0, locked);
      for (let i = locked; i < text.length; i++) {
        out += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      node.textContent = out;
      requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
    setTimeout(settle, duration + 120);
  }

  function sigilSVG() {
    return `
      <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <g class="ring-outer">
          <circle cx="60" cy="60" r="54" stroke="var(--accent)" stroke-width="1" opacity=".3"
                  stroke-dasharray="14 9"/>
          <circle cx="60" cy="60" r="47" stroke="var(--accent-2)" stroke-width="1" opacity=".22"
                  stroke-dasharray="3 12"/>
        </g>
        <g class="ring-mid">
          <polygon points="60,20 95,40 95,80 60,100 25,80 25,40"
                   stroke="var(--accent)" stroke-width="1" opacity=".45" fill="none"/>
        </g>
        <g class="ring-core">
          <polygon points="60,34 82,54 60,90 38,54" fill="var(--accent-soft)"
                   stroke="var(--accent)" stroke-width="1.4" stroke-linejoin="round"/>
          <polygon points="60,34 82,54 60,54" fill="var(--accent)" opacity=".55"/>
          <polygon points="60,34 38,54 60,54" fill="var(--accent)" opacity=".3"/>
          <polygon points="38,54 60,54 60,90" fill="var(--accent)" opacity=".18"/>
          <polygon points="82,54 60,54 60,90" fill="var(--accent)" opacity=".4"/>
        </g>
      </svg>`;
  }

  function bootChecks() {
    return [
      ["HANDSHAKE", "LINKED"],
      ["DECRYPT LEDGER", "OK"],
      [`ADVENTURE RANK ${D.player.ar}`, "VERIFIED"],
      [`WORLD LEVEL ${D.player.wl}`, "VERIFIED"],
      ["SYNC master-guide", "OK"],
      ["SYNC player-profile", "OK"],
      [`PATCH ${D.patch.version.split(" — ")[0]}`, "CURRENT"],
      [`STORY LOCK ${D.player.story}`, "ENFORCED", true]
    ];
  }

  function runBoot(node, done) {
    if (reducedMotion) { node.remove(); done(); return; }

    const checks = bootChecks();
    node.innerHTML = `
      <div class="boot-inner">
        <div class="boot-sigil">${sigilSVG()}</div>
        <div class="boot-title" id="boot-title">AKASHA</div>
        <div class="boot-sub">Establishing Link</div>
        <div class="boot-log" id="boot-log"></div>
        <div class="boot-bar">
          <div class="boot-track"><div class="boot-fill" id="boot-fill"></div></div>
          <div class="boot-meta">
            <span id="boot-status">Reading node</span>
            <span class="pct num" id="boot-pct">0%</span>
          </div>
        </div>
      </div>
      <div class="boot-skip">Click anywhere to skip</div>`;

    scramble(node.querySelector("#boot-title"), "AKASHA", 900);

    const log = node.querySelector("#boot-log");
    const fill = node.querySelector("#boot-fill");
    const pct = node.querySelector("#boot-pct");
    const status = node.querySelector("#boot-status");

    const STEP = 210;
    const timers = [];
    let finished = false;

    checks.forEach(([key, val, warn], i) => {
      timers.push(setTimeout(() => {
        const line = document.createElement("div");
        line.className = "boot-line" + (warn ? " warn" : "");
        line.innerHTML =
          `<span class="bl-key">${key}</span><span class="bl-dots"></span><span class="bl-val">${val}</span>`;
        log.appendChild(line);

        const p = Math.round(((i + 1) / checks.length) * 100);
        fill.style.width = p + "%";
        pct.textContent = p + "%";
        status.textContent = i === checks.length - 1 ? "Link stable" : "Reading node";
      }, 380 + i * STEP));
    });

    const grantAt = 380 + checks.length * STEP + 160;
    timers.push(setTimeout(() => {
      const granted = document.createElement("div");
      granted.className = "boot-granted";
      granted.textContent = "Access Granted";
      log.appendChild(granted);
    }, grantAt));

    timers.push(setTimeout(finish, grantAt + 620));

    function finish() {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      node.removeEventListener("click", finish);
      window.removeEventListener("keydown", onKey);
      node.classList.add("done");
      setTimeout(() => node.remove(), 520);
      done();
    }

    function onKey() { finish(); }

    node.addEventListener("click", finish);
    window.addEventListener("keydown", onKey);
  }

  /* ============================================================
     Countdown
     ============================================================ */

  function splitDuration(ms) {
    const s = Math.floor(ms / 1000);
    return {
      d: Math.floor(s / 86400),
      h: Math.floor((s % 86400) / 3600),
      m: Math.floor((s % 3600) / 60),
      s: s % 60
    };
  }

  const pad = (n) => String(n).padStart(2, "0");

  function countdownMarkup() {
    // new Date(null) is epoch 0, not Invalid Date — check for null first.
    if (D.patch.bannerEndsAt == null) return `<div class="cd-abs">${D.patch.bannerEndsLabel}</div>`;
    const end = new Date(D.patch.bannerEndsAt).getTime();
    if (!Number.isFinite(end)) return `<div class="cd-abs">${D.patch.bannerEndsLabel}</div>`;

    const left = end - Date.now();
    if (left <= 0) {
      return `
        <div class="cd-ended">Banner window closed</div>
        <div class="cd-abs">${D.patch.bannerEndsLabel} — data may be out of date.</div>`;
    }

    const t = splitDuration(left);
    return `
      <div class="cd-clock">
        <span class="cd-unit"><b class="num">${pad(t.d)}</b><i>days</i></span>
        <span class="cd-unit"><b class="num">${pad(t.h)}</b><i>hrs</i></span>
        <span class="cd-unit"><b class="num">${pad(t.m)}</b><i>min</i></span>
        <span class="cd-unit sec"><b class="num">${pad(t.s)}</b><i>sec</i></span>
      </div>
      <div class="cd-abs">${D.patch.bannerEndsLabel}</div>`;
  }

  function startCountdown() {
    const host = document.getElementById("cd-body");
    if (!host) return;
    const tick = () => { host.innerHTML = countdownMarkup(); };
    tick();
    setInterval(tick, 1000);
  }

  /* ============================================================
     Count-up
     ============================================================ */

  function countUp(node, target, duration) {
    if (reducedMotion || target <= 0) { node.textContent = target; return; }
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = Math.round(target * eased);
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  function runCounters() {
    app.querySelectorAll("[data-count]").forEach((node) => {
      countUp(node, Number(node.dataset.count), 900);
    });
  }

  /* ============================================================
     Clipboard
     ============================================================ */

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch { /* fall through to the legacy path */ }

    // file:// pages don't always get the async clipboard API.
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }

  let toastTimer;
  function toast(msg) {
    const node = document.getElementById("toast");
    if (!node) return;
    node.textContent = msg;
    node.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove("show"), 1900);
  }

  /* ============================================================
     Markup
     ============================================================ */

  function gemSVG() {
    return `
      <svg class="gem" width="34" height="34" viewBox="0 0 48 48" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
        <polygon points="24,3 40,17 24,45 8,17" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.6" stroke-linejoin="round"/>
        <polygon points="24,3 40,17 24,17" fill="var(--accent)" opacity="0.55"/>
        <polygon points="24,3 8,17 24,17" fill="var(--accent)" opacity="0.3"/>
        <polygon points="8,17 24,17 24,45" fill="var(--accent)" opacity="0.18"/>
        <polygon points="40,17 24,17 24,45" fill="var(--accent)" opacity="0.4"/>
        <line x1="24" y1="3" x2="24" y2="45" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>
        <line x1="8" y1="17" x2="40" y2="17" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>
      </svg>`;
  }

  function renderTopbar() {
    const mode = readTheme();
    const btn = (m, label) =>
      `<button type="button" data-theme="${m}" aria-pressed="${mode === m}">${label}</button>`;

    return `
      <header class="topbar">
        <div class="brand">
          ${gemSVG()}
          <div class="brand-text">
            <h1>Akasha Terminal</h1>
            <span class="tagline">${D.meta.note}</span>
          </div>
        </div>
        <div class="topbar-right">
          <span class="sync"><span class="pulse"></span>Synced ${D.meta.lastSynced}</span>
          <button type="button" class="icon-btn" id="resync">Re-sync</button>
          <div class="theme-switch" role="group" aria-label="Color theme">
            ${btn("auto", "Auto")}${btn("light", "Light")}${btn("dark", "Dark")}
          </div>
        </div>
      </header>`;
  }

  function renderIdentity() {
    return `
      <section class="panel identity">
        <div class="ar-block">
          <div class="ar-big">
            <span class="k">Adventure Rank</span>
            <span class="v num" data-count="${D.player.ar}">0</span>
          </div>
          <div class="ar-side">
            <span class="mini"><span class="k">World Lv.</span><span class="v num" data-count="${D.player.wl}">0</span></span>
          </div>
        </div>
        <div class="meta-list">
          <div class="meta-row"><span class="k">Story</span><span class="v">${D.player.story}</span></div>
          <div class="meta-row"><span class="k">Region</span><span class="v">${D.player.region}</span></div>
        </div>
      </section>`;
  }

  function renderCountdown() {
    return `
      <section class="panel">
        <span class="cd-label">${D.patch.bannerEndsAt == null ? "Banner window" : "Banner ends in"}</span>
        <div id="cd-body"></div>
      </section>`;
  }

  // data.js uses null for "research hasn't settled this" — show that as a
  // flagged gap so it reads as an open question, not as a missing field.
  const GAP_TEXT = "Not pinned down in research";

  // Ascension and talent material rows, in the order they're farmed.
  const MAT_ASCENSION = [
    ["Local", "local"],
    ["Gem", "gem"],
    ["Common", "common"],
    ["Boss", "boss"]
  ];
  const MAT_TALENT = [
    ["Book", "book"],
    ["Mob drop", "talCommon"],
    ["Weekly", "talBoss"]
  ];

  const detailRow = (k, v) =>
    `<span class="ub-row${v == null ? " is-gap" : ""}">` +
      `<span class="ub-k">${k}</span>` +
      `<span class="ub-v">${v == null ? GAP_TEXT : v}</span>` +
    `</span>`;

  /**
   * Materials for one character, looked up by the name their card already
   * uses. Entries flagged `lowerConfidence` say so out loud rather than
   * sitting alongside corroborated data as if equally solid.
   */
  function materialRows(name) {
    const m = D.materials && D.materials[name];
    if (!m) return "";

    const group = (label, fields) => `
      <span class="mat-group">
        <span class="mat-g-k">${label}</span>
        ${fields.map(([k, f]) => detailRow(k, m[f])).join("")}
      </span>`;

    return `
      <span class="mat">
        <span class="mat-head">
          <span class="mat-title">Materials</span>
          ${m.lowerConfidence ? '<span class="mat-flag">Worth an in-game check</span>' : ""}
        </span>
        ${group("Ascension", MAT_ASCENSION)}
        ${group("Talents", MAT_TALENT)}
      </span>`;
  }

  function cardDetail(name, build, note) {
    if (!build) return "";

    const row = detailRow;

    // Short ER targets are numbers and get the mono treatment; the ones that
    // are really a sentence ("no fixed %, ATK first…") would look wrong in it.
    const er =
      build.er == null
        ? null
        : `<b class="${build.er.length <= 30 ? "num" : ""}">${build.er}</b>`;

    return `
      <span class="unit-build">
        <span class="ub-inner">
          ${row("5★ BiS", build.weapon5)}
          ${row("F2P / 4★", build.weaponAlt)}
          ${row("Artifacts", build.artifact)}
          ${row("Target ER", er)}
          ${note ? `<span class="ub-note">${note}</span>` : ""}
          ${materialRows(name)}
        </span>
      </span>`;
  }

  function renderSquad() {
    const units = D.squad.members
      .map(
        (m, i) => `
        <button type="button" class="unit el-${m.element}" data-unit="${i}" aria-pressed="false">
          <span class="unit-top">
            <span class="name">${m.name}</span>
            <span class="rank">${m.rank}</span>
          </span>
          <span class="role">${m.role}</span>
          <span class="unit-foot">
            <span class="el-mark"></span>
            <span class="el-name">${m.elementLabel}</span>
            <span class="sep">/</span>
            <span>${m.status}</span>
            <span class="unit-more">Build ▾</span>
          </span>
          ${cardDetail(m.name, m.build)}
        </button>`
      )
      .join("");

    const steps = rotationSteps()
      .map((s, i) => `<span class="step" data-step="${i}"><span class="i num">${i + 1}</span>${s}</span>`)
      .join("");

    return `
      <section class="panel pad-lg">
        <div class="panel-head">
          <h2>${D.squad.title}</h2>
          <span class="tag hot">${D.squad.tag}</span>
        </div>
        <div class="squad-grid">${units}</div>
        <div class="rotation">
          <div class="rotation-head">
            <span class="rotation-label">Rotation</span>
            <span class="rot-hint">Tap a character for their build + rotation steps</span>
          </div>
          <div class="steps" id="steps">${steps}</div>
          <p class="rotation-note">${D.squad.rotationNote}</p>
        </div>
      </section>`;
  }

  function rotationSteps() {
    return D.squad.rotation.split("→").map((s) => s.trim()).filter(Boolean);
  }

  const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function openOn(day) {
    return D.farming.targets.filter((t) => t.days.includes(day));
  }

  // Walk forward to the next day any P1 talent domain is open.
  function nextOpen(today) {
    for (let i = 1; i <= 7; i++) {
      const d = (today + i) % 7;
      const who = openOn(d);
      if (who.length) return { day: d, who };
    }
    return null;
  }

  /* ============================================================
     Daily routine
     ============================================================ */

  // Today's ticks only — the date is part of the key, so the list
  // starts clean each morning without needing a reset step.
  const ROUTINE_PREFIX = "akasha-routine-";

  function routineKey() {
    const d = new Date();
    return `${ROUTINE_PREFIX}${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function readRoutine() {
    try {
      const raw = localStorage.getItem(routineKey());
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }

  function writeRoutine(done) {
    try {
      const key = routineKey();
      localStorage.setItem(key, JSON.stringify([...done]));
      // Drop yesterday's (and older) keys so this can't grow forever.
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(ROUTINE_PREFIX) && k !== key) localStorage.removeItem(k);
      }
    } catch { /* private mode — ticks just won't persist */ }
  }

  // The resin step is the only one whose body depends on the day.
  function resinBody(step) {
    const today = new Date().getDay();
    const open = openOn(today);

    let plan;
    if (open.length) {
      plan = open
        .map(
          (t) => `
          <span class="rt-line el-${t.element}">
            <span class="el-mark"></span>
            <span class="rt-line-main">
              <b>${t.name}</b>
              <i>${t.domain} · ${t.domainRegion} · ${t.book}</i>
            </span>
            <span class="pill good">Open</span>
          </span>`
        )
        .join("");
    } else {
      const next = nextOpen(today);
      plan = `
        <span class="rt-empty">${D.farming.emptyLabel}</span>
        <span class="rt-sub-k">${step.fallbackLabel}</span>
        ${step.routes
          .map(
            (r) => `
            <span class="rt-line">
              <span class="rt-line-main"><b>${r.set}</b><i>${r.who}</i></span>
            </span>`
          )
          .join("")}
        ${next
          ? `<span class="rt-next"><span class="k">Next domain</span>${DAY_NAMES[next.day]} — ${next.who
              .map((t) => t.name)
              .join(", ")}</span>`
          : ""}`;
    }

    const weeklies = step.weeklies
      .map(
        (w) => `
        <span class="rt-line dim">
          <span class="rt-line-main"><b>${w.name}</b><i>${w.who}</i></span>
        </span>`
      )
      .join("");

    return `
      <span class="rt-plan">${plan}</span>
      <span class="rt-weeklies">
        <span class="rt-sub-k">${step.weekliesLabel}</span>
        ${weeklies}
      </span>`;
  }

  function renderRoutine() {
    const done = readRoutine();
    const R = D.routine;
    const today = new Date().getDay();

    const steps = R.steps
      .map((s, i) => {
        const isDone = done.has(s.id);
        const badge = s.budget || s.cadence;
        return `
        <li>
          <button type="button" class="rt-step" data-step-id="${s.id}" aria-pressed="${isDone}">
            <span class="rt-check" aria-hidden="true"><span class="rt-i num">${i + 1}</span></span>
            <span class="rt-body">
              <span class="rt-head">
                <span class="rt-label">${s.label}</span>
                ${badge ? `<span class="rt-badge">${badge}</span>` : ""}
              </span>
              <span class="rt-detail">${s.detail}</span>
              ${s.kind === "resin" ? resinBody(s) : ""}
            </span>
          </button>
        </li>`;
      })
      .join("");

    return `
      <section class="panel pad-lg routine">
        <div class="panel-head">
          <h2>${R.title}</h2>
          <span class="tag" id="routine-tally">${done.size} / ${R.steps.length}</span>
        </div>
        <p class="routine-goal">
          <span class="k">${R.goalLabel}</span>${R.goal}
        </p>
        <ol class="routine-list" id="routine-list">${steps}</ol>
        <p class="routine-note">
          <span class="rn-day">${DAY_NAMES[today]}</span>${R.note}
        </p>
      </section>`;
  }

  function renderAbyss() {
    const mark = (text) =>
      D.abyss.clash
        ? text.split(D.abyss.clash).join(`<span class="clash">${D.abyss.clash}</span>`)
        : text;

    const teams = D.abyss.teams
      .map(
        (t) => `
        <div class="abyss-team">
          <span class="k">${t.label}</span>
          <span class="v">${mark(t.members)}</span>
        </div>`
      )
      .join("");

    return `
      <section class="panel">
        <div class="panel-head">
          <h2>${D.abyss.title}</h2>
          <span class="tag warn">Conflict</span>
        </div>
        <div class="abyss-teams">${teams}</div>
        <p class="abyss-conflict">${mark(D.abyss.conflict)}</p>
        <p class="abyss-fix"><span class="k">Resolution</span>${D.abyss.resolution}</p>
      </section>`;
  }

  function renderUnconfirmed() {
    const items = D.unconfirmed.items
      .map(
        (it) => `
        <div class="unc-item">
          <span class="unc-subject">${it.subject}</span>
          <span class="unc-text">${it.text}</span>
        </div>`
      )
      .join("");

    return `
      <section class="panel unconfirmed">
        <div class="panel-head">
          <h2>${D.unconfirmed.title}</h2>
          <span class="tag warn">${D.unconfirmed.items.length} open</span>
        </div>
        <div class="unc-list">${items}</div>
      </section>`;
  }

  function renderLinks() {
    const rows = D.links.items
      .map(
        (l) => `
        <a class="link-row" href="${l.url}" target="_blank" rel="noopener noreferrer">
          <span class="link-main">
            <span class="link-label">${l.label}</span>
            <span class="link-note">${l.note}</span>
          </span>
          <span class="link-arrow" aria-hidden="true">↗</span>
        </a>`
      )
      .join("");

    return `
      <section class="panel">
        <div class="panel-head"><h2>${D.links.title}</h2></div>
        <div class="link-list">${rows}</div>
      </section>`;
  }

  function renderPatch() {
    const banners = D.patch.banners
      .map(
        (b) => `
        <div class="banner el-${b.element}">
          <span class="el-mark"></span>
          <span class="bname">${b.name}</span>
          <span class="bel">${b.elementLabel}</span>
        </div>`
      )
      .join("");
    const pctKnown = D.patch.progressPct != null;

    return `
      <section class="panel">
        <div class="panel-head">
          <h2>Patch Status</h2>
          <span class="tag">${D.patch.version.split(" — ")[0]}</span>
        </div>
        <div class="banner-row">${banners}</div>
        <div class="progress-wrap">${pctKnown ? `
          <div class="progress-track" role="img" aria-label="Patch phase ${D.patch.progressPct}% elapsed">
            <div class="progress-fill" style="width:${D.patch.progressPct}%"></div>
          </div>` : ""}
          <div class="progress-cap">
            <span>${pctKnown ? `${D.patch.progressPct}% elapsed` : "Phase progress unknown"}</span>
            <span class="next">${D.patch.nextLabel}</span>
          </div>
        </div>
      </section>`;
  }

  function renderCodes() {
    const rows = D.codes.items
      .map((c) => {
        const live = c.status === "good";
        const attrs = live
          ? `type="button" data-code="${c.code}"`
          : `type="button" disabled aria-label="${c.code} — expired"`;
        return `
          <button class="code-row ${live ? "" : "is-dead"}" ${attrs}>
            <span class="code-main">
              <span class="code-name">${c.code}</span>
              <span class="code-reward">${c.reward}</span>
            </span>
            <span class="code-side">
              ${live ? '<span class="copy-hint">Copy</span>' : ""}
              <span class="pill ${c.status}">${c.label}</span>
            </span>
          </button>`;
      })
      .join("");

    return `
      <section class="panel">
        <div class="panel-head">
          <h2>Redeem Codes</h2>
          <span class="tag">${D.codes.verifiedLabel}</span>
        </div>
        <div class="code-list">${rows}</div>
      </section>`;
  }

  function renderNotices() {
    const rows = D.notices
      .map(
        (n) => `
        <div class="notice">
          <span class="date">${n.date}</span>
          <span class="marker"></span>
          <span class="txt">${n.text}</span>
        </div>`
      )
      .join("");

    return `
      <section class="panel">
        <div class="panel-head"><h2>Notices</h2></div>
        <div class="timeline">${rows}</div>
      </section>`;
  }

  function renderRoster() {
    const total = D.roster.tiles.reduce((sum, t) => sum + t.n, 0) || 1;
    const segs = D.roster.tiles
      .map((t, i) => `<span class="roster-seg s${i}" style="width:${(t.n / total) * 100}%"></span>`)
      .join("");
    const tiles = D.roster.tiles
      .map(
        (t, i) =>
          `<div class="tile t${i}"><div class="n num" data-count="${t.n}">0</div><div class="l">${t.label}</div></div>`
      )
      .join("");
    const benchItems = D.roster.bench
      .map(
        (b) => `
        <button type="button" class="bench-item el-${b.element}" data-expand aria-expanded="false">
          <span class="bi-head">
            <span class="bi-name">${b.name}</span>
            <span class="bi-status">${b.status}</span>
          </span>
          <span class="bi-meta">
            <span class="el-mark"></span>
            <span class="el-name">${b.elementLabel}</span>
            <span class="sep">/</span>
            <span>${b.weapon}</span>
          </span>
          <span class="bi-note">${b.note}</span>
          <span class="unit-more">Build ▾</span>
          ${cardDetail(b.name, b.build)}
        </button>`
      )
      .join("");

    return `
      <section class="panel">
        <div class="panel-head">
          <h2>Roster Snapshot</h2>
          <span class="tag">${total} owned</span>
        </div>
        <div class="roster-bar" role="img" aria-label="Roster split across ${total} characters">${segs}</div>
        <div class="tiles">${tiles}</div>
        <div class="bench-block">
          <span class="k">Priority 1 — unbuilt</span>
          <span class="p1-unbuilt">${D.roster.p1Unbuilt}</span>
        </div>
        <div class="bench-block">
          <span class="k">${D.roster.benchTitle}</span>
          <div class="bench-items">${benchItems}</div>
        </div>
        <div class="depri">
          <span class="k">Deprioritized</span>
          <span class="depri-names">${D.roster.deprioritized.names}</span>
          <span class="depri-note">${D.roster.deprioritized.note}</span>
        </div>
      </section>`;
  }

  /**
   * Reference roster — build data for everyone outside the squad/bench.
   * Deliberately lower-weight than the priority panels: it answers
   * "what does this character want?", never "what should I build next?".
   */
  function renderReference() {
    const list = D.roster.reference;
    if (!list || !list.length) return "";

    const counts = list.reduce((acc, c) => {
      acc[c.element] = (acc[c.element] || 0) + 1;
      return acc;
    }, {});

    const chip = (el, label, n, on) =>
      `<button type="button" class="ref-chip${el === "all" ? "" : ` el-${el}`}" data-el="${el}" aria-pressed="${on}">
         ${label}<span class="num">${n}</span>
       </button>`;

    const filters =
      chip("all", "All", list.length, true) +
      Object.keys(counts)
        .map((el) => {
          const label = list.find((c) => c.element === el).elementLabel;
          return chip(el, label, counts[el], false);
        })
        .join("");

    const cards = list
      .map(
        (c) => `
        <button type="button" class="ref-card el-${c.element}" data-expand data-el="${c.element}" aria-expanded="false">
          <span class="rc-head">
            <span class="el-mark"></span>
            <span class="rc-name">${c.name}</span>
            ${c.rarity ? `<span class="rc-rarity num">${c.rarity}</span>` : ""}
          </span>
          <span class="rc-meta">${c.elementLabel} <span class="sep">/</span> ${c.weapon}</span>
          <span class="rc-kit">${c.kit}</span>
          <span class="unit-more">Build ▾</span>
          ${cardDetail(c.name, c.build, c.note)}
        </button>`
      )
      .join("");

    return `
      <section class="panel pad-lg reference">
        <div class="panel-head">
          <h2>${D.roster.referenceTitle}</h2>
          <span class="tag">${list.length} records</span>
        </div>
        <p class="ref-note">${D.roster.referenceNote}</p>
        <div class="ref-filters" id="ref-filters" role="group" aria-label="Filter reference roster by element">${filters}</div>
        <div class="ref-grid" id="ref-grid">${cards}</div>
        <p class="ref-empty" id="ref-empty" hidden>No characters match that element.</p>
      </section>`;
  }

  function renderFooter() {
    return `
      <footer>
        ${D.footer.line1}<br>
        <span class="dim">${D.footer.line2}</span>
      </footer>`;
  }

  /* ============================================================
     Wish Counter
     Reads D.wishes (the last sync from claude.ai) and replays the
     wishes logged here on top of it. Logged wishes live in
     localStorage under a key stamped with wishes.asOf, so a newer
     sync starts a clean log. Wrapped in its own module so its
     helper names can't collide with the rest of this file.
     ============================================================ */

  const Wish = (function () {
    // Pity, 50/50 state and 5★ history come from the game when the import
    // has run (sync-wishes.ps1 → wishes-sync.js → D.wishesSync), otherwise from
    // the claude.ai sync in data.js. Until one exists the panel says so
    // instead of inventing a starting point.
    const SYNC = D.wishesSync || null;
    const W = Object.assign({}, D.wishes || {}, SYNC
      ? { asOf: SYNC.asOf, asOfLabel: SYNC.asOfLabel, banners: SYNC.banners, history: SYNC.history }
      : {});
    const fromGame = !!SYNC;
    const synced = !!(W.asOf && W.banners);
    const RULES = W.rules;
    const BANNERS = ["character", "weapon", "standard"];
    const KEY = "akasha-wishes:" + W.asOf;
    const PRIMOS_PER_WISH = 160;
    const CUR_KEY = "akasha-currency";

    // Primogems and Fates aren't in the game's wish history, so they're typed
    // in here — kept apart from the per-sync log so an import never wipes them.
    // Wishes made after they were typed in are subtracted (see replay()).
    function readCur() {
      try { return JSON.parse(localStorage.getItem(CUR_KEY)) || null; } catch { return null; }
    }
    function writeCur(c) {
      try { localStorage.setItem(CUR_KEY, JSON.stringify(c)); } catch {}
    }

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
      const typed = readCur();
      const baseCur = typed ? typed.values : W.currency;
      const s = {
        curKnown: !!baseCur,
        cur: { primogems: 0, intertwined: 0, acquaint: 0, starglitter: 0, ...(baseCur || {}) },
        b: {
          character: { ...W.banners.character },
          weapon: { ...W.banners.weapon },
          standard: { ...W.banners.standard }
        },
        history: W.history.map((h) => ({ ...h, synced: true })),
        logged: { character: 0, weapon: 0, standard: 0 },
        fours: { character: 0, weapon: 0, standard: 0 }
      };

      // Each wish uses a Fate if there is one, else 160 Primogems.
      const spend = (b) => {
        const fate = RULES[b].fate;
        if (s.cur[fate] > 0) s.cur[fate]--;
        else s.cur.primogems -= PRIMOS_PER_WISH;
      };
      // Wishes the game import saw after the currency was typed in.
      if (typed && SYNC && SYNC.spend) {
        for (const x of SYNC.spend) if (x.t > typed.setAt) spend(x.b);
      }

      for (const ev of log) {
        if (ev.kind === "cur") continue; // older logs kept currency here

        const B = s.b[ev.b];
        if (!typed || (ev.ts || 0) > typed.setAt) spend(ev.b);

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
        if (B.fatePoint == null) {
          return `<span class="wc-chip">Fate Point ?</span><span class="wc-chip-note">The game's wish history doesn't record your Epitomized Path, so check your Fate Points in-game. The odds here assume 0/1.</span>`;
        }
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
      if (!s.curKnown) {
        return `<div class="wc-forecast"><p class="wc-line">Tap <b>Primogems</b> and the Fates above to enter what you have.
          Then this shows how many wishes that makes and your odds of a 5★ with them.</p></div>`;
      }
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
              ${SYNC && SYNC.totals
                ? `<span class="wc-stat"><span class="wc-k">Wishes</span><b class="num">${SYNC.totals[bannerId].wishes + s.logged[bannerId]}</b></span>
                   <span class="wc-stat"><span class="wc-k">4★</span><b class="num">${SYNC.totals[bannerId].fours + s.fours[bannerId]}</b></span>`
                : `<span class="wc-stat"><span class="wc-k">4★ logged here</span><b class="num">${s.fours[bannerId]}</b></span>`}
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
          <span class="wc-k">${label}</span><b class="num">${s.curKnown ? fmt(Math.max(0, s.cur[field])) : "set"}</b>
        </button>`;
      return `<div class="wc-currency">
        ${cell("primogems", "Primogems")}${cell("intertwined", "Intertwined")}${cell("acquaint", "Acquaint")}${cell("starglitter", "Starglitter")}
      </div>`;
    }

    /* ---------- the whole panel ---------- */

    function renderEmpty() {
      document.getElementById("wish-root").innerHTML = `
        <section class="panel pad-lg wish" id="wish-panel">
          <div class="panel-head">
            <h2>Wish Counter</h2>
            <span class="tag warn">Not synced yet</span>
          </div>
          <p class="wc-line">No wish data yet. Open <b>Wish › History</b> in Genshin, then run <code>akasha</code>:
            it reads your wish history from the game and fills this in. (Or copy the <b>Wishing Status</b>
            from <code>player-profile.md</code> on claude.ai into <code>data.js</code>.)</p>
        </section>`;
    }

    function render() {
      if (!synced) { renderEmpty(); return; }
      const s = replay();
      const B = s.b[active];
      const loggedTotal = s.logged.character + s.logged.weapon + s.logged.standard;

      document.getElementById("wish-root").innerHTML = `
        <section class="panel pad-lg wish" id="wish-panel">
          <div class="wc-fx" aria-hidden="true"></div>
          <div class="panel-head">
            <h2>Wish Counter</h2>
            <span class="tag${loggedTotal ? " hot" : ""}">${fromGame ? "From game" : "Synced"} ${W.asOfLabel}${loggedTotal ? ` + ${loggedTotal} logged here` : ""}</span>
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
            <span>${fromGame
              ? `Pity and 5★s come from the game (last import ${W.asOfLabel}). Wishes logged here fill the gap until the next one: open Wish › History in-game, then run <code>akasha</code>.`
              : `Wishes logged here stack on top of the ${W.asOfLabel} sync. When claude.ai sends newer numbers, this log clears itself.`}</span>
            <button type="button" class="icon-btn" data-act="copy">Copy update for claude.ai</button>
          </div>
        </section>`;

      renderRail(s);
      const nb = document.getElementById("nav-badge-wishes");
      if (nb) nb.textContent = s.b.character.pity5;

      drawChart();
    }

    function renderRail(s) {
      const host = document.getElementById("wish-rail");
      if (!host) return;
      const row = (id) => {
        const B = s.b[id], R = RULES[id];
        const state = id === "character" ? (B.guaranteed ? "guaranteed" : "50/50")
          : id === "weapon" ? `fate pt ${B.fatePoint == null ? "?" : B.fatePoint}/1` : "";
        return `<div class="wr-row">
            <span class="wr-name">${R.short}</span>
            <span class="wr-bar"><span style="width:${(B.pity5 / R.hard) * 100}%"></span><i style="left:${((R.softStart - 1) / R.hard) * 100}%"></i></span>
            <span class="wr-num num">${B.pity5}</span>
            <span class="wr-state">${state}</span>
          </div>`;
      };
      const a = affordable(s, "character");
      const saved = s.curKnown
        ? `<b class="num">${a.total}</b> character wishes saved up`
        : `Primogems not entered yet`;
      host.innerHTML = `
        <section class="panel wish-rail">
          <span class="cd-label">Wish pity</span>
          ${BANNERS.map(row).join("")}
          <p class="wr-afford">${saved}</p>
        </section>`;
    }

    /* ---------- logging ---------- */

    const today = () => new Date().toISOString().slice(0, 10);
    let groupSeq = Date.now();

    function commit(events) {
      const g = ++groupSeq;
      const rs = events.map((e) => e.r);
      log.push(...events.map((e) => ({ ...e, g, ts: Date.now() })));
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
      input.value = s.curKnown ? Math.max(0, s.cur[field]) : "";
      btn.querySelector("b").replaceWith(input);
      input.focus(); input.select();
      const save = () => {
        const v = Math.max(0, Math.floor(Number(input.value) || 0));
        if (s.curKnown && v === s.cur[field]) { render(); return; }
        // Save all four as they stand now; later wishes get subtracted from here.
        const values = {};
        for (const k of ["primogems", "intertwined", "acquaint", "starglitter"]) values[k] = Math.max(0, s.cur[k]);
        values[field] = v;
        writeCur({ values, setAt: Date.now() });
        render();
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
          : id === "weapon" ? `, Fate Point ${B.fatePoint == null ? "unknown" : B.fatePoint + "/1"}` : "";
        lines.push(`- ${RULES[id].label}: ${B.pity5} since last 5★, ${B.pity4} since last 4★${extra} (${s.logged[id]} wishes logged)`);
      }
      lines.push(s.curKnown ? `- Resources: ${fmt(Math.max(0, s.cur.primogems))} Primogems, ${s.cur.intertwined} Intertwined, ${s.cur.acquaint} Acquaint, ${s.cur.starglitter} Starglitter` : "- Resources: not entered");
      const fresh = s.history.filter((h) => !h.synced);
      for (const h of fresh) lines.push(`- New 5★: ${h.name} (${RULES[h.banner].label}, pity ${h.pity}${h.result ? ", " + h.result : ""}, ${h.date})`);
      copyText(lines.join("\n")).then((ok) =>
        toast(ok ? "Copied — paste it into your Genshin project on claude.ai" : "Couldn't reach the clipboard"));
    }

    /* ---------- events (called from wire()) ---------- */

    // Returns true when the click belonged to the Wish Counter.
    function click(e) {
      if (!e.target.closest("#wish-panel")) return false;
      const tab = e.target.closest(".wc-tab");
      if (tab) { active = tab.dataset.banner; render(); return true; }
      const cur = e.target.closest(".wc-cur");
      if (cur && !cur.querySelector("input")) { editCurrency(cur); return true; }
      const btn = e.target.closest("[data-act]");
      if (!btn || btn.closest("#wc-tray")) return true;
      const act = btn.dataset.act;
      if (act === "undo") undo();
      if (act === "copy") copyUpdate();
      if (act === "ten") openTen(active);
      if (act === "one") {
        const r = Number(btn.dataset.r);
        if (r < 5) commit([{ b: active, r, date: today() }]);
        else askFive(active, "Nice — who did you get?", (ans) => { closeTray(); commit([{ b: active, r: 5, date: today(), ...ans }]); });
      }
      return true;
    }

    return {
      panelHost: () => `<div id="wish-root"></div>`,
      railHost: () => `<div id="wish-rail"></div>`,
      init: render,
      redraw: () => drawChart(),
      click
    };
  })();

  /* ============================================================
     Artifact Lab — the Artifacts screen. Judges a new artifact by
     playing its remaining upgrades thousands of times (Monte Carlo)
     with the game rules in D.artifacts, and compares the results
     with the piece the character wears now. Saved pieces and each
     character's chosen stats live in localStorage, like the routine
     ticks. It never decides which stats a character wants: you
     pick them; build advice comes from claude.ai.
     ============================================================ */

  const Lab = (function () {
    const A = D.artifacts;
    const SUB = A.substats;
    const SUB_KEYS = Object.keys(SUB);
    const SLOT = A.slots;
    const SLOT_KEYS = Object.keys(SLOT);
    const SIMS = 20000;
    const PIECES_KEY = "akasha-pieces";
    const STATS_KEY = "akasha-useful-stats";
    const UI_KEY = "akasha-lab";

    function load(key, fallback) {
      try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch { return fallback; }
    }
    function store(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} }

    const characters = [...new Set([
      ...D.squad.members.map((m) => m.name),
      ...D.roster.bench.map((b) => b.name),
      ...(D.roster.reference || []).map((r) => r.name)
    ])];

    // An example piece so the screen shows what it does before anything is typed.
    const EXAMPLE = {
      example: true, slot: "sands", level: 0, main: "ATKp",
      subs: [{ k: "CR", v: 3.5 }, { k: "CD", v: 7 }, { k: "ER", v: 5.2 }, { k: "ATK", v: 16 }]
    };
    const blankSubs = () => [0, 1, 2, 3].map(() => ({ k: "", v: 0 }));

    let pieces = load(PIECES_KEY, {});   // { character: { slot: {level, main, subs} } }
    let useful = load(STATS_KEY, {});    // { character: [substat keys] }
    const ui = Object.assign({ tab: "forecast", char: characters[0], mode: "cv", draft: EXAMPLE }, load(UI_KEY, {}));
    if (!characters.includes(ui.char)) ui.char = characters[0];
    let draft = ui.draft;

    const saveUi = () => { ui.draft = draft; store(UI_KEY, ui); };
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    const pct = (p) => (p > 0 && p < 0.005 ? "<1%" : p < 1 && p > 0.995 ? ">99%" : Math.round(p * 100) + "%");

    /* ---------- maths ---------- */

    const mainOf = (slot, key) => SLOT[slot].mains.find((m) => m.key === key) || SLOT[slot].mains[0];
    const filled = (subs) => subs.filter((s) => s.k);
    const mapOf = (subs) => filled(subs).reduce((m, s) => { m[s.k] = (m[s.k] || 0) + Number(s.v || 0); return m; }, {});
    const cvOf = (m) => 2 * (m.CR || 0) + (m.CD || 0);
    const rvOf = (m, keys) => keys.reduce((t, k) => t + (m[k] || 0) / SUB[k].max, 0);

    function scorer() {
      const keys = useful[ui.char] || [];
      if (ui.mode === "stats" && keys.length) {
        return { unit: "good rolls", short: "rolls", width: 0.5, f: (m) => rvOf(m, keys) };
      }
      return { unit: "Crit Value", short: "CV", width: 2, f: cvOf };
    }

    function problemsOf(p) {
      const out = [];
      const subs = filled(p.subs);
      const keys = subs.map((s) => s.k);
      if (new Set(keys).size !== keys.length) out.push("The same substat is listed twice.");
      const blocked = mainOf(p.slot, p.main).sub;
      if (blocked && keys.includes(blocked)) out.push("A substat can't be the same as the main stat.");
      if (subs.length < 3) out.push("Fill in at least 3 substats (every 5★ piece starts with 3 or 4).");
      if (subs.length === 3 && p.level >= 4) out.push("From +4 on, every piece has 4 substats — add the 4th.");
      return out;
    }

    const tier = () => A.tiers[Math.floor(Math.random() * A.tiers.length)];
    function pickNew(exclude) {
      const pool = SUB_KEYS.filter((k) => !exclude.has(k));
      let r = Math.random() * pool.reduce((t, k) => t + SUB[k].weight, 0);
      for (const k of pool) { r -= SUB[k].weight; if (r <= 0) return k; }
      return pool[pool.length - 1];
    }

    // Scores of SIMS possible +20 futures, sorted low → high.
    function futures(p, score) {
      const base = filled(p.subs).map((s) => ({ k: s.k, v: Number(s.v) }));
      const blocked = mainOf(p.slot, p.main).sub;
      const ups = (20 - p.level) / 4;
      const out = new Float64Array(SIMS);
      for (let n = 0; n < SIMS; n++) {
        const subs = base.map((s) => ({ k: s.k, v: s.v }));
        for (let u = 0; u < ups; u++) {
          if (subs.length < 4) {
            const ex = new Set(subs.map((s) => s.k));
            if (blocked) ex.add(blocked);
            const k = pickNew(ex);
            subs.push({ k, v: tier() * SUB[k].max });
          } else {
            const s = subs[Math.floor(Math.random() * 4)];
            s.v += tier() * SUB[s.k].max;
          }
        }
        out[n] = score(mapOf(subs));
      }
      return out.sort();
    }
    const quantile = (arr, q) => arr[Math.min(arr.length - 1, Math.floor(q * arr.length))];
    function shareAbove(arr, x) {
      let lo = 0, hi = arr.length;
      while (lo < hi) { const mid = (lo + hi) >> 1; if (arr[mid] <= x) lo = mid + 1; else hi = mid; }
      return (arr.length - lo) / arr.length;
    }

    // Roll checker: which (rolls, roll sizes) produce each shown value.
    function decodeOne(k, v) {
      const out = [];
      const d = SUB[k].decimals;
      const f = Math.pow(10, d);
      for (let n = 1; n <= 6; n++) {
        for (let S = 7 * n; S <= 10 * n; S++) {
          if (Math.abs(Math.round((S / 10) * SUB[k].max * f) / f - v) < 1e-6) out.push({ n, S });
        }
      }
      return out;
    }
    function decode(p) {
      const subs = filled(p.subs);
      const ups = p.level / 4;
      const totals = subs.length === 4 ? [4 + ups, 3 + ups] : [3 + ups];
      const cands = subs.map((s) => decodeOne(s.k, Number(s.v)));
      const bad = subs.filter((s, i) => !cands[i].length);
      if (bad.length) return { bad };
      let best = null;
      (function walk(i, acc, sum) {
        if (i === cands.length) {
          // Prefer a split matching a 4-substat start, else a 3-substat one.
          if (totals.includes(sum) && (!best || (best.sum !== totals[0] && sum === totals[0]))) best = { pick: acc.slice(), sum };
          return;
        }
        for (const c of cands[i]) { acc.push(c); walk(i + 1, acc, sum + c.n); acc.pop(); }
      })(0, [], 0);
      if (!best) return { mismatch: true };
      return {
        start: best.sum - ups,
        rows: subs.map((s, i) => {
          const { n, S } = best.pick[i];
          const base = Math.floor(S / n), extra = S - base * n;
          const tiers = Array.from({ length: n }, (_, j) => base + (j < extra ? 1 : 0)).sort((a, b) => b - a);
          return { k: s.k, n, tiers };
        })
      };
    }

    function currentPiece() {
      const p = pieces[ui.char] && pieces[ui.char][draft.slot];
      if (!p) return null;
      const full = Object.assign({ slot: draft.slot }, p);
      return problemsOf(full).length ? null : full;
    }

    /* ---------- editors ---------- */

    const opt = (v, label, sel) => `<option value="${v}"${v === sel ? " selected" : ""}>${label}</option>`;
    function subRows(subs, attr) {
      return subs.map((s, i) => `
        <div class="lab-sub">
          <select ${attr}-k="${i}" aria-label="Substat ${i + 1}">
            ${opt("", i === 3 ? "— none yet (3-substat piece) —" : "— pick —", s.k)}
            ${SUB_KEYS.map((k) => opt(k, SUB[k].label, s.k)).join("")}
          </select>
          <input type="number" ${attr}-v="${i}" step="${s.k && SUB[s.k].decimals === 0 ? 1 : 0.1}" min="0"
                 value="${s.k ? s.v : ""}" aria-label="Value ${i + 1}"${s.k ? "" : " disabled"}>
        </div>`).join("");
    }

    function draftEditor() {
      const probs = problemsOf(draft);
      const cur = currentPiece();
      return `
        <div class="lab-piece-head">
          <span class="k">New piece</span>
          ${draft.example ? `<span class="tag warn">Example — type yours</span>` : ""}
        </div>
        <div class="lab-2">
          <label class="lab-f">Slot<select data-d="slot">${SLOT_KEYS.map((k) => opt(k, SLOT[k].label, draft.slot)).join("")}</select></label>
          <label class="lab-f">Level<select data-d="level">${[0, 4, 8, 12, 16].map((l) => opt(String(l), "+" + l, String(draft.level))).join("")}</select></label>
        </div>
        <label class="lab-f">Main stat<select data-d="main">${SLOT[draft.slot].mains.map((m) => opt(m.key, m.label, draft.main)).join("")}</select></label>
        <span class="k">Substats now</span>
        ${subRows(draft.subs, "data-dsub")}
        ${probs.map((p) => `<p class="lab-warn">${p}</p>`).join("")}
        <div class="lab-actions">
          <button type="button" class="icon-btn" data-act="clear-draft">Clear</button>
          <button type="button" class="icon-btn" data-act="equip"${probs.length ? " disabled" : ""}
                  title="After levelling it in-game: make this ${esc(ui.char)}'s current ${SLOT[draft.slot].label.toLowerCase()}">Wear it</button>
        </div>
        <p class="lab-fine">${cur
          ? `Compared with ${esc(ui.char)}'s current ${SLOT[draft.slot].label.toLowerCase()}.`
          : `No current ${SLOT[draft.slot].label.toLowerCase()} saved for ${esc(ui.char)} yet. <button type="button" class="lab-link" data-act="go-mine">Add it in My pieces</button> to compare.`}</p>`;
    }

    /* ---------- forecast ---------- */

    function histogram(arr, mark, unit, width) {
      let lo = Math.floor(arr[0] / width) * width;
      let hi = Math.ceil(arr[arr.length - 1] / width) * width;
      if (hi === lo) hi = lo + width;
      const bins = Math.round((hi - lo) / width);
      const counts = new Array(bins).fill(0);
      for (const x of arr) counts[Math.min(bins - 1, Math.floor((x - lo) / width))]++;
      const max = Math.max(...counts);
      const bars = counts.map((c, b) => {
        const from = lo + b * width, to = from + width;
        const hit = mark == null || (from + to) / 2 > mark;
        return `<div class="lab-slot"><div class="lab-bar${hit ? " hit" : ""}" style="height:${((c / max) * 100).toFixed(1)}%"
                  data-tip="${from.toFixed(1)}–${to.toFixed(1)} ${unit}: ${pct(c / arr.length)} of futures"></div></div>`;
      }).join("");
      const mx = mark == null ? null : Math.min(100, Math.max(0, ((mark - lo) / (hi - lo)) * 100));
      return `
        <div class="lab-hist">
          <div class="lab-hist-head">
            <span class="k">Where it can end up at +20 · ${SIMS.toLocaleString("en-US")} simulated futures</span>
            ${mark == null ? "" : `<span class="lab-legend"><span><i class="sw hit"></i>Beats yours</span><span><i class="sw miss"></i>Doesn't</span></span>`}
          </div>
          <div class="lab-plot" data-plot>${bars}${mx == null ? "" : `<div class="lab-marker" style="left:${mx}%"><span>yours ${mark.toFixed(1)}</span></div>`}</div>
          <div class="lab-axis"><span>${lo}</span><span>${unit}</span><span>${hi}</span></div>
        </div>`;
    }

    function renderForecast() {
      const probs = problemsOf(draft);
      if (probs.length) return `<p class="lab-say">Fix the new piece on the left to see its forecast.</p>`;
      const sc = scorer();
      const fut = futures(draft, sc.f);
      const now = sc.f(mapOf(draft.subs));
      const cur = currentPiece();
      const curScore = cur ? sc.f(mapOf(cur.subs)) : null;
      const low = quantile(fut, 0.25), med = quantile(fut, 0.5), high = quantile(fut, 0.75);
      const ups = (20 - draft.level) / 4;
      const beat = curScore == null ? null : shareAbove(fut, curScore);

      let verdict;
      if (beat == null) verdict = `<span class="lab-badge">No comparison</span><span>Save ${esc(ui.char)}'s current piece to get a keep-or-fodder answer.</span>`;
      else if (beat >= A.keep.level) verdict = `<span class="lab-badge good">Level it</span><span>Better than a coin flip to beat what ${esc(ui.char)} wears. Worth the EXP.</span>`;
      else if (beat >= A.keep.retry) verdict = `<span class="lab-badge mid">Try one upgrade</span><span>Could go either way. Level it 4 more and check again: the next roll tells a lot.</span>`;
      else verdict = `<span class="lab-badge bad">Fodder</span><span>Fewer than ${Math.round(A.keep.retry * 100)}% of its futures beat the current piece. Feed it to a better one.</span>`;

      const vs = (x) => curScore == null ? "" : (() => {
        const d = x - curScore;
        return `<span class="lab-vs ${d > 0 ? "up" : d < 0 ? "down" : ""}">${d > 0 ? "+" : ""}${d.toFixed(1)} vs yours</span>`;
      })();

      const bands = sc.short === "CV" ? `
        <div class="lab-tiles">${A.cvBands.map((b) => `
          <div class="lab-tile"><span class="k">Ends at ${b.min}+ CV</span><span class="v num">${pct(shareAbove(fut, b.min - 1e-9))}</span><span class="n">${b.label}</span></div>`).join("")}
        </div>
        <p class="lab-fine">30 / 40 / 50 Crit Value at +20 is the usual rule of thumb for decent / good / great.</p>` : "";

      return `
        <div class="lab-verdict">${verdict}</div>
        <div class="lab-tiles">
          <div class="lab-tile hero"><span class="k">Likely at +20</span><span class="v num">${med.toFixed(1)}</span><span class="n">${sc.unit}</span></div>
          <div class="lab-tile hero"><span class="k">Beats yours</span><span class="v num">${beat == null ? "—" : pct(beat)}</span><span class="n">${curScore == null ? "nothing saved to compare" : `yours: ${curScore.toFixed(1)}`}</span></div>
        </div>
        <p class="lab-say">Now <b class="num">${now.toFixed(1)}</b> ${sc.unit} with ${ups} upgrade${ups === 1 ? "" : "s"} to go.
          Half its possible futures end above <b class="num">${med.toFixed(1)}</b>.</p>
        <div class="lab-future">
          <div><span class="k">Bad luck</span><b class="num">${low.toFixed(1)}</b><span class="n">1 in 4 end lower</span>${vs(low)}</div>
          <div><span class="k">Likely</span><b class="num">${med.toFixed(1)}</b><span class="n">the middle</span>${vs(med)}</div>
          <div><span class="k">Good luck</span><b class="num">${high.toFixed(1)}</b><span class="n">1 in 4 end higher</span>${vs(high)}</div>
        </div>
        ${histogram(fut, curScore, sc.short, sc.width)}
        ${bands}`;
    }

    /* ---------- roll checker ---------- */

    function rollBlock(title, p) {
      const probs = problemsOf(p);
      if (probs.length) return `<div class="lab-rollbox"><span class="k">${title}</span><p class="lab-say">Fill in the piece first.</p></div>`;
      const d = decode(p);
      let body;
      if (d.bad) body = `<p class="lab-say">These numbers can't come from real rolls: <b>${d.bad.map((s) => SUB[s.k].label + " " + s.v).join(", ")}</b>. Check them on the artifact (percent stats have one decimal).</p>`;
      else if (d.mismatch) body = `<p class="lab-say">Each number fits real rolls, but not the number of upgrades a +${p.level} piece has had. Check the level.</p>`;
      else body = `<div class="lab-rolls">${d.rows.map((r) => `
          <div class="lab-rrow"><span>${SUB[r.k].label}</span>
            <span class="lab-pips">${r.tiers.map((t) => `<span class="lab-pip t${t}">${t * 10}%</span>`).join("")}</span>
            <span class="lab-rn num">${r.n} roll${r.n > 1 ? "s" : ""}</span></div>`).join("")}</div>
          <p class="lab-fine">Started with ${d.start} substats. When two splits fit the same number, this shows the most even one.</p>`;
      return `<div class="lab-rollbox"><span class="k">${title} · +${p.level}</span>${body}</div>`;
    }

    function renderRolls() {
      const cur = currentPiece();
      return `
        <p class="lab-say">How each substat got its number. Every pip is one roll: <b>70%</b> is the smallest a roll can be, <b>100%</b> the biggest.</p>
        ${rollBlock("New piece", draft)}
        ${cur ? rollBlock(`${ui.char}'s current ${SLOT[draft.slot].label.toLowerCase()}`, cur) : ""}`;
    }

    /* ---------- my pieces ---------- */

    function slotCard(slot) {
      const saved = pieces[ui.char] && pieces[ui.char][slot];
      const p = saved || { level: 20, main: SLOT[slot].mains[0].key, subs: blankSubs() };
      const full = Object.assign({ slot }, p);
      const ok = saved && !problemsOf(full).length;
      const m = mapOf(p.subs);
      const keys = useful[ui.char] || [];
      return `
        <div class="lab-card${ok ? " ok" : ""}" data-slot="${slot}">
          <div class="lab-card-head">
            <h3>${SLOT[slot].label}</h3>
            <span class="lab-score num" id="lab-score-${slot}">${ok ? `${cvOf(m).toFixed(1)} CV${keys.length ? ` · ${rvOf(m, keys).toFixed(1)} rolls` : ""}` : "not saved"}</span>
          </div>
          <div class="lab-2">
            <label class="lab-f">Main stat<select data-m="${slot}" data-f="main">${SLOT[slot].mains.map((mm) => opt(mm.key, mm.label, p.main)).join("")}</select></label>
            <label class="lab-f">Level<select data-m="${slot}" data-f="level">${[0, 4, 8, 12, 16, 20].map((l) => opt(String(l), "+" + l, String(p.level))).join("")}</select></label>
          </div>
          ${subRows(p.subs, `data-m="${slot}" data-msub`)}
          ${saved ? `<button type="button" class="lab-link" data-act="clear-slot" data-slot="${slot}">Remove</button>` : ""}
        </div>`;
    }

    function renderMine() {
      const keys = useful[ui.char] || [];
      return `
        <div class="lab-stats">
          <span class="k">${esc(ui.char)}'s stats</span>
          <div class="lab-chips">${SUB_KEYS.map((k) =>
            `<button type="button" class="lab-chip" data-useful="${k}" aria-pressed="${keys.includes(k)}">${SUB[k].label}</button>`).join("")}</div>
          <p class="lab-fine">Pick the substats that help ${esc(ui.char)}. Akasha doesn't choose them; that advice comes from your claude.ai project.
            Then "Their stats" scores pieces on these instead of CRIT only.</p>
        </div>
        <p class="lab-fine">What ${esc(ui.char)} wears now. Saved as you type, in this browser only.</p>
        <div class="lab-cards">${SLOT_KEYS.map(slotCard).join("")}</div>`;
    }

    /* ---------- panel ---------- */

    function tabBtn(id, label) {
      return `<button type="button" class="subtab" role="tab" data-lab-tab="${id}" aria-selected="${ui.tab === id}">${label}</button>`;
    }

    function renderOut() {
      const out = document.getElementById("lab-out");
      if (out) out.innerHTML = ui.tab === "forecast" ? renderForecast() : renderRolls();
    }

    function render() {
      const root = document.getElementById("lab-root");
      if (!root) return;
      const keys = useful[ui.char] || [];
      if (ui.mode === "stats" && !keys.length) ui.mode = "cv";
      const modeSeg = ui.tab === "mine" ? "" : `
        <div class="lab-seg" role="group" aria-label="Score pieces by">
          <button type="button" data-mode="cv" aria-pressed="${ui.mode === "cv"}">Crit Value</button>
          <button type="button" data-mode="stats" aria-pressed="${ui.mode === "stats"}"${keys.length ? "" : ` disabled title="Pick ${esc(ui.char)}'s stats in My pieces first"`}>Their stats</button>
        </div>`;
      root.innerHTML = `
        <div class="subtabs" role="tablist" aria-label="Artifact Lab views">
          ${tabBtn("forecast", "Forecast")}${tabBtn("rolls", "Roll checker")}${tabBtn("mine", "My pieces")}
        </div>
        <section class="panel pad-lg lab">
          <div class="panel-head">
            <h2>Artifact Lab</h2>
            <span class="tag">${SIMS.toLocaleString("en-US")} futures per check</span>
          </div>
          <div class="lab-top">
            <label class="lab-f lab-char">Character
              <select id="lab-char">${characters.map((c) => opt(c, esc(c), ui.char)).join("")}</select>
            </label>
            ${modeSeg}
          </div>
          ${ui.tab === "mine" ? renderMine() : `
            <div class="lab-grid">
              <div class="lab-piece">${draftEditor()}</div>
              <div class="lab-out" id="lab-out" aria-live="polite"></div>
            </div>`}
        </section>
        <p class="lab-rules">Game rules used: every 4 levels (five times by +20) one of the 4 substats is picked at 25% each and grows by 70, 80, 90 or 100% of its biggest roll. A 3-substat piece spends its first upgrade gaining a 4th.</p>`;
      if (ui.tab !== "mine") renderOut();
      saveUi();
    }

    /* ---------- events (on the screen's own root) ---------- */

    let typing = null;
    function wireRoot(root) {
      root.addEventListener("click", (e) => {
        const t = e.target;
        const tabB = t.closest("[data-lab-tab]");
        if (tabB) { ui.tab = tabB.dataset.labTab; render(); return; }
        const modeB = t.closest("[data-mode]");
        if (modeB && !modeB.disabled) { ui.mode = modeB.dataset.mode; render(); return; }
        const u = t.closest("[data-useful]");
        if (u) {
          const list = new Set(useful[ui.char] || []);
          if (list.has(u.dataset.useful)) list.delete(u.dataset.useful); else list.add(u.dataset.useful);
          useful[ui.char] = SUB_KEYS.filter((k) => list.has(k));
          store(STATS_KEY, useful);
          render();
          return;
        }
        const act = t.closest("[data-act]");
        if (!act || act.disabled) return;
        const a = act.dataset.act;
        if (a === "go-mine") { ui.tab = "mine"; render(); }
        if (a === "clear-draft") { draft = { slot: draft.slot, level: 0, main: draft.main, subs: blankSubs() }; render(); }
        if (a === "equip") {
          pieces[ui.char] = pieces[ui.char] || {};
          pieces[ui.char][draft.slot] = { level: draft.level, main: draft.main, subs: draft.subs.map((s) => ({ k: s.k, v: Number(s.v) })) };
          store(PIECES_KEY, pieces);
          toast(`Saved as ${ui.char}'s current ${SLOT[draft.slot].label.toLowerCase()}`);
          render();
        }
        if (a === "clear-slot") {
          if (pieces[ui.char]) delete pieces[ui.char][act.dataset.slot];
          store(PIECES_KEY, pieces);
          render();
        }
      });

      root.addEventListener("change", (e) => {
        const t = e.target;
        // Number boxes are handled on input; re-rendering on their blur would steal focus.
        if (t.type === "number") return;
        if (t.id === "lab-char") { ui.char = t.value; render(); return; }
        if (t.dataset.d) {
          const f = t.dataset.d;
          if (f === "slot") { draft.slot = t.value; draft.main = SLOT[t.value].mains[0].key; }
          if (f === "level") draft.level = Number(t.value);
          if (f === "main") draft.main = t.value;
          draft.example = false;
          render();
          return;
        }
        if (t.dataset.dsubK != null) {
          const s = draft.subs[Number(t.dataset.dsubK)];
          s.k = t.value;
          s.v = s.k ? Number((SUB[s.k].max * 0.8).toFixed(SUB[s.k].decimals)) : 0;
          draft.example = false;
          render();
          return;
        }
        if (t.dataset.m) {
          const slot = t.dataset.m;
          const p = slotPiece(slot);
          if (t.dataset.f === "main") p.main = t.value;
          if (t.dataset.f === "level") p.level = Number(t.value);
          if (t.dataset.msubK != null) {
            const s = p.subs[Number(t.dataset.msubK)];
            s.k = t.value;
            s.v = s.k ? Number((SUB[s.k].max * 0.8).toFixed(SUB[s.k].decimals)) : 0;
          }
          store(PIECES_KEY, pieces);
          render();
        }
      });

      // Typing a value only redraws the results, so the box keeps focus.
      root.addEventListener("input", (e) => {
        const t = e.target;
        const v = Number(t.value);
        if (t.type !== "number" || !isFinite(v) || v < 0) return;
        if (t.dataset.dsubV != null) {
          draft.subs[Number(t.dataset.dsubV)].v = v;
          draft.example = false;
          const exampleTag = root.querySelector(".lab-piece-head .tag");
          if (exampleTag) exampleTag.remove();
          saveUi();
          clearTimeout(typing);
          typing = setTimeout(renderOut, 250);
          return;
        }
        if (t.dataset.msubV != null) {
          const slot = t.dataset.m;
          const p = slotPiece(slot);
          p.subs[Number(t.dataset.msubV)].v = v;
          store(PIECES_KEY, pieces);
          const full = Object.assign({ slot }, p);
          const m = mapOf(p.subs);
          const keys = useful[ui.char] || [];
          const el = document.getElementById("lab-score-" + slot);
          if (el) el.textContent = problemsOf(full).length ? "not saved" : `${cvOf(m).toFixed(1)} CV${keys.length ? ` · ${rvOf(m, keys).toFixed(1)} rolls` : ""}`;
        }
      });

      // Histogram hover: one tooltip, placed over the bar.
      let tip = null;
      root.addEventListener("pointerover", (e) => {
        const b = e.target.closest(".lab-bar[data-tip]");
        if (!b) return;
        const plot = b.closest("[data-plot]");
        if (!tip) { tip = document.createElement("div"); tip.className = "lab-tip"; }
        plot.appendChild(tip);
        tip.textContent = b.dataset.tip;
        const pr = plot.getBoundingClientRect(), br = b.getBoundingClientRect();
        tip.style.left = br.left - pr.left + br.width / 2 + "px";
        tip.style.top = br.top - pr.top - 4 + "px";
      });
      root.addEventListener("pointerout", (e) => {
        if (tip && e.target.closest(".lab-bar") && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".lab-bar"))) tip.remove();
      });
    }

    // The saved piece for a slot, created on first edit.
    function slotPiece(slot) {
      pieces[ui.char] = pieces[ui.char] || {};
      if (!pieces[ui.char][slot]) pieces[ui.char][slot] = { level: 20, main: SLOT[slot].mains[0].key, subs: blankSubs() };
      return pieces[ui.char][slot];
    }

    function init() {
      const root = document.getElementById("lab-root");
      if (!root) return;
      wireRoot(root);
      render();
    }

    return { host: () => `<div id="lab-root" class="lab-root"></div>`, init };
  })();

  /* ============================================================
     Screens — Toolbelt-style sidebar nav. One screen shows at a
     time; the rail summary under the nav stays visible on all of
     them. The grouping is view config, so it lives here, not in
     data.js. The open screen is kept in the URL hash (#wishes) and
     in localStorage, so a reload lands where you were.
     ============================================================ */

  const SCREENS = [
    { id: "today",     label: "Today",     icon: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.2 1.2L7 5M3.5 12l1.2 1.2L7 11M3.5 18l1.2 1.2L7 17"/>' },
    { id: "squad",     label: "Squad",     icon: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/>' },
    { id: "wishes",    label: "Wishes",    icon: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z"/>' },
    { id: "roster",    label: "Roster",    icon: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.6a3 3 0 0 1 0 6M18 14.2c1.8.8 3 2.7 3 5.8"/>' },
    { id: "artifacts", label: "Artifacts", icon: '<circle cx="12" cy="12" r="2.2"/><path d="M12 9.8C10 6 12 3 12 3s2 3 0 6.8M14.2 12c3.8-2 6.8 0 6.8 0s-3 2-6.8 0M12 14.2c2 3.8 0 6.8 0 6.8s-2-3 0-6.8M9.8 12C6 14 3 12 3 12s3-2 6.8 0"/>' },
    { id: "info",      label: "Info",      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>' }
  ];
  const SCREEN_KEY = "akasha-screen";
  const SUB_KEY = "akasha-roster-sub";

  function startScreen() {
    const fromHash = location.hash.slice(1);
    if (SCREENS.some((s) => s.id === fromHash)) return fromHash;
    try {
      const saved = localStorage.getItem(SCREEN_KEY);
      if (SCREENS.some((s) => s.id === saved)) return saved;
    } catch {}
    return "today";
  }

  function readSub() {
    try { return localStorage.getItem(SUB_KEY) === "ref" ? "ref" : "mine"; } catch { return "mine"; }
  }

  let currentScreen = startScreen();

  function renderNav() {
    const doneNow = readRoutine().size;
    const badge = (id) =>
      id === "today" ? `${doneNow}/${D.routine.steps.length}` : "";
    const btns = SCREENS.map((s, i) => `
      <button type="button" class="nav-btn" data-screen="${s.id}" aria-current="${s.id === currentScreen ? "page" : "false"}" title="${s.label} (${i + 1})">
        <svg viewBox="0 0 24 24" aria-hidden="true">${s.icon}</svg>
        <span class="nav-label">${s.label}</span>
        <span class="nav-badge num" id="nav-badge-${s.id}">${badge(s.id)}</span>
      </button>`).join("");
    return `<nav class="panel nav" aria-label="Screens">${btns}</nav>`;
  }

  function renderArtifacts() {
    return Lab.host();
  }

  function renderRosterScreen() {
    const sub = readSub();
    const tab = (id, label) =>
      `<button type="button" class="subtab" role="tab" data-sub="${id}" aria-selected="${sub === id}">${label}</button>`;
    return `
      <div class="subtabs" role="tablist" aria-label="Roster views">
        ${tab("mine", "My characters")}${tab("ref", "Reference")}
      </div>
      <div class="sub-panel" data-sub-panel="mine"${sub === "mine" ? "" : " hidden"}>${renderRoster()}</div>
      <div class="sub-panel" data-sub-panel="ref"${sub === "ref" ? "" : " hidden"}>${renderReference()}</div>`;
  }

  function screen(id, body) {
    return `<div class="screen" data-screen="${id}" id="screen-${id}"${id === currentScreen ? "" : " hidden"}>${body}</div>`;
  }

  function showScreen(id) {
    if (!SCREENS.some((s) => s.id === id)) return;
    currentScreen = id;
    app.querySelectorAll(".screen").forEach((el) => {
      const on = el.dataset.screen === id;
      el.hidden = !on;
      if (on) { el.classList.remove("enter"); void el.offsetWidth; el.classList.add("enter"); }
    });
    app.querySelectorAll(".nav-btn").forEach((b) =>
      b.setAttribute("aria-current", b.dataset.screen === id ? "page" : "false"));
    try { localStorage.setItem(SCREEN_KEY, id); } catch {}
    if (location.hash.slice(1) !== id) history.replaceState(null, "", "#" + id);
    if (id === "wishes") Wish.redraw();
    window.scrollTo({ top: 0 });
  }

  function showSub(id) {
    app.querySelectorAll(".subtab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.sub === id)));
    app.querySelectorAll("[data-sub-panel]").forEach((p) => { p.hidden = p.dataset.subPanel !== id; });
    try { localStorage.setItem(SUB_KEY, id); } catch {}
  }

  /* ============================================================
     Mount
     ============================================================ */

  function mount() {
    app.innerHTML =
      renderTopbar() +
      `<div class="deck">
         <aside class="rail">
           ${renderNav()}
           ${renderIdentity()}
           ${renderCountdown()}
           ${renderPatch()}
           ${Wish.railHost()}
         </aside>
         <div class="stream">
           ${screen("today", `
             ${renderRoutine()}
             <div class="stream-grid">${renderCodes()}${renderNotices()}</div>`)}
           ${screen("squad", renderSquad() + renderAbyss())}
           ${screen("wishes", Wish.panelHost())}
           ${screen("roster", renderRosterScreen())}
           ${screen("artifacts", renderArtifacts())}
           ${screen("info", `<div class="stream-grid">${renderUnconfirmed()}${renderLinks()}</div>`)}
         </div>
       </div>` +
      renderFooter() +
      `<div class="toast" id="toast" role="status" aria-live="polite"></div>`;

    applyTheme(readTheme());
    startCountdown();
    Wish.init();
    Lab.init();
  }

  /* ---------- rotation ↔ character cross-highlight ---------- */

  let activeUnit = null;

  function clearHighlight() {
    activeUnit = null;
    const steps = document.getElementById("steps");
    if (!steps) return;
    steps.classList.remove("filtering");
    steps.style.removeProperty("--el-hi");
    steps.querySelectorAll(".step").forEach((s) => s.classList.remove("match"));
    app.querySelectorAll(".unit").forEach((u) => u.setAttribute("aria-pressed", "false"));
  }

  function highlightUnit(index) {
    const member = D.squad.members[index];
    const steps = document.getElementById("steps");
    if (!member || !steps) return;

    if (activeUnit === index) { clearHighlight(); return; }
    clearHighlight();
    activeUnit = index;

    const needle = member.name.toLowerCase();
    const list = rotationSteps();
    let hits = 0;

    steps.querySelectorAll(".step").forEach((node) => {
      const text = (list[Number(node.dataset.step)] || "").toLowerCase();
      if (text.includes(needle)) { node.classList.add("match"); hits++; }
    });

    steps.classList.add("filtering");
    steps.style.setProperty("--el-hi", `var(--el-${member.element})`);
    app.querySelector(`.unit[data-unit="${index}"]`).setAttribute("aria-pressed", "true");

    if (!hits) toast(`${member.name} isn't named in the rotation`);
  }

  /* ---------- routine ticks ---------- */

  function toggleStep(btn) {
    const done = readRoutine();
    const id = btn.dataset.stepId;
    const now = btn.getAttribute("aria-pressed") !== "true";

    if (now) done.add(id); else done.delete(id);
    btn.setAttribute("aria-pressed", String(now));
    writeRoutine(done);

    const tally = document.getElementById("routine-tally");
    if (tally) tally.textContent = `${done.size} / ${D.routine.steps.length}`;
    const badge = document.getElementById("nav-badge-today");
    if (badge) badge.textContent = `${done.size}/${D.routine.steps.length}`;
  }

  /* ---------- reference filter ---------- */

  function filterReference(el) {
    const grid = document.getElementById("ref-grid");
    const empty = document.getElementById("ref-empty");
    if (!grid) return;

    let shown = 0;
    grid.querySelectorAll(".ref-card").forEach((card) => {
      const on = el === "all" || card.dataset.el === el;
      card.hidden = !on;
      // A hidden card shouldn't come back still expanded.
      if (!on) card.setAttribute("aria-expanded", "false");
      if (on) shown++;
    });

    if (empty) empty.hidden = shown > 0;
    app.querySelectorAll("#ref-filters .ref-chip").forEach((c) => {
      c.setAttribute("aria-pressed", String(c.dataset.el === el));
    });
  }

  /* ---------- wiring ---------- */

  function wire() {
    app.addEventListener("click", async (e) => {
      if (Wish.click(e)) return;

      const navBtn = e.target.closest(".nav-btn[data-screen]");
      if (navBtn) { showScreen(navBtn.dataset.screen); return; }

      const subBtn = e.target.closest(".subtab[data-sub]");
      if (subBtn) { showSub(subBtn.dataset.sub); return; }

      const themeBtn = e.target.closest(".theme-switch button");
      if (themeBtn) { applyTheme(themeBtn.dataset.theme); return; }

      if (e.target.closest("#resync")) { replayBoot(); return; }

      const unit = e.target.closest(".unit[data-unit]");
      if (unit) { highlightUnit(Number(unit.dataset.unit)); return; }

      const step = e.target.closest(".rt-step[data-step-id]");
      if (step) { toggleStep(step); return; }

      const chip = e.target.closest(".ref-chip[data-el]");
      if (chip) { filterReference(chip.dataset.el); return; }

      // Bench + reference cards: plain expand/collapse, no cross-highlight.
      const card = e.target.closest("[data-expand]");
      if (card) {
        card.setAttribute("aria-expanded", card.getAttribute("aria-expanded") === "true" ? "false" : "true");
        return;
      }

      if (!e.target.closest(".steps") && activeUnit !== null) clearHighlight();

      const codeBtn = e.target.closest(".code-row[data-code]");
      if (!codeBtn) return;

      const code = codeBtn.dataset.code;
      const ok = await copyText(code);
      if (!ok) { toast("Couldn't copy — select it manually"); return; }

      toast(`Copied ${code}`);
      const pill = codeBtn.querySelector(".pill");
      if (pill && !pill.dataset.was) {
        pill.dataset.was = pill.textContent;
        pill.textContent = "Copied";
        pill.classList.add("copied");
        setTimeout(() => {
          pill.textContent = pill.dataset.was;
          pill.classList.remove("copied");
          delete pill.dataset.was;
        }, 1600);
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && activeUnit !== null) clearHighlight();
      // 1–6 jump between screens, unless you're typing somewhere.
      const t = e.target;
      if (e.ctrlKey || e.altKey || e.metaKey || (t instanceof Element && t.closest("input, textarea, select, [contenteditable]"))) return;
      const n = Number(e.key);
      if (n >= 1 && n <= SCREENS.length) showScreen(SCREENS[n - 1].id);
    });

    window.addEventListener("hashchange", () => showScreen(location.hash.slice(1)));
  }

  function reveal() {
    app.classList.add("revealed");
    runCounters();
  }

  function replayBoot() {
    clearHighlight();
    const fresh = document.createElement("div");
    fresh.className = "boot";
    document.body.appendChild(fresh);
    app.classList.remove("revealed");
    runBoot(fresh, reveal);
  }

  mount();
  wire();
  runBoot(bootEl, reveal);
})();
