const fileInput = document.getElementById("file-input");
const galleryEl = document.getElementById("gallery");
const emptyStateEl = document.getElementById("empty-state");
const layoutGridBtn = document.getElementById("layout-grid");
const layoutListBtn = document.getElementById("layout-list");
const clearGalleryBtn = document.getElementById("clear-gallery");
const autoplayToggle = document.getElementById("autoplay-toggle");

// Account UI
const accountNameEl = document.getElementById("account-name");
const accountStatusEl = document.getElementById("account-status");
const accountEmailInput = document.getElementById("account-email");
const accountPasswordInput = document.getElementById("account-password");
const btnSignup = document.getElementById("btn-signup");
const btnSignin = document.getElementById("btn-signin");
const btnSignout = document.getElementById("btn-signout");

// -------- Supabase (works across devices) --------
// Your project ref was visible in your anon key: iuiioazmtynjouynpias
const SUPABASE_URL = "https://iuiioazmtynjouynpias.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1aWlvYXptdHluam91eW5waWFzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMjYyNDcsImV4cCI6MjA4NzcwMjI0N30.0n_d55gP0P4j7hCtUSHcqR7VurH0ByoCgtpEWnnJnHk";

const MEDIA_BUCKET = "media";
const SIGNED_URL_SECONDS = 60 * 60; // 1 hour

const supabase =
  window.supabase?.createClient?.(SUPABASE_URL, SUPABASE_ANON_KEY) ?? null;

let items = [];
let currentUser = null;

function setUploadEnabled(enabled) {
  fileInput.disabled = !enabled;
  clearGalleryBtn.disabled = !enabled;
}

function sanitizeFilename(name) {
  return String(name || "file")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

async function refreshSignedUrlForItem(item) {
  if (!supabase || !item?.path) return item;
  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(item.path, SIGNED_URL_SECONDS);
  if (!error && data?.signedUrl) {
    item.url = data.signedUrl;
  }
  return item;
}

async function loadItemsFromSupabase() {
  if (!supabase || !currentUser) {
    items = [];
    renderGallery();
    updateEmptyState();
    return;
  }

  const { data: rows, error } = await supabase
    .from("media_items")
    .select("id, path, type, name, size, created_at")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load media_items", error);
    items = [];
    renderGallery();
    updateEmptyState();
    return;
  }

  const baseItems = (rows || []).map((row) => ({
    id: row.id,
    path: row.path,
    type: row.type,
    name: row.name,
    size: row.size,
    url: "",
  }));

  // Create signed URLs (works even if bucket is private)
  const refreshed = await Promise.all(baseItems.map(refreshSignedUrlForItem));
  items = refreshed.filter((it) => Boolean(it.url));

  renderGallery();
  updateEmptyState();
}

