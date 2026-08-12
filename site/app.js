const ACCENTS = ["#3694FC", "#6100FF", "#00E2A0", "#FF5B8A", "#B98FFF", "#36EAD0", "#f59e0b"];
const EMOJI_CHOICES = ["🎨", "🧪", "🛒", "📊", "🧭", "🚀", "🧩", "📁", "🗂️", "💡", "🎯", "🔧", "📱", "🖥️", "✨", "🧠"];

const state = {
  data: null,
  route: { designer: null, folder: null },
  query: "",
  activeTag: null,
};

const root = document.getElementById("root");
const heroTitle = document.getElementById("hero-title");
const heroSubtitle = document.getElementById("hero-subtitle");
const breadcrumbEl = document.getElementById("breadcrumb");
const searchInput = document.getElementById("search");
const tagBar = document.getElementById("tag-bar");
const addBtn = document.getElementById("add-btn");
const modalOverlay = document.getElementById("modal-overlay");
const modalCard = document.getElementById("modal-card");
const toastEl = document.getElementById("toast");

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function fmtDate(iso) {
  if (!iso) return "?";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function toast(message, isError) {
  toastEl.textContent = message;
  toastEl.style.color = isError ? "var(--coral)" : "var(--text)";
  toastEl.classList.add("visible");
  clearTimeout(toastEl._t);
  toastEl._t = setTimeout(() => toastEl.classList.remove("visible"), 3200);
}

async function api(path, body) {
  const res = await fetch(`/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

/* ========== TILT / SPOTLIGHT MICRO-INTERACTION ========== */
function attachTilt(el) {
  el.classList.add("tilt-ready");
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
    const tx = (y - 0.5) * -6;
    const ty = (x - 0.5) * 6;
    el.style.transform = `translateY(-4px) perspective(900px) rotateX(${tx}deg) rotateY(${ty}deg)`;
  });
  el.addEventListener("mouseleave", () => {
    el.style.transform = "";
  });
}

/* ========== ROUTING ========== */
function parseHash() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
  state.route.designer = parts[0] || null;
  state.route.folder = parts[1] || null;
}

function navigate(hash) {
  location.hash = hash;
}

window.addEventListener("hashchange", () => {
  parseHash();
  state.query = "";
  state.activeTag = null;
  searchInput.value = "";
  render();
});

/* ========== DATA LOAD ========== */
async function loadData() {
  const res = await fetch("data.json", { cache: "no-store" });
  state.data = await res.json();
}

function getDesigner(slug) {
  return state.data.designers.find((d) => d.slug === slug);
}

/* ========== RENDER: BREADCRUMB ========== */
function renderBreadcrumb() {
  const { designer, folder } = state.route;
  let html = `<a href="#/">NDLR</a>`;
  if (designer) {
    const d = getDesigner(designer);
    html += `<span class="sep">/</span>`;
    html += folder
      ? `<a href="#/${designer}">${escapeHtml(d ? d.displayName : designer)}</a>`
      : `<span class="current">${escapeHtml(d ? d.displayName : designer)}</span>`;
  }
  if (folder) {
    const d = getDesigner(designer);
    const f = d && d.folders.find((f) => f.id === folder);
    html += `<span class="sep">/</span><span class="current">${escapeHtml(f ? f.name : folder)}</span>`;
  }
  breadcrumbEl.innerHTML = html;
}

/* ========== RENDER: HOME (designer tiles) ========== */
function renderHome() {
  heroTitle.textContent = "NDLR";
  heroSubtitle.textContent = "A shared directory where designers organize links to their Figma, FigJam, and prototype files into their own folders.";
  addBtn.textContent = "+ Designer";
  searchInput.placeholder = "Search designers...";
  tagBar.innerHTML = "";
  tagBar.style.display = "none";

  const designers = state.data.designers.filter((d) =>
    !state.query || d.displayName.toLowerCase().includes(state.query.toLowerCase())
  );

  if (designers.length === 0) {
    root.innerHTML = `<div class="empty-state"><div class="glyph">🗂️</div><p>No designers yet. Click "+ Designer" to add the first one.</p></div>`;
    return;
  }

  root.innerHTML = `<div class="tile-grid" id="grid"></div>`;
  const grid = document.getElementById("grid");
  designers.forEach((d) => {
    const totalLinks = d.links.length;
    const tile = document.createElement("a");
    tile.className = "folder-tile";
    tile.href = `#/${d.slug}`;
    tile.innerHTML = `
      <button class="tile-edit-btn" type="button" data-edit-designer="${d.slug}" title="Edit">✏️</button>
      <div class="folder-cover" style="background: linear-gradient(135deg, ${d.color}, ${shade(d.color)});">
        <span>${d.emoji || "🎨"}</span>
      </div>
      <div class="folder-body">
        <div class="folder-name">${escapeHtml(d.displayName)}</div>
        <div class="folder-meta">${d.folders.length} folder${d.folders.length === 1 ? "" : "s"} · ${totalLinks} link${totalLinks === 1 ? "" : "s"}</div>
      </div>
    `;
    attachTilt(tile);
    tile.querySelector("[data-edit-designer]").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openEditDesignerModal(d);
    });
    grid.appendChild(tile);
  });
}

