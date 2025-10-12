const GRAPH_VERSION = 'v24.0';

export async function onRequest({ request, env }) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 10), 1), 25);

    const PAGE_ID = 454679978049245;
    const TOKEN = 'EAAL9ZCnS1ZAt0BPktZBDrdue77LziQmrpoL7BZCw6L4Dk8o43W63k26HxAjxmC2zZCpKe5izNWGZACBZCzMjSCrh3OKJNw03a6G9oxtZA7xFkZBpzQlMyZAz2ZBFBXqYLS9jLG1Tbx2ZCgjB8QkaVrRqWOQ5ThftV4Y0dbsM6gVC4h9fE9EtzZAptzTy7WmEB4Wvfeb39xsVmERZAZBDss1gjNJM1i4hjEnZAWKZAy4jUZBwZDZD';

    const baseHeaders = {
      'content-type': 'application/json; charset=UTF-8',
      'access-control-allow-origin': '*',
    };

    if (!PAGE_ID || !TOKEN) {
      return new Response(JSON.stringify({ error: 'Missing FB_PAGE_ID or FB_GRAPH_TOKEN' }), {
        status: 500,
        headers: baseHeaders,
      });
    }

    // Helper to call Graph API with token as query param (widely supported) and header as backup
    const graphFetch = async (pathWithQuery) => {
      const sep = pathWithQuery.includes('?') ? '&' : '?';
      const full = `https://graph.facebook.com/${GRAPH_VERSION}/${pathWithQuery}${sep}access_token=${encodeURIComponent(TOKEN)}`;
      const res = await fetch(full, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { parse_error: true, raw: text }; }
      return { ok: res.ok, status: res.status, json };
    };

    // 1) Try uploaded photos (highest chance for clean images array)
    const photoFields = ['images', 'source', 'permalink_url', 'created_time'].join(',');
    let r = await graphFetch(`${encodeURIComponent(PAGE_ID)}/photos?type=uploaded&fields=${photoFields}&limit=${limit}`);

    let items = [];
    if (r.ok && r.json && Array.isArray(r.json.data)) {
      items = r.json.data.map((p) => {
        const imgs = Array.isArray(p.images) ? p.images : [];
        const best = imgs.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
        const src = (best && best.source) || p.source;
        if (!src) return undefined;
        return {
          src,
          permalink: p.permalink_url,
          created_time: p.created_time,
          alt: 'Facebook photo',
        };
      }).filter(Boolean);
    }

    // Helper to limit output size
    const take = (arr, n) => arr.slice(0, n);

    // 2) Fallback: recent posts that contain images
    if ((!items || items.length === 0)) {
      const postFields = ['full_picture', 'permalink_url', 'created_time'].join(',');
      r = await graphFetch(`${encodeURIComponent(PAGE_ID)}/posts?fields=${postFields}&limit=${limit}`);
      if (r.ok && r.json && Array.isArray(r.json.data)) {
        items = take(r.json.data
          .filter((p) => !!p.full_picture)
          .map((p) => ({
            src: p.full_picture,
            permalink: p.permalink_url,
            created_time: p.created_time,
            alt: 'Facebook post image',
          })), limit);
      }
    }

    // 3) Fallback: posts attachments (covers albums/multiple images)
    if ((!items || items.length === 0)) {
      const attachFields = ['attachments{media_type,media,subattachments}', 'permalink_url', 'created_time'].join(',');
      r = await graphFetch(`${encodeURIComponent(PAGE_ID)}/posts?fields=${attachFields}&limit=${limit}`);
      if (r.ok && r.json && Array.isArray(r.json.data)) {
        const out = [];
        for (const p of r.json.data) {
          const atts = p.attachments && p.attachments.data ? p.attachments.data : [];
          for (const a of atts) {
            const pushMedia = (m) => {
              const src = m?.image?.src || m?.source;
              if (src) out.push({ src, permalink: p.permalink_url, created_time: p.created_time, alt: 'Facebook attachment image' });
            };
            if (a.media) pushMedia(a.media);
            const subs = a.subattachments && a.subattachments.data ? a.subattachments.data : [];
            for (const s of subs) if (s.media) pushMedia(s.media);
            if (out.length >= limit) break;
          }
          if (out.length >= limit) break;
        }
        items = take(out, limit);
      }
    }

    // If still empty, return 200 with an empty array to avoid Cloudflare 502 splash
    if (!items || items.length === 0) {
      return new Response(JSON.stringify([]), { headers: { ...baseHeaders, 'cache-control': 'no-store' } });
    }

    return new Response(JSON.stringify(items), {
      headers: {
        ...baseHeaders,
        'cache-control': 'public, s-maxage=300, max-age=60',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=UTF-8', 'access-control-allow-origin': '*' },
    });
  }
}
