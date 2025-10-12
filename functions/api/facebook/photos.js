export async function onRequest({ request, env }) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 10), 1), 25);

    const PAGE_ID = 454679978049245;
    const TOKEN = 'EAAL9ZCnS1ZAt0BPnrD24SqHMtEQ5gtzXmqE0vWQEQZCd0XEXpsRNhe0nU98aVLw1KQLoVOeYZA7N7abuYPclUrfDXceO5kZCL9uFsZClVttSCe8gCdOwZBzUGS6HH3ViEknoXI4VMiJ1vJ6uAm2mmSaEZCXCft982DSXpFjkaIxXQSMp7PJ4ekhIy50JzLyvIwVbvvSvtsyegZC3QADCMZAjIwxRoZCj7DpuH6QjgZDZD';

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
      const full = `https://graph.facebook.com/v20.0/${pathWithQuery}${sep}access_token=${encodeURIComponent(TOKEN)}`;
      const res = await fetch(full, { headers: { Authorization: `Bearer ${TOKEN}` } });
      const text = await res.text();
      let json;
      try { json = JSON.parse(text); } catch { json = { parse_error: true, raw: text }; }
      return { ok: res.ok, status: res.status, json };
    };

    // 1) Try uploaded photos (highest chance for clean images array)
    const photoFields = ['images', 'permalink_url', 'created_time'].join(',');
    let r = await graphFetch(`${encodeURIComponent(PAGE_ID)}/photos?type=uploaded&fields=${photoFields}&limit=${limit}`);

    let items = [];
    if (r.ok && r.json && Array.isArray(r.json.data)) {
      items = r.json.data.map((p) => {
        const imgs = Array.isArray(p.images) ? p.images : [];
        const best = imgs.sort((a, b) => (b.width || 0) - (a.width || 0))[0];
        return best ? {
          src: best.source,
          permalink: p.permalink_url,
          created_time: p.created_time,
          alt: 'Facebook photo',
        } : undefined;
      }).filter(Boolean);
    }

    // 2) Fallback: recent posts that contain images
    if ((!items || items.length === 0)) {
      const postFields = ['full_picture', 'permalink_url', 'created_time'].join(',');
      r = await graphFetch(`${encodeURIComponent(PAGE_ID)}/posts?fields=${postFields}&limit=${limit}`);
      if (r.ok && r.json && Array.isArray(r.json.data)) {
        items = r.json.data
          .filter((p) => !!p.full_picture)
          .map((p) => ({
            src: p.full_picture,
            permalink: p.permalink_url,
            created_time: p.created_time,
            alt: 'Facebook post image',
          }));
      }
    }

    if (!items || items.length === 0) {
      return new Response(JSON.stringify({ error: 'No images returned from Graph API', details: r.json }), {
        status: 502,
        headers: baseHeaders,
      });
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