function shade(hex) {
  // Cheap analog-color shift for a two-tone cover gradient.
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 0xff, g = (n >> 8) & 0xff, b = n & 0xff;
  r = Math.max(0, r - 40); g = Math.max(0, g - 20); b = Math.min(255, b + 30);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/* ========== RENDER: DESIGNER (folder tiles) ========== */
function renderDesigner(designer) {
  heroTitle.textContent = designer.displayName;
  heroSubtitle.textContent = `${designer.emoji || "🎨"} ${designer.folders.length} folder${designer.folders.length === 1 ? "" : "s"} of design links.`;
  addBtn.textContent = "+ Folder";
  searchInput.placeholder = "Search folders...";
  tagBar.innerHTML = "";
  tagBar.style.display = "none";

  const folders = designer.folders.filter((f) =>
    !state.query || f.name.toLowerCase().includes(state.query.toLowerCase())
  );

  if (folders.length === 0) {
    root.innerHTML = `<div class="empty-state"><div class="glyph">📁</div><p>No folders yet. Click "+ Folder" to create one.</p></div>`;
    return;
  }

  root.innerHTML = `<div class="tile-grid" id="grid"></div>`;
  const grid = document.getElementById("grid");
  folders.forEach((f) => {
    const count = designer.links.filter((l) => (l.folder || "uncategorized") === f.id).length;
    const tile = document.createElement("a");
    tile.className = "folder-tile";
    tile.href = `#/${designer.slug}/${f.id}`;
    tile.innerHTML = `
      <button class="tile-edit-btn" type="button" data-edit-folder="${f.id}" title="Edit">✏️</button>
      <div class="folder-cover" style="background: linear-gradient(135deg, ${f.color}, ${shade(f.color)});">
        <span>${f.emoji || "📁"}</span>
      </div>
      <div class="folder-body">
        <div class="folder-name">${escapeHtml(f.name)}</div>
        <div class="folder-meta">${count} link${count === 1 ? "" : "s"}</div>
      </div>
    `;
    attachTilt(tile);
    tile.querySelector("[data-edit-folder]").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openEditFolderModal(designer, f);
    });
    grid.appendChild(tile);
  });
}

