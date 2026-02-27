# Medieval Gallery

A small, single‑page medieval‑style gallery where you can upload photos and videos and have them saved locally in your browser using IndexedDB.

## Features

- **Old‑book design**: Beige parchment background, medieval fonts, framed panels.
- **Photo & video uploads**: Add multiple images (JPG, PNG, GIF) and videos (MP4, WEBM).
- **Persistent gallery**: Items are stored in your browser (IndexedDB) so they reappear when you reopen the page on the same device and browser.
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

## Deploy with GitHub Pages

1. On GitHub, open your repository.
2. Go to **Settings → Pages**.
3. Under **Source**, choose **Deploy from a branch**.
4. Select branch **main** and folder **/** (root), then save.
5. After a minute, GitHub will show your site URL, something like:
   `https://YOUR_USERNAME.github.io/YOUR_REPO/`

Your medieval gallery will then be available at that URL. Remember: uploads are still stored only per browser/device, even when served from GitHub Pages.

