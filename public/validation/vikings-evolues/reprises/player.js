/* Review only: generated figures are never installed as live campaign profiles. */
(async () => {
  const revision =
    new URLSearchParams(location.search).get("v") ?? "official-story-1";
  const assetURL = (path) => {
    const url = new URL(path, location.href);
    url.searchParams.set("v", revision);
    return url;
  };
  const response = await fetch(assetURL("reprises/manifest.json"), {
    cache: "no-cache",
  });
  if (!response.ok) return;
  const { profiles } = await response.json();
  const { sampleReview } = await import(
    new URL("reprises/timeline.js", location.href)
  );
  const { drawStaffCast } = await import(
    new URL("reprises/staff-cast.js", location.href)
  );
  const names = {
    idle: "Attente",
    guard: "Garde",
    move: "Approche",
    attack: "Attaque · arme principale",
    combo: "Double coup · enchaîné",
    cast: "Sort · bâton en avant",
    heal: "Soin · bâton en avant",
    offhand: "Attaque · seconde arme",
    block: "Parade",
    evade: "Esquive",
    damage: "Dégâts",
    death: "Mort",
    bandage: "Bandage",
  };
  const images = new Map(),
    frames = new Map();
  let frameBytes = 0,
    active = null,
    zoom = null,
    lastDraw = 0;
  const style = document.createElement("style");
  style.textContent =
    ".review-title{color:#cde7ae}.review-controls{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0}.review-controls select{min-width:0;max-width:100%;font-size:14px}.review-controls button{font-size:14px}.new-review-canvas{display:block;width:100%;height:auto;background:linear-gradient(0deg,#14212c,#344857);cursor:zoom-in;border-radius:4px}.review-note{color:#cfdeb7}.review-modal-canvas{display:block;width:100%;height:auto;max-height:78dvh;object-fit:contain}";
  document.head.append(style);
  const modal = document.createElement("dialog");
  modal.className = "advanced-motion-modal";
  modal.setAttribute("aria-label", "Nouvelle animation agrandie");
  modal.innerHTML =
    '<button type="button">Fermer ×</button><canvas width="960" height="960" class="review-modal-canvas"></canvas>';
  document.body.append(modal);
  modal.querySelector("button").onclick = () => modal.close();
  modal.onclick = (e) => {
    if (e.target === modal) modal.close();
  };
  modal.addEventListener("close", () => (zoom = null));
  async function image(profile, source = profile.source, root = "reprises/") {
    const key = root + source;
    let item = images.get(key);
    if (item) {
      images.delete(key);
      images.set(key, item);
      return item;
    }
    const img = new Image();
    img.src = assetURL(root + source);
    item = img.decode().then(() => img);
    images.set(key, item);
    while (images.size > 3) images.delete(images.keys().next().value);
    return item;
  }
  async function frame(profile, index) {
    const key = profile.id + ":" + index;
    let result = frames.get(key);
    if (result) {
      frames.delete(key);
      frames.set(key, result);
      return result;
    }
    const f = profile.frames[index],
      img = await image(profile, f.source ?? profile.source),
      c = document.createElement("canvas");
    c.width = f.width;
    c.height = f.height;
    const ctx = c.getContext("2d");
    ctx.beginPath();
    for (const [x, y, w] of f.runs) ctx.rect(x - f.x, y - f.y, w, 1);
    ctx.clip();
    ctx.drawImage(img, f.x, f.y, f.width, f.height, 0, 0, f.width, f.height);
    frames.set(key, c);
    frameBytes += c.width * c.height * 4;
    while (frameBytes > 16 * 1024 * 1024 && frames.size > 1) {
      const [old, value] = frames.entries().next().value;
      frames.delete(old);
      frameBytes -= value.width * value.height * 4;
    }
    return c;
  }
  async function draw(player, canvas, time) {
    const request = player.profile.id + ":" + player.clip;
    const clip = player.profile.clips[player.clip];
    const elapsed = player.paused
      ? player.stopped
      : Math.max(0, time - player.start) * player.speed;
    const sample = sampleReview(player.profile, player.clip, elapsed);
    const index = sample.index,
      f = player.profile.frames[index];
    const oldGuard =
      player.profile.guardImage && ["idle", "guard"].includes(player.clip);
    const bitmap = oldGuard
      ? await image(player.profile, player.profile.guardImage, "")
      : await frame(player.profile, index);
    if (canvas.dataset.request && canvas.dataset.request !== request) return;
    const ctx = canvas.getContext("2d"),
      unit = canvas.width / 320;
    ctx.setTransform(unit, 0, 0, unit, 0, 0);
    ctx.clearRect(0, 0, 320, 320);
    ctx.imageSmoothingEnabled = false;
    const casting = ["cast", "heal"].includes(player.clip);
    let x = casting ? 92 : 160,
      scale = 136 / (f.referenceHeight ?? player.profile.referenceHeight);
    const ground = 306;
    if (player.clip === "evade")
      x -= 18 * Math.sin(Math.PI * Math.min(1, sample.phase));
    if (["idle", "guard"].includes(player.clip)) {
      const p = (elapsed * Math.PI * 2) / 2200;
      ctx.translate(x, ground);
      ctx.transform(
        1,
        0,
        Math.sin(p) * 0.012,
        1 - (1 - Math.cos(p)) * 0.012,
        0,
        0,
      );
      ctx.translate(-x, -ground);
    }
    if (oldGuard) ctx.drawImage(bitmap, 0, 0, 320, 320);
    else
      ctx.drawImage(
        bitmap,
        x + (f.x - f.anchorX) * scale,
        ground + (f.y - f.ground) * scale,
        f.width * scale,
        f.height * scale,
      );
    canvas.dataset.impactCount = String(sample.impactCount);
    if (casting) {
      const releaseSlot = player.profile.impacts?.[player.clip]?.[0] ?? 4;
      const launch = player.profile.frames[clip[Math.max(0, releaseSlot - 1)]];
      const point = (v) => {
        const sc = 136 / (v.referenceHeight ?? player.profile.referenceHeight);
        return {
          x: x + (v.weaponTip.x - v.anchorX) * sc,
          y: ground + (v.weaponTip.y - v.ground) * sc,
        };
      };
      const origin = point(launch),
        charge = point(f),
        target = { x: 288, y: 246 };
      drawStaffCast(
        ctx,
        player.profile.effect ?? "lightning",
        sample.time - (sample.impacts[0] ?? 620),
        origin,
        target,
        68,
        true,
        charge,
      );
      ctx.fillStyle = player.clip === "heal" ? "#9bd8ae" : "#d4c29a";
      ctx.font = "7px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(player.clip === "heal" ? "Allié" : "Cible", 288, 263);
      canvas.dataset.staffOriginX = String(origin.x);
      canvas.dataset.staffOriginY = String(origin.y);
      canvas.dataset.staffChargeX = String(charge.x);
      canvas.dataset.staffChargeY = String(charge.y);
    } else if (sample.impactAge >= 0 && sample.impactAge < 90) {
      const tip = f.weaponTip;
      if (tip) {
        ctx.fillStyle = "#f9e8b3";
        ctx.beginPath();
        ctx.arc(
          x + (tip.x - f.anchorX) * scale,
          ground + (tip.y - f.ground) * scale,
          3 * (1 - sample.impactAge / 90),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
    canvas.dataset.profile = player.profile.id;
    canvas.dataset.animation = player.clip;
    canvas.dataset.frame = String(index);
    canvas.dataset.ready = "true";
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const p = e.target._reviewPlayer;
        if (p) {
          p.visible = e.isIntersecting;
          if (p.visible) void draw(p, p.canvas, performance.now());
        }
      }
    },
    { rootMargin: "160px" },
  );
  for (const profile of profiles) {
    const card = document.querySelector('[data-variant="' + profile.id + '"]');
    if (!card) continue;
    const old = card.querySelector(".poses"),
      oldImage = old.querySelector("img").cloneNode(true);
    oldImage.loading = "lazy";
    if (profile.beforeImage)
      oldImage.src = assetURL("reprises/" + profile.beforeImage);
    const preview = document.createElement("section");
    preview.className = "new-review";
    preview.innerHTML =
      '<p class="review-title"><strong>Apparence · comparaison</strong></p><div class="poses"><figure><figcaption>Avant cette correction</figcaption><div class="old-reference"></div></figure><figure><figcaption>Nouvelle version · toucher pour agrandir</figcaption><canvas class="new-review-canvas" width="640" height="640" aria-label="Nouvelle animation ' +
      card.querySelector("h3").textContent +
      '" tabindex="0" role="button"></canvas></figure></div><div class="review-controls"><select aria-label="Animation">' +
      Object.keys(profile.clips)
        .map(
          (k) =>
            '<option value="' +
            k +
            '" ' +
            (k === "guard" ? "selected" : "") +
            ">" +
            names[k] +
            "</option>",
        )
        .join("") +
      '</select><select aria-label="Vitesse"><option value="0.25">×0,25</option><option value="0.5">×0,5</option><option value="1" selected>×1</option></select><button type="button" data-review-pause>Jouer</button><button type="button" data-review-replay>Rejouer</button></div><p class="review-note">Gardes intégrées pour les nouveaux skins disponibles. Les animations avancées restent provisoires.</p>';
    preview.querySelector(".old-reference").append(oldImage);
    Object.assign(oldImage.style, {
      width: "100%",
      height: "auto",
      display: "block",
      background: "#344857",
      borderRadius: "4px",
    });
    if (profile.roleMarker) {
      const note = document.createElement("p");
      note.className = "review-note";
      note.textContent = profile.roleMarker;
      preview.querySelector(".review-title").after(note);
    }
    const link = document.createElement("a");
    link.href = new URL("reprises/" + profile.source, location.href);
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Planche complète · " + profile.frames.length + " poses";
    preview.querySelector(".review-controls").append(link);
    if (profile.attackSheet) {
      const attack = document.createElement("a");
      attack.href = new URL("reprises/" + profile.attackSheet, location.href);
      attack.target = "_blank";
      attack.rel = "noopener";
      attack.textContent = "Animation à revoir · 8 poses";
      preview.querySelector(".review-controls").append(attack);
      link.textContent = "Autres gestes du modèle";
    }
    const archive = document.createElement("details");
    archive.innerHTML = "<summary>Voir les anciennes poses de combat</summary>";
    old.replaceWith(preview);
    archive.append(old);
    preview.after(archive);
    for (const note of card.querySelectorAll(".notice"))
      note.textContent = note.textContent.replace(
        "Apparence actuelle partagée",
        "Ancienne apparence partagée",
      );
    card.querySelector(".map-pose figcaption").textContent =
      profile.integratedGuard ? "Carte avant intégration" : "Carte actuelle";
    const canvas = preview.querySelector("canvas"),
      player = {
        profile,
        canvas,
        clip: "guard",
        start: performance.now(),
        speed: 1,
        paused: true,
        stopped: 0,
        visible: false,
      };
    preview._reviewPlayer = player;
    observer.observe(preview);
    const set = () => {
      canvas.dataset.request = profile.id + ":" + player.clip;
      void draw(player, canvas, performance.now());
    };
    const play = () => {
      if (active && active !== player) {
        active.stopped = (performance.now() - active.start) * active.speed;
        active.paused = true;
        active.pauseButton.textContent = "Jouer";
      }
      active = player;
    };
    const pause = preview.querySelector("[data-review-pause]");
    player.pauseButton = pause;
    preview.querySelector('[aria-label="Animation"]').onchange = (e) => {
      player.clip = e.target.value;
      player.start = performance.now();
      player.stopped = 0;
      player.paused = false;
      pause.textContent = "Pause";
      play();
      set();
    };
    preview.querySelector('[aria-label="Vitesse"]').onchange = (e) => {
      player.speed = Number(e.target.value);
      player.start = performance.now();
      player.stopped = 0;
      set();
    };
    pause.onclick = () => {
      if (player.paused) {
        player.start = performance.now() - player.stopped / player.speed;
        player.paused = false;
        pause.textContent = "Pause";
        play();
      } else {
        player.stopped = (performance.now() - player.start) * player.speed;
        player.paused = true;
        pause.textContent = "Jouer";
      }
      set();
    };
    preview.querySelector("[data-review-replay]").onclick = () => {
      player.start = performance.now();
      player.stopped = 0;
      player.paused = false;
      pause.textContent = "Pause";
      play();
      set();
    };
    const enlarge = () => {
      zoom = player;
      modal.showModal();
      void draw(player, modal.querySelector("canvas"), performance.now());
    };
    canvas.onclick = enlarge;
    canvas.onkeydown = (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        enlarge();
      }
    };
  }
  const notice = document.createElement("p");
  notice.className = "notice";
  notice.textContent =
    profiles.length +
    " apparences à comparer. Les 21 nouvelles gardes disponibles sont intégrées en campagne. Les animations avancées précédentes sont conservées en attendant leur reprise.";
  document.querySelector("nav.filters").before(notice);
  function tick(time) {
    requestAnimationFrame(tick);
    if (time - lastDraw < 75) return;
    lastDraw = time;
    if (
      active &&
      !active.paused &&
      active.visible &&
      !active.canvas.closest("[hidden]")
    )
      void draw(active, active.canvas, time);
    if (zoom) void draw(zoom, modal.querySelector("canvas"), time);
  }
  requestAnimationFrame(tick);
})().catch((error) => {
  const p = document.createElement("p");
  p.className = "notice";
  p.textContent =
    "Les nouvelles planches n’ont pas pu être chargées. Réessayez en rechargeant la page.";
  document.querySelector("main").prepend(p);
  console.error(error);
});