/* ========== RENDER: FOLDER (link cards) ========== */
function renderFolder(designer, folder) {
  heroTitle.textContent = folder.name;
  heroSubtitle.textContent = `${folder.emoji || "📁"} ${designer.displayName}'s links in this folder.`;
  addBtn.textContent = "+ Link";
  searchInput.placeholder = "Search links...";
  tagBar.style.display = "flex";

  const links = designer.links.filter((l) => (l.folder || "uncategorized") === folder.id);
  const tags = Array.from(new Set(links.flatMap((l) => l.tags || []))).sort();
  tagBar.innerHTML = tags
    .map((t) => `<button class="tag-chip${state.activeTag === t ? " active" : ""}" data-tag="${escapeHtml(t)}">${escapeHtml(t)}</button>`)
    .join("");

  const shown = links
    .filter((l) => !state.activeTag || (l.tags || []).includes(state.activeTag))
    .filter((l) => {
      if (!state.query) return true;
      const hay = `${l.name} ${l.description || ""}`.toLowerCase();
      return hay.includes(state.query.toLowerCase());
    })
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  if (shown.length === 0) {
    root.innerHTML = `<div class="empty-state"><div class="glyph">🔗</div><p>No links match yet. Click "+ Link" to add the first one.</p></div>`;
    return;
  }

  root.innerHTML = `<div class="tile-grid" id="grid"></div>`;
  const grid = document.getElementById("grid");
  shown.forEach((link) => {
    const card = document.createElement("a");
    card.className = "link-card";
    card.href = link.url;
    card.target = "_blank";
    card.rel = "noopener";

    const preview = link.preview || {};
    const updated = link.updated_at && link.updated_at !== link.created_at ? ` · Updated ${fmtDate(link.updated_at)}` : "";

    card.innerHTML = `
      <button class="tile-edit-btn" type="button" data-edit-link="${link.id}" title="Edit">✏️</button>
      <div class="link-preview-img">
        ${preview.image
          ? `<img src="${escapeHtml(preview.image)}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<img class=\\'fallback-favicon\\' src=${JSON.stringify(preview.favicon || "")} alt=\\'\\'>'">`
          : preview.favicon
            ? `<img class="fallback-favicon" src="${escapeHtml(preview.favicon)}" alt="" loading="lazy">`
            : ""}
      </div>
      <div class="link-inner">
        <div class="link-title-row">
          ${preview.favicon ? `<img class="favicon" src="${escapeHtml(preview.favicon)}" alt="" loading="lazy">` : ""}
          <div class="link-title">${escapeHtml(link.name)}</div>
        </div>
        ${link.description ? `<p class="link-desc">${escapeHtml(link.description)}</p>` : ""}
        <div class="link-meta-row">Added ${fmtDate(link.created_at)}${updated}</div>
        <div class="link-tags">${(link.tags || []).map((t) => `<span>${escapeHtml(t)}</span>`).join("")}</div>
      </div>
    `;
    attachTilt(card);
    card.querySelector("[data-edit-link]").addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openEditLinkModal(designer, folder, link);
    });
    grid.appendChild(card);
  });

  tagBar.querySelectorAll(".tag-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeTag = state.activeTag === btn.dataset.tag ? null : btn.dataset.tag;
      render();
    });
  });
}

/* ========== MAIN RENDER DISPATCH ========== */
function render() {
  renderBreadcrumb();
  const { designer: dSlug, folder: fId } = state.route;

  if (!dSlug) {
    renderHome();
    return;
  }
  const designer = getDesigner(dSlug);
  if (!designer) {
    root.innerHTML = `<div class="empty-state"><div class="glyph">🚫</div><p>Designer not found.</p></div>`;
    heroTitle.textContent = "Not found";
    addBtn.textContent = "+ Designer";
    tagBar.style.display = "none";
    return;
  }
  if (!fId) {
    renderDesigner(designer);
    return;
  }
  const folder = designer.folders.find((f) => f.id === fId);
  if (!folder) {
    root.innerHTML = `<div class="empty-state"><div class="glyph">🚫</div><p>Folder not found.</p></div>`;
    heroTitle.textContent = "Not found";
    addBtn.textContent = "+ Folder";
    tagBar.style.display = "none";
    return;
  }
  renderFolder(designer, folder);
}

searchInput.addEventListener("input", (e) => {
  state.query = e.target.value;
  render();
});