function updateEmptyState() {
  if (!items.length) {
    emptyStateEl.style.display = "block";
    galleryEl.style.display = "none";
  } else {
    emptyStateEl.style.display = "none";
    galleryEl.style.display = "";
  }
}

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(1)} ${units[i]}`;
}

function renderGallery() {
  galleryEl.innerHTML = "";

  items.forEach((item) => {
    const entry = document.createElement("article");
    entry.className = "entry";

    const mediaWrap = document.createElement("div");
    mediaWrap.className = "entry-media";

    let media;
    if (item.type === "image") {
      media = document.createElement("img");
      media.src = item.url;
      media.alt = item.name || "Image";
    } else {
      media = document.createElement("video");
      media.src = item.url;
      media.controls = true;
      media.loop = true;
      if (autoplayToggle.checked) {
        media.autoplay = true;
        media.muted = true;
      }
    }

    mediaWrap.appendChild(media);

    const meta = document.createElement("div");
    meta.className = "entry-meta";

    const badge = document.createElement("span");
    badge.className = "entry-badge";
    badge.textContent = item.type === "image" ? "Illuminated Page" : "Moving Tapestry";

    const size = document.createElement("span");
    size.textContent = `${formatBytes(item.size)} • ${item.name || ""}`;

    meta.appendChild(badge);
    meta.appendChild(size);

    const actions = document.createElement("div");
    actions.className = "entry-actions";

    const openBtn = document.createElement("button");
    openBtn.className = "entry-action-btn";
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", () => {
      window.open(item.url, "_blank");
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "entry-action-btn danger";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => {
      removeItem(item.id);
    });

    actions.appendChild(openBtn);
    actions.appendChild(removeBtn);

    entry.appendChild(mediaWrap);
    entry.appendChild(meta);
    entry.appendChild(actions);

    galleryEl.appendChild(entry);
  });
}

async function removeItem(id) {
  const index = items.findIndex((entry) => entry.id === id);
  if (index === -1) return;

  const item = items[index];
  if (item.url) {
    URL.revokeObjectURL(item.url);
  }

  items.splice(index, 1);
  renderGallery();
  updateEmptyState();

  if (!supabase || !currentUser) return;

  // Delete metadata row and storage object
  try {
    if (item.path) {
      await supabase.storage.from(MEDIA_BUCKET).remove([item.path]);
    }
    await supabase
      .from("media_items")
      .delete()
      .eq("id", id)
      .eq("user_id", currentUser.id);
  } catch (e) {
    console.error("Failed to delete item", e);
  }
}

// ----- Supabase auth (multi-device accounts) -----
function renderAccountStatus() {
  // Keep the existing DOM structure; just update the text.
  const name = currentUser?.email || "Guest";
  accountNameEl.textContent = name;
  accountStatusEl.innerHTML = `Signed in as <span id="account-name">${name}</span>`;
}

async function initAuth() {
  if (!supabase) {
    console.warn("Supabase client not loaded.");
    renderAccountStatus();
    setUploadEnabled(false);
    return;
  }

  const { data } = await supabase.auth.getSession();
  currentUser = data?.session?.user ?? null;
  renderAccountStatus();
  setUploadEnabled(Boolean(currentUser));
  await loadItemsFromSupabase();

  supabase.auth.onAuthStateChange(async (_event, session) => {
    currentUser = session?.user ?? null;
    renderAccountStatus();
    setUploadEnabled(Boolean(currentUser));
    await loadItemsFromSupabase();
  });
}

btnSignup.addEventListener("click", async () => {
  if (!supabase) return alert("Supabase not loaded.");
  const email = accountEmailInput.value.trim();
  const password = accountPasswordInput.value;
  if (!email || !password) return alert("Please enter both email and password.");

  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return alert(error.message);

  accountPasswordInput.value = "";
  alert("Account created. If email confirmation is enabled, check your email.");
});

btnSignin.addEventListener("click", async () => {
  if (!supabase) return alert("Supabase not loaded.");
  const email = accountEmailInput.value.trim();
  const password = accountPasswordInput.value;
  if (!email || !password) return alert("Please enter both email and password.");

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);
  accountPasswordInput.value = "";
});

btnSignout.addEventListener("click", async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
});

fileInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  if (!supabase || !currentUser) {
    alert("Please sign in first.");
    fileInput.value = "";
    return;
  }

  const uploadAll = async () => {
    for (const file of files) {
      const type = file.type.startsWith("image") ? "image" : "video";
      const safeName = sanitizeFilename(file.name);
      const path = `${currentUser.id}/${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(path, file, { upsert: false });

      if (uploadError) {
        console.error(uploadError);
        alert(`Upload failed: ${uploadError.message}`);
        continue;
      }

      const { data: inserted, error: insertError } = await supabase
        .from("media_items")
        .insert({
          user_id: currentUser.id,
          path,
          type,
          name: file.name,
          size: file.size,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(insertError);
        alert(`Database save failed: ${insertError.message}`);
        continue;
      }

      const signed = await refreshSignedUrlForItem({
        id: inserted?.id,
        path,
        type,
        name: file.name,
        size: file.size,
        url: "",
      });

      items.unshift(signed);
      renderGallery();
      updateEmptyState();
    }
  };

  uploadAll().catch((e) => console.error(e));

  fileInput.value = "";
});

layoutGridBtn.addEventListener("click", () => {
  layoutGridBtn.classList.add("gallery-btn-active");
  layoutListBtn.classList.remove("gallery-btn-active");
  galleryEl.classList.remove("gallery-list");
  galleryEl.classList.add("gallery-grid");
});

layoutListBtn.addEventListener("click", () => {
  layoutListBtn.classList.add("gallery-btn-active");
  layoutGridBtn.classList.remove("gallery-btn-active");
  galleryEl.classList.remove("gallery-grid");
  galleryEl.classList.add("gallery-list");
});

clearGalleryBtn.addEventListener("click", () => {
  if (!items.length) return;
  const sure = window.confirm("Clear all items from this page?");
  if (!sure) return;

  if (!supabase || !currentUser) return;

  const doClear = async () => {
    const paths = items.map((it) => it.path).filter(Boolean);
    const ids = items.map((it) => it.id).filter(Boolean);

    items.forEach((item) => item.url && URL.revokeObjectURL(item.url));
    items = [];
    renderGallery();
    updateEmptyState();

    if (paths.length) {
      await supabase.storage.from(MEDIA_BUCKET).remove(paths);
    }
    if (ids.length) {
      await supabase
        .from("media_items")
        .delete()
        .in("id", ids)
        .eq("user_id", currentUser.id);
    }
  };

  doClear().catch((e) => console.error(e));
});

autoplayToggle.addEventListener("change", () => {
  const videos = galleryEl.querySelectorAll("video");
  videos.forEach((video) => {
    video.autoplay = autoplayToggle.checked;
    video.muted = autoplayToggle.checked;
    if (autoplayToggle.checked) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  });
});

// Initialize auth + load from Supabase on first visit
renderAccountStatus();
setUploadEnabled(false);
initAuth();

// Be polite and clean up object URLs when leaving
window.addEventListener("beforeunload", () => {
  items.forEach((item) => {
    if (item.url) URL.revokeObjectURL(item.url);
  });
});
