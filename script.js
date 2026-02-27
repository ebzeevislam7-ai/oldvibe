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

// Local account state (per-browser only)
let accounts = {};
let currentUserId = null;

// Simple IndexedDB setup so your pages (photos/videos) are remembered
const DB_NAME = "medievalGallery";
const DB_VERSION = 1;
const STORE_NAME = "items";

let items = [];
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      console.warn("IndexedDB not supported; gallery will not persist.");
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.error("Failed to open IndexedDB", request.error);
      resolve(null);
    };
  });

  return dbPromise;
}

function saveItemToDb(file, type) {
  return openDb().then((db) => {
    if (!db) {
      const url = URL.createObjectURL(file);
      return {
        id: Math.random().toString(36).slice(2),
        url,
        type,
        name: file.name,
        size: file.size,
      };
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const record = {
        type,
        name: file.name,
        size: file.size,
        createdAt: Date.now(),
        blob: file,
        userId: currentUserId || "guest",
      };

      const req = store.add(record);
      req.onsuccess = () => {
        const id = req.result;
        const url = URL.createObjectURL(file);
        resolve({
          id,
          url,
          type,
          name: file.name,
          size: file.size,
        });
      };
      req.onerror = () => reject(req.error || new Error("Failed to save item"));
    });
  });
}

function loadItemsFromDb() {
  return openDb().then((db) => {
    if (!db) {
      updateEmptyState();
      return;
    }

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const activeUserId = currentUserId || "guest";
        const records = (req.result || []).filter((record) => {
          const recordUser = record.userId || "guest";
          return recordUser === activeUserId;
        });

        const loadedItems = records.map((record) => {
          const url = URL.createObjectURL(record.blob);
          return {
            id: record.id,
            url,
            type: record.type,
            name: record.name,
            size: record.size,
          };
        });
        items = loadedItems;
        renderGallery();
        updateEmptyState();
        resolve();
      };

      req.onerror = () => {
        console.error("Failed to load items from IndexedDB", req.error);
        updateEmptyState();
        resolve();
      };
    });
  });
}

function deleteItemFromDb(id) {
  return openDb().then((db) => {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
  });
}

function clearDbForCurrentUser() {
  return openDb().then((db) => {
    if (!db) return;
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const activeUserId = currentUserId || "guest";

    const req = store.openCursor();
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        const recordUser = cursor.value.userId || "guest";
        if (recordUser === activeUserId) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  });
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

function removeItem(id) {
  const index = items.findIndex((entry) => entry.id === id);
  if (index === -1) return;

  const item = items[index];
  if (item.url) {
    URL.revokeObjectURL(item.url);
  }

  items.splice(index, 1);
  deleteItemFromDb(id);
  renderGallery();
  updateEmptyState();
}

// ----- Local account management (per-browser only) -----

function loadAccountState() {
  try {
    const raw = localStorage.getItem("mg_accounts");
    if (raw) {
      accounts = JSON.parse(raw);
    }
  } catch (e) {
    accounts = {};
  }

  currentUserId = localStorage.getItem("mg_currentUserId") || "guest";
  if (!accounts["guest"]) {
    accounts["guest"] = { email: "Guest", password: null };
  }

  updateAccountUI();
}

function saveAccountState() {
  try {
    localStorage.setItem("mg_accounts", JSON.stringify(accounts));
    if (currentUserId) {
      localStorage.setItem("mg_currentUserId", currentUserId);
    } else {
      localStorage.removeItem("mg_currentUserId");
    }
  } catch (e) {
    console.warn("Unable to persist account state", e);
  }
}

function updateAccountUI() {
  const account = accounts[currentUserId] || accounts["guest"];
  accountNameEl.textContent = account?.email || "Guest";

  if (currentUserId === "guest") {
    accountStatusEl.textContent = "Browsing as ";
    const span = document.createElement("span");
    span.id = "account-name";
    span.textContent = "Guest";
    accountStatusEl.appendChild(span);
  } else {
    accountStatusEl.textContent = "Signed in as ";
    const span = document.createElement("span");
    span.id = "account-name";
    span.textContent = account.email;
    accountStatusEl.appendChild(span);
  }
}

function getAccountKey(email) {
  return email.trim().toLowerCase();
}

btnSignup.addEventListener("click", () => {
  const email = accountEmailInput.value.trim();
  const password = accountPasswordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  const key = getAccountKey(email);
  if (accounts[key]) {
    alert("An account with this email already exists. Use Sign in instead.");
    return;
  }

  accounts[key] = { email, password };
  currentUserId = key;
  saveAccountState();
  updateAccountUI();

  // When switching accounts, reload that account's items
  items.forEach((item) => item.url && URL.revokeObjectURL(item.url));
  items = [];
  loadItemsFromDb();
  updateEmptyState();

  accountPasswordInput.value = "";
});

btnSignin.addEventListener("click", () => {
  const email = accountEmailInput.value.trim();
  const password = accountPasswordInput.value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  const key = getAccountKey(email);
  const account = accounts[key];
  if (!account || account.password !== password) {
    alert("Account not found or password is incorrect.");
    return;
  }

  currentUserId = key;
  saveAccountState();
  updateAccountUI();

  items.forEach((item) => item.url && URL.revokeObjectURL(item.url));
  items = [];
  loadItemsFromDb();
  updateEmptyState();

  accountPasswordInput.value = "";
});

btnSignout.addEventListener("click", () => {
  currentUserId = "guest";
  saveAccountState();
  updateAccountUI();

  items.forEach((item) => item.url && URL.revokeObjectURL(item.url));
  items = [];
  loadItemsFromDb();
  updateEmptyState();
});

fileInput.addEventListener("change", (event) => {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  const savePromises = files.map((file) => {
    const type = file.type.startsWith("image") ? "image" : "video";
    return saveItemToDb(file, type);
  });

  Promise.all(savePromises)
    .then((savedItems) => {
      items = items.concat(savedItems);
      renderGallery();
      updateEmptyState();
    })
    .catch((err) => {
      console.error("Error saving items", err);
    });

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

  items.forEach((item) => URL.revokeObjectURL(item.url));
  items = [];
  clearDbForCurrentUser();
  renderGallery();
  updateEmptyState();
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

// Load account + items on first visit
loadAccountState();
loadItemsFromDb();

// Be polite and clean up object URLs when leaving
window.addEventListener("beforeunload", () => {
  items.forEach((item) => {
    if (item.url) URL.revokeObjectURL(item.url);
  });
});