/* ========== MODAL SYSTEM ========== */
function openModal(html, onMount) {
  modalCard.innerHTML = html;
  modalOverlay.classList.add("open");
  if (onMount) onMount(modalCard);
}
function closeModal() {
  modalOverlay.classList.remove("open");
  modalCard.innerHTML = "";
}
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

function pickerHtml(idPrefix, choices, kind) {
  return choices
    .map(
      (c, i) =>
        `<div class="${kind}-pick" data-value="${escapeHtml(c)}" data-idx="${i}" ${kind === "color" ? `style="background:${c};"` : ""}>${kind === "emoji" ? c : ""}</div>`
    )
    .join("");
}

function wirePicker(container, selector, onPick) {
  container.querySelectorAll(selector).forEach((el) => {
    el.addEventListener("click", () => {
      container.querySelectorAll(selector).forEach((s) => s.classList.remove("active"));
      el.classList.add("active");
      onPick(el.dataset.value);
    });
  });
}

function wireTagInput(container, wrapSelector, initialTags, suggestions) {
  const wrap = container.querySelector(wrapSelector);
  const input = wrap.querySelector("input");
  let tags = [...initialTags];

  function renderTags() {
    wrap.querySelectorAll(".tag-pill").forEach((p) => p.remove());
    tags.forEach((t) => {
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.innerHTML = `${escapeHtml(t)} <button type="button" aria-label="remove">&times;</button>`;
      pill.querySelector("button").addEventListener("click", () => {
        tags = tags.filter((x) => x !== t);
        renderTags();
      });
      wrap.insertBefore(pill, input);
    });
  }

  function addTag(raw) {
    const t = raw.trim().toLowerCase();
    if (t && !tags.includes(t)) {
      tags.push(t);
      renderTags();
    }
    input.value = "";
  }

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input.value);
    } else if (e.key === "Backspace" && !input.value && tags.length) {
      tags.pop();
      renderTags();
    }
  });

  const sugWrap = container.querySelector(".tag-suggestions");
  if (sugWrap) {
    sugWrap.innerHTML = suggestions
      .filter((s) => !tags.includes(s))
      .slice(0, 12)
      .map((s) => `<button type="button" class="tag-chip" data-tag="${escapeHtml(s)}">+ ${escapeHtml(s)}</button>`)
      .join("");
    sugWrap.querySelectorAll(".tag-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        addTag(btn.dataset.tag);
        sugWrap.querySelectorAll(`[data-tag="${btn.dataset.tag}"]`).forEach((b) => b.remove());
      });
    });
  }

  renderTags();
  return () => tags;
}

/* ---- Add Designer ---- */
function openAddDesignerModal() {
  openModal(
    `
    <div class="modal-title">🎨 New designer folder</div>
    <div class="field">
      <label>Name</label>
      <input type="text" id="m-name" placeholder="e.g. Jamie Chen" />
    </div>
    <div class="field">
      <label>Emoji</label>
      <div class="emoji-grid" id="m-emoji">${pickerHtml("m-emoji", EMOJI_CHOICES, "emoji")}</div>
    </div>
    <div class="field">
      <label>Color</label>
      <div class="color-grid" id="m-color">${pickerHtml("m-color", ACCENTS, "color")}</div>
    </div>
    <div class="form-error" id="m-error"></div>
    <div class="modal-actions">
      <button class="btn-secondary" id="m-cancel" type="button">Cancel</button>
      <button class="btn-primary-modal" id="m-submit" type="button">Create</button>
    </div>
  `,
    (card) => {
      let emoji = EMOJI_CHOICES[0];
      let color = ACCENTS[0];
      wirePicker(card, ".emoji-pick", (v) => (emoji = v));
      wirePicker(card, ".color-pick", (v) => (color = v));
      card.querySelector("#m-cancel").addEventListener("click", closeModal);
      card.querySelector("#m-submit").addEventListener("click", async () => {
        const name = card.querySelector("#m-name").value.trim();
        const errEl = card.querySelector("#m-error");
        if (!name) return (errEl.textContent = "Name is required.");
        const btn = card.querySelector("#m-submit");
        btn.disabled = true;
        btn.textContent = "Creating...";
        try {
          const result = await api("save-designer", { displayName: name, emoji, color });
          state.data.designers.push({
            slug: result.slug,
            displayName: result.displayName,
            emoji: result.emoji,
            color: result.color,
            folders: result.folders,
            links: [],
          });
          closeModal();
          toast(`Added ${name}`);
          navigate(`#/${result.slug}`);
        } catch (err) {
          errEl.textContent = err.message;
          btn.disabled = false;
          btn.textContent = "Create";
        }
      });
    }
  );
}

