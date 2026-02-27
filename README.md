# Medieval Gallery

A small, single‑page medieval‑style gallery where you can upload photos and videos and have them saved locally in your browser using IndexedDB.

## Features

- **Old‑book design**: Beige parchment background, medieval fonts, framed panels.
- **Photo & video uploads**: Add multiple images (JPG, PNG, GIF) and videos (MP4, WEBM).
- **Persistent gallery**: Items are stored in your browser (IndexedDB) so they reappear when you reopen the page on the same device and browser.
- **Local accounts**: Create simple per‑browser accounts (email + password) so each user sees their own gallery on the same machine.
- **Grid / List layouts**: Switch between compact grid and vertical list.
- **Video autoplay toggle**: Turn autoplay on/off for all videos.
- **Safe & local**: Files never leave your device; only your browser stores them.

## Running locally

Just open `index.html` in any modern browser (Chrome, Edge, Firefox).

## Initialize git and push to GitHub

Run these commands **in PowerShell** from the `MY Project` folder:

```powershell
cd "c:\Users\islam\Documents\MY Project"

git init
git add .
git commit -m "Initial medieval gallery"
```

Create a new empty repository on GitHub (no README), then copy its **HTTPS** URL and run:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## Connecting a real database (example with Supabase)

Right now, saving can be **cloud-backed** using Supabase so it works across devices.  
To modernize this into a cloud‑backed app with real accounts and shared galleries, you can connect it to a database such as **Supabase** (PostgreSQL + Auth + Storage).

### 1. Create a Supabase project

1. Go to `https://supabase.com` and sign up.
2. Create a new project.
3. Note your:
   - **Project URL**
   - **Anon public key** (safe to use in the browser)

For your project, the URL looks like:

- `https://iuiioazmtynjouynpias.supabase.co`

### 2. Create a table for media metadata

In the Supabase SQL editor, run something like:

```sql
create table media_items (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  path text not null,
  type text not null, -- 'image' or 'video'
  name text,
  size bigint,
  created_at timestamp with time zone default now()
);
```

Enable **Row Level Security (RLS)** and add a policy like:

```sql
alter table media_items enable row level security;

create policy "Users can manage their own items"
on media_items
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
```

### 3. Create a storage bucket for files

1. In Supabase, go to **Storage → Buckets**.
2. Create a bucket, for example `media`.
3. Allow authenticated users to read/write (`media` bucket) via policies.

### 4. Load the Supabase client in `index.html`

Add before the closing `</body>` tag, **above** `script.js`:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="script.js"></script>
```

### 5. Initialize Supabase in `script.js`

Near the top of `script.js`, after the DOM element lookups, you can add:

```js
const SUPABASE_URL = "https://YOUR_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

Then:

- Use `supabase.auth.signUp` / `signInWithPassword` instead of local accounts.
- On upload, use `supabase.storage.from("media").upload(...)` to upload the file, then
  save a row into `media_items` with the returned path.
- On load, query `media_items` for the current user and build public URLs with
  `supabase.storage.from("media").getPublicUrl(path).data.publicUrl`.

This turns the gallery into a **multi‑device, real account** system. The existing code gives you a starting point for the UI and saving logic; you only need to swap out the local IndexedDB calls with Supabase calls following the above steps.

## Simple file-based accounts with a `databases` folder (Node.js)

If you prefer a very simple setup that writes to a folder called `databases` on a server you control, you can use the included **Node.js backend**.

### 1. Install Node dependencies

In PowerShell, from the project folder:

```powershell
cd "c:\Users\islam\Documents\MY Project"
npm install
```

This uses `package.json` to install `express`, `cors`, and `bcryptjs`.

### 2. File-based "database" layout

- Folder: `databases/`
  - File: `users.json` – stores users as JSON:

```json
[
  {
    "id": "random-id",
    "email": "user@example.com",
    "passwordHash": "...",
    "tokens": ["session-token"],
    "createdAt": "2026-02-26T00:00:00.000Z"
  }
]
```

You never edit this file by hand; the server updates it.

### 3. Start the backend server

```powershell
cd "c:\Users\islam\Documents\MY Project"
npm start
```

This runs `server.js` and exposes endpoints on `http://localhost:4000`:

- `POST /api/signup` – body: `{ "email": "user@example.com", "password": "secret" }`
  - Creates a new user, writes it into `databases/users.json`, and returns `{ id, email, token }`.
- `POST /api/login` – same body, returns `{ id, email, token }` if correct.
- `GET /api/check` – with header `Authorization: Bearer <token>`, returns `{ id, email }` if the token is valid.

You can later deploy this Node server to a VPS or hosting provider; your static site (on GitHub Pages or elsewhere) would talk to it via `fetch` calls to these endpoints. That way, **accounts and passwords live in the server's `databases` folder**, not in the browser, and can be shared across devices and networks.


## Deploy with GitHub Pages

1. On GitHub, open your repository.
2. Go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/** (root), then save.
5. After a minute, GitHub will show your site URL, something like:
   `https://YOUR_USERNAME.github.io/YOUR_REPO/`

Your medieval gallery will then be available at that URL. Remember: uploads are still stored only per browser/device, even when served from GitHub Pages.

