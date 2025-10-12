Happy Box Cakeshop — Static Website

Overview

- Simple, mobile-friendly static site for a cakeshop.
- Pure HTML + CSS + SVG assets. No build step.
- Suitable for Cloudflare Pages or any static host.

Files

- `index.html` — Single-page site with sections: Hero, Menu, About, Visit, Contact
- `styles.css` — Styling and responsive layout
- `assets/` — SVG icons/illustrations and favicon

Quick Preview

- Open `index.html` in a browser.

Cloudflare Pages Deploy

- Project type: `Direct Upload` or connect a repo
- Build command: (leave empty)
- Output directory: `/` (project root)
- If uploading a ZIP, include all files/folders from this directory (keep structure).

Enable Facebook Photos Carousel (optional)

- This site includes a carousel that can show your latest Facebook photos.
- It uses a Cloudflare Pages Function at `functions/api/facebook/photos.js`.
- Requires two environment variables set in Cloudflare Pages:
  - `FB_PAGE_ID` — your Facebook Page ID (numeric). You can find it in Page settings or via the Graph API Explorer.
  - `FB_GRAPH_TOKEN` — a Page access token with permissions to read the page’s content (manage_pages/read_insights or equivalent).

How to set secrets in Cloudflare Pages

- In your Pages project, go to Settings → Environment variables.
- Add `FB_PAGE_ID` and `FB_GRAPH_TOKEN` to Production (and Preview if needed).
- Redeploy. The endpoint `/api/facebook/photos?limit=12` returns recent photo objects used by the carousel.

Fallback behavior

- If variables aren’t set or the Graph API fails, the carousel quietly keeps a fallback link to the Facebook page.

Local development

- Opening `index.html` directly (file://) will make requests to `file:///api/...`, which fails. Run a local server with Cloudflare Wrangler so the Pages Function is available.

Steps

1) Install Wrangler (Node.js required):
   - `npm i -g wrangler`
2) Add a `.dev.vars` file (not committed) with:
   - `FB_PAGE_ID=YOUR_NUMERIC_ID`
   - `FB_GRAPH_TOKEN=YOUR_PAGE_ACCESS_TOKEN`
3) Start dev server:
   - `wrangler pages dev .`

The site will be served at `http://127.0.0.1:8788` with the API at `/api/facebook/photos`.

Tip

- While viewing from file://, the carousel script automatically calls `http://127.0.0.1:8788/api/...`. You can override the base with `window.FB_API_BASE = 'https://your-pages-domain.pages.dev';` before `app.js` loads if you want to test against a deployed instance.

Customization

- Branding: Update name, colors, and text in `index.html` and `styles.css`.
- Contact details: Replace email/phone/WhatsApp placeholders in the Contact section.
- Address & hours: Update in the About/Visit sections.
- Menu: Edit the cards in the Menu section to match your offerings; swap images in `assets/` if desired.

Notes

- Images are lightweight SVGs to keep the site fast.
- Add your own real photos by replacing the SVGs or adding `<img>` URLs.