/* ---- Add Folder ---- */
function openAddFolderModal(designer) {
  openModal(
    `
    <div class="modal-title">📁 New folder in ${escapeHtml(designer.displayName)}</div>
    <div class="field">
      <label>Name</label>
      <input type="text" id="m-name" placeholder="e.g. Checkout Project" />
    </div>
    <div class="field">
      <label>Emoji</label>
      <div class="emoji-grid" id="m-emoji">${pickerHtml("m-emoji", EMOJI_CHOICES, "emoji")}</div>
    </div>
    <div class="field">
      <label>Color</label>
      <div class="color-grid" id="m-color">${pickerHtml("m-color", ACCENTS, "color")}</div>
    </div>
    <div class="form-error" id="m-error"></div>
    <div class="modal-actions">
      <button class="btn-secondary" id="m-cancel" type="button">Cancel</button>
      <button class="btn-primary-modal" id="m-submit" type="button">Create</button>
    </div>
  `,
    (card) => {
      let emoji = EMOJI_CHOICES[2];
      let color = ACCENTS[1];
      wirePicker(card, ".emoji-pick", (v) => (emoji = v));
      wirePicker(card, ".color-pick", (v) => (color = v));
      card.querySelector("#m-cancel").addEventListener("click", closeModal);
      card.querySelector("#m-submit").addEventListener("click", async () => {
        const name = card.querySelector("#m-name").value.trim();
        const errEl = card.querySelector("#m-error");
        if (!name) return (errEl.textContent = "Name is required.");
        const btn = card.querySelector("#m-submit");
        btn.disabled = true;
        btn.textContent = "Creating...";
        try {
          const result = await api("save-folder", { designerSlug: designer.slug, folder: { name, emoji, color } });
          designer.folders.push(result.folder);
          closeModal();
          toast(`Added folder "${name}"`);
          navigate(`#/${designer.slug}/${result.folder.id}`);
        } catch (err) {
          errEl.textContent = err.message;
          btn.disabled = false;
          btn.textContent = "Create";
        }
      });
    }
  );
}

/* ---- Add Link ---- */
function openAddLinkModal(designer, folder) {
  openModal(
    `
    <div class="modal-title">🔗 New link in ${escapeHtml(folder.name)}</div>
    <div class="field">
      <label>Paste a URL</label>
      <input type="url" id="m-url" placeholder="https://figma.com/file/..." />
      <div class="field-hint" id="m-fetch-status"></div>
    </div>
    <div class="preview-card" id="m-preview" style="display:none;">
      <img class="thumb" id="m-preview-img" alt="" />
      <div>
        <div class="p-title" id="m-preview-title"></div>
        <div class="p-desc" id="m-preview-desc"></div>
      </div>
    </div>
    <div class="field">
      <label>Name</label>
      <input type="text" id="m-name" placeholder="Short title" />
    </div>
    <div class="field">
      <label>Description</label>
      <textarea id="m-desc" rows="2" placeholder="What this is / where it's at"></textarea>
    </div>
    <div class="field">
      <label>Tags</label>
      <div class="tag-input-wrap" id="m-tag-wrap"><input type="text" placeholder="Type and press Enter..." /></div>
      <div class="tag-suggestions" id="m-tag-suggestions"></div>
    </div>
    <div class="form-error" id="m-error"></div>
    <div class="modal-actions">
      <button class="btn-secondary" id="m-cancel" type="button">Cancel</button>
      <button class="btn-primary-modal" id="m-submit" type="button">Add link</button>
    </div>
  `,
    (card) => {
      let fetchedPreview = {};
      const getTags = wireTagInput(card, "#m-tag-wrap", [], state.data.suggestedTags || []);

      const urlInput = card.querySelector("#m-url");
      const statusEl = card.querySelector("#m-fetch-status");
      const nameInput = card.querySelector("#m-name");
      const descInput = card.querySelector("#m-desc");
      const previewBox = card.querySelector("#m-preview");

      let debounceTimer;
      urlInput.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const url = urlInput.value.trim();
        if (!/^https?:\/\//i.test(url)) return;
        debounceTimer = setTimeout(async () => {
          statusEl.textContent = "Fetching preview...";
          try {
            const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`);
            const p = await res.json();
            fetchedPreview = p;
            statusEl.textContent = "Preview fetched.";
            if (!nameInput.value) nameInput.value = p.title || "";
            if (!descInput.value && p.description) descInput.value = p.description;
            card.querySelector("#m-preview-img").src = p.image || p.favicon || "";
            card.querySelector("#m-preview-title").textContent = p.title || url;
            card.querySelector("#m-preview-desc").textContent = p.description || "";
            previewBox.style.display = "flex";
          } catch {
            statusEl.textContent = "Couldn't fetch a preview — you can still fill this in manually.";
          }
        }, 500);
      });

      card.querySelector("#m-cancel").addEventListener("click", closeModal);
      card.querySelector("#m-submit").addEventListener("click", async () => {
        const url = urlInput.value.trim();
        const name = nameInput.value.trim();
        const errEl = card.querySelector("#m-error");
        if (!url) return (errEl.textContent = "URL is required.");
        if (!name) return (errEl.textContent = "Name is required.");
        const btn = card.querySelector("#m-submit");
        btn.disabled = true;
        btn.textContent = "Adding...";
        try {
          const result = await api("save-link", {
            designerSlug: designer.slug,
            folderId: folder.id,
            link: {
              name,
              url,
              description: descInput.value.trim(),
              tags: getTags(),
              preview: fetchedPreview,
            },
          });
          designer.links.push(result.link);
          closeModal();
          toast(`Added "${name}"`);
          render();
        } catch (err) {
          errEl.textContent = err.message;
          btn.disabled = false;
          btn.textContent = "Add link";
        }
      });
    }
  );
}

/* ---- Edit Designer ---- */
function openEditDesignerModal(designer) {
  openModal(
    `
    <div class="modal-title">✏️ Edit ${escapeHtml(designer.displayName)}</div>
    <div class="field">
      <label>Name</label>
      <input type="text" id="m-name" value="${escapeHtml(designer.displayName)}" />
    </div>
    <div class="field">
      <label>Emoji</label>
      <div class="emoji-grid" id="m-emoji">${pickerHtml("m-emoji", EMOJI_CHOICES, "emoji")}</div>
    </div>
    <div class="field">
      <label>Color</label>
      <div class="color-grid" id="m-color">${pickerHtml("m-color", ACCENTS, "color")}</div>
    </div>
    <div class="form-error" id="m-error"></div>
    <div class="modal-actions with-delete">
      <button class="btn-danger" id="m-delete" type="button">Delete designer</button>
      <div style="display:flex; gap:10px;">
        <button class="btn-secondary" id="m-cancel" type="button">Cancel</button>
        <button class="btn-primary-modal" id="m-submit" type="button">Save</button>
      </div>
    </div>
  `,
    (card) => {
      let emoji = designer.emoji;
      let color = designer.color;
      markActive(card, ".emoji-pick", emoji);
      markActive(card, ".color-pick", color);
      wirePicker(card, ".emoji-pick", (v) => (emoji = v));
      wirePicker(card, ".color-pick", (v) => (color = v));
      card.querySelector("#m-cancel").addEventListener("click", closeModal);
      card.querySelector("#m-delete").addEventListener("click", async () => {
        if (!confirm(`Delete "${designer.displayName}" and all their folders/links? This can't be undone.`)) return;
        try {
          await api("delete-designer", { slug: designer.slug });
          state.data.designers = state.data.designers.filter((d) => d.slug !== designer.slug);
          closeModal();
          toast(`Deleted ${designer.displayName}`);
          navigate("#/");
        } catch (err) {
          card.querySelector("#m-error").textContent = err.message;
        }
      });
      card.querySelector("#m-submit").addEventListener("click", async () => {
        const name = card.querySelector("#m-name").value.trim();
        const errEl = card.querySelector("#m-error");
        if (!name) return (errEl.textContent = "Name is required.");
        const btn = card.querySelector("#m-submit");
        btn.disabled = true;
        btn.textContent = "Saving...";
        try {
          const result = await api("update-designer", { slug: designer.slug, patch: { displayName: name, emoji, color } });
          designer.displayName = result.displayName;
          designer.emoji = result.emoji;
          designer.color = result.color;
          closeModal();
          toast("Saved");
          render();
        } catch (err) {
          errEl.textContent = err.message;
          btn.disabled = false;
          btn.textContent = "Save";
        }
      });
    }
  );
}

/* ---- Edit Folder ---- */
function openEditFolderModal(designer, folder) {
  const canDelete = folder.id !== "uncategorized";
  openModal(
    `
    <div class="modal-title">✏️ Edit ${escapeHtml(folder.name)}</div>
    <div class="field">
      <label>Name</label>
      <input type="text" id="m-name" value="${escapeHtml(folder.name)}" />
    </div>
    <div class="field">
      <label>Emoji</label>
      <div class="emoji-grid" id="m-emoji">${pickerHtml("m-emoji", EMOJI_CHOICES, "emoji")}</div>
    </div>
    <div class="field">
      <label>Color</label>
      <div class="color-grid" id="m-color">${pickerHtml("m-color", ACCENTS, "color")}</div>
    </div>
    <div class="form-error" id="m-error"></div>
    <div class="modal-actions with-delete">
      ${canDelete ? `<button class="btn-danger" id="m-delete" type="button">Delete folder</button>` : `<span></span>`}
      <div style="display:flex; gap:10px;">
        <button class="btn-secondary" id="m-cancel" type="button">Cancel</button>
        <button class="btn-primary-modal" id="m-submit" type="button">Save</button>
      </div>
    </div>
  `,
    (card) => {
      let emoji = folder.emoji;
      let color = folder.color;
      markActive(card, ".emoji-pick", emoji);
      markActive(card, ".color-pick", color);
      wirePicker(card, ".emoji-pick", (v) => (emoji = v));
      wirePicker(card, ".color-pick", (v) => (color = v));
      card.querySelector("#m-cancel").addEventListener("click", closeModal);
      const delBtn = card.querySelector("#m-delete");
      if (delBtn) {
        delBtn.addEventListener("click", async () => {
          if (!confirm(`Delete "${folder.name}"? Its links will move to Uncategorized.`)) return;
          try {
            const result = await api("delete-folder", { designerSlug: designer.slug, folderId: folder.id });
            designer.folders = result.folders;
            designer.links.forEach((l) => {
              if (l.folder === folder.id) l.folder = "uncategorized";
            });
            closeModal();
            toast(`Deleted "${folder.name}"`);
            navigate(`#/${designer.slug}`);
          } catch (err) {
            card.querySelector("#m-error").textContent = err.message;
          }
        });
      }
      card.querySelector("#m-submit").addEventListener("click", async () => {
        const name = card.querySelector("#m-name").value.trim();
        const errEl = card.querySelector("#m-error");
        if (!name) return (errEl.textContent = "Name is required.");
        const btn = card.querySelector("#m-submit");
        btn.disabled = true;
        btn.textContent = "Saving...";
        try {
          const result = await api("update-folder", { designerSlug: designer.slug, folderId: folder.id, patch: { name, emoji, color } });
          Object.assign(folder, result.folder);
          closeModal();
          toast("Saved");
          render();
        } catch (err) {
          errEl.textContent = err.message;
          btn.disabled = false;
          btn.textContent = "Save";
        }
      });
    }
  );
}

/* ---- Edit Link ---- */
function openEditLinkModal(designer, folder, link) {
  openModal(
    `
    <div class="modal-title">✏️ Edit link</div>
    <div class="field">
      <label>URL</label>
      <input type="url" id="m-url" value="${escapeHtml(link.url)}" />
    </div>
    <div class="field">
      <label>Name</label>
      <input type="text" id="m-name" value="${escapeHtml(link.name)}" />
    </div>
    <div class="field">
      <label>Description</label>
      <textarea id="m-desc" rows="2">${escapeHtml(link.description || "")}</textarea>
    </div>
    <div class="field">
      <label>Tags</label>
      <div class="tag-input-wrap" id="m-tag-wrap"><input type="text" placeholder="Type and press Enter..." /></div>
      <div class="tag-suggestions" id="m-tag-suggestions"></div>
    </div>
    <div class="form-error" id="m-error"></div>
    <div class="modal-actions with-delete">
      <button class="btn-danger" id="m-delete" type="button">Delete link</button>
      <div style="display:flex; gap:10px;">
        <button class="btn-secondary" id="m-cancel" type="button">Cancel</button>
        <button class="btn-primary-modal" id="m-submit" type="button">Save</button>
      </div>
    </div>
  `,
    (card) => {
      const getTags = wireTagInput(card, "#m-tag-wrap", link.tags || [], state.data.suggestedTags || []);
      card.querySelector("#m-cancel").addEventListener("click", closeModal);
      card.querySelector("#m-delete").addEventListener("click", async () => {
        if (!confirm(`Delete "${link.name}"?`)) return;
        try {
          await api("delete-link", { designerSlug: designer.slug, linkId: link.id });
          designer.links = designer.links.filter((l) => l.id !== link.id);
          closeModal();
          toast(`Deleted "${link.name}"`);
          render();
        } catch (err) {
          card.querySelector("#m-error").textContent = err.message;
        }
      });
      card.querySelector("#m-submit").addEventListener("click", async () => {
        const url = card.querySelector("#m-url").value.trim();
        const name = card.querySelector("#m-name").value.trim();
        const errEl = card.querySelector("#m-error");
        if (!url) return (errEl.textContent = "URL is required.");
        if (!name) return (errEl.textContent = "Name is required.");
        const btn = card.querySelector("#m-submit");
        btn.disabled = true;
        btn.textContent = "Saving...";
        try {
          const result = await api("update-link", {
            designerSlug: designer.slug,
            linkId: link.id,
            patch: { url, name, description: card.querySelector("#m-desc").value.trim(), tags: getTags() },
          });
          Object.assign(link, result.link);
          closeModal();
          toast("Saved");
          render();
        } catch (err) {
          errEl.textContent = err.message;
          btn.disabled = false;
          btn.textContent = "Save";
        }
      });
    }
  );
}

function markActive(card, selector, value) {
  card.querySelectorAll(selector).forEach((el) => {
    if (el.dataset.value === value) el.classList.add("active");
  });
}

addBtn.addEventListener("click", () => {
  const { designer: dSlug, folder: fId } = state.route;
  if (!dSlug) return openAddDesignerModal();
  const designer = getDesigner(dSlug);
  if (!designer) return;
  if (!fId) return openAddFolderModal(designer);
  const folder = designer.folders.find((f) => f.id === fId);
  if (!folder) return;
  openAddLinkModal(designer, folder);
});

/* ========== INIT ========== */
(async function main() {
  await loadData();
  parseHash();
  render();
})();
