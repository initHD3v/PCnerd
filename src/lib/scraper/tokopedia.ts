export type ScrapeResult = {
  name: string | null;
  price: number;
  link: string | undefined;
} | null;

const TOKOPEDIA_GQL = 'https://gql.tokopedia.com/graphql';
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const BASE_HEADERS: Record<string, string> = {
  'User-Agent': USER_AGENT,
  Accept: '*/*',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
  'Content-Type': 'application/json',
  Origin: 'https://www.tokopedia.com',
  Referer: 'https://www.tokopedia.com/',
  'X-Source': 'tokopedia-lite',
  'X-Version': '1.0',
};

const MAX_ATTEMPTS = 3;
const BASE_BACKOFF_MS = 300;

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function fetchWithRetry(url: string, init: RequestInit, label: string): Promise<Response | null> {
  let lastError: Error | null = null;
  let retryAfter: string | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const seconds = Number(retryAfter);
      const wait =
        Number.isFinite(seconds) && seconds > 0 && seconds <= 10
          ? seconds * 1000
          : BASE_BACKOFF_MS * 2 ** attempt + Math.floor(Math.random() * 100);
      await new Promise((r) => setTimeout(r, wait));
    }

    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      retryAfter = null;
      continue;
    }

    if (res.ok) return res;

    if (isRetryableStatus(res.status) && attempt < MAX_ATTEMPTS - 1) {
      retryAfter = res.headers.get('retry-after');
      continue;
    }
    return null;
  }
  throw lastError ?? new Error(`Failed calling ${label}`);
}

interface SearchProduct {
  id: string;
  name: string;
  url: string;
  price: {
    text: string;
    number: number;
    original: number;
    discountPercentage: number;
  };
  rating: number;
  shop: {
    name: string;
    tier: number;
    city: string;
  } | null;
}

// Byte-matched against Tokopedia's registered `SearchProductV5Query` operation.
// Shared with bintangtimurlangit/tokopedia-mcp; verified working 12 Aug 2026.
const SEARCH_QUERY = `
query SearchProductV5Query($params: String!) {
  searchProductV5(params: $params) {
    header {
      totalData
      responseCode
      keywordProcess
      keywordIntention
      additionalParams
    }
    data {
      totalDataText
      related {
        relatedKeyword
        position
      }
      suggestion {
        currentKeyword
        suggestion
        query
        text
      }
      products {
        oldID: id
        id: id_str_auto_
        name
        url
        applink
        mediaURL {
          image
          image300
        }
        shop {
          oldID: id
          id: id_str_auto_
          name
          url
          city
          tier
        }
        badge {
          oldID: id
          id: id_str_auto_
          title
          url
        }
        price {
          text
          number
          range
          original
          discountPercentage
        }
        freeShipping {
          url
        }
        labelGroups {
          position
          title
          type
          url
        }
        labelGroupsVariant {
          title
          type
          typeVariant
          hexColor
        }
        category {
          oldID: id
          id: id_str_auto_
          name
          breadcrumb
        }
        rating
        wishlist
        meta {
          oldParentID: parentID
          parentID: parentID_str_auto_
          oldWarehouseID: warehouseID
          warehouseID: warehouseID_str_auto_
          isImageBlurred
          isPortrait
        }
      }
    }
  }
}
`;

function buildSearchParams(query: string, rows = 20): string {
  return new URLSearchParams({
    device: 'desktop',
    enter_method: 'normal_search',
    l_name: 'sre',
    navsource: '',
    ob: '23',
    page: '1',
    q: query,
    related: 'true',
    rows: String(rows),
    safe_search: 'false',
    scheme: 'https',
    show_adult: 'false',
    source: 'search',
    srp_component_id: '02.01.00.00',
    st: 'product',
    start: '0',
    topads_bucket: 'true',
    unique_id: Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
    variants: '',
  }).toString();
}

interface SearchResponse {
  data?: {
    searchProductV5?: {
      data?: {
        products?: SearchProduct[];
      };
    };
  };
  errors?: Array<{ message: string }>;
}

function mapProduct(raw: any): SearchProduct {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    url: String(raw.url ?? '').split('?')[0],
    price: {
      text: String(raw.price?.text ?? ''),
      number: Number(raw.price?.number ?? 0),
      original: Number(raw.price?.original ?? 0),
      discountPercentage: Number(raw.price?.discountPercentage ?? 0),
    },
    rating: Number(raw.rating ?? 0),
    shop: raw.shop
      ? {
          name: String(raw.shop.name ?? ''),
          tier: Number(raw.shop.tier ?? 0),
          city: String(raw.shop.city ?? ''),
        }
      : null,
  };
}

async function searchTokopedia(query: string, rows = 20): Promise<SearchProduct[]> {
  if (!query.trim()) return [];
  const operationName = 'SearchProductV5Query';
  try {
    const res = await fetchWithRetry(
      `${TOKOPEDIA_GQL}/${operationName}`,
      {
        method: 'POST',
        headers: BASE_HEADERS,
        body: JSON.stringify({
          operationName,
          query: SEARCH_QUERY,
          variables: { params: buildSearchParams(query, rows) },
        }),
      },
      operationName,
    );
    if (!res) return [];
    const json = (await res.json().catch(() => null)) as SearchResponse | null;
    if (!json || json.errors?.length) return [];
    return (json.data?.searchProductV5?.data?.products ?? []).map(mapProduct);
  } catch {
    return [];
  }
}

const KNOWN_BRANDS = [
  'ASUS',
  'MSI',
  'Gigabyte',
  'ASRock',
  'Colorful',
  'Galax',
  'Zotac',
  'Sapphire',
  'PowerColor',
  'Palit',
  'EVGA',
  'AMD',
  'Intel',
  'Nvidia',
  'Corsair',
  'Kingston',
  'Samsung',
  'Sandisk',
  'WD',
  'Seagate',
  'Adata',
  'Lexar',
  'TeamGroup',
  'G.Skill',
  'Crucial',
  'XPG',
  'Noctua',
  'Cooler Master',
  'NZXT',
  'DeepCool',
  'Thermalright',
  'Arctic',
  'Lian Li',
  'Fractal',
  'Antec',
  'Montech',
  'Seasonic',
  'be quiet',
  'HyperX',
  'Razer',
  'Logitech',
  'SteelSeries',
  'AOC',
  'LG',
  'ViewSonic',
  'BenQ',
  'KTC',
  'Dell',
  'Philips',
  'Eksms',
  'Realme',
  'Geekom',
  'Visiono',
  'GLORIOUS',
];

function scoreCandidate(p: SearchProduct, query: string): number {
  const q = query.toLowerCase().trim();
  const name = (p.name ?? '').toLowerCase();
  if (!q || !name) return -Infinity;
  if (!Number.isFinite(p.price.number) || p.price.number <= 0) return -Infinity;

  const tokens = q.split(/\s+/).filter(Boolean);
  const first = tokens[0] ?? '';
  let score = 0;

  if (first) {
    const brandHit = KNOWN_BRANDS.find((b) => b.toLowerCase() === first);
    if (brandHit) {
      if (!name.includes(brandHit.toLowerCase())) return -Infinity;
      score += 25;
    } else if (first.length >= 3 && !name.includes(first)) {
      // Model-number first-token (e.g. "B850M", "Ryzen") must appear.
      return -Infinity;
    }
  }

  for (const tok of tokens) {
    if (tok.length < 2) continue;
    if (name.includes(tok)) score += Math.min(tok.length, 8);
  }

  // Prebuilt bundles / "rakitan" listings mix many components and rarely
  // represent the standalone part's price — penalize them hard.
  const bundleMarkers: RegExp[] = [
    /\bpc\b/i,
    /\bpc gaming\b/i,
    /\brakitan\b/i,
    /\bbundle\b/i,
    /\bfullset\b/i,
    /\blengkap\b/i,
    /\bset\b/i,
    /\brig\b/i,
    /\bdesktop\b/i,
  ];
  if (bundleMarkers.some((re) => re.test(name))) score -= 30;

  // Prefer names whose length is close to the query (keeps bundled PCs and
  // multi-item listings from winning on keyword overlap alone).
  score -= Math.min(30, Math.abs(name.length - q.length) * 0.3);

  if (p.shop?.tier === 2)
    score += 15; // Official store
  else if (p.shop?.tier === 3) score += 8; // Power Merchant

  return score;
}

function pickBest(products: SearchProduct[], query: string): SearchProduct | null {
  let best: SearchProduct | null = null;
  let bestScore = -Infinity;
  for (const p of products) {
    const s = scoreCandidate(p, query);
    if (s > bestScore) {
      best = p;
      bestScore = s;
    }
  }
  return bestScore >= 18 && best ? best : null;
}

function metaContent(html: string, key: string): string | undefined {
  const escapedKey = key.replace(/[:]/g, '\\:');
  const m1 = html.match(new RegExp(`<meta[^>]+(?:property|name)="${escapedKey}"[^>]+content="([^"]*)"`, 'i'));
  if (m1) return m1[1];
  const m2 = html.match(new RegExp(`<meta[^>]+content="([^"]*)"[^>]+(?:property|name)="${escapedKey}"`, 'i'));
  return m2 ? m2[1] : undefined;
}

/**
 * PDP fallback: fetch the product page and read the real price from
 * `product:price:amount` meta (plus og:title for a canonical name). More
 * stable than trusting only the search payload when Tokopedia re-ranks or
 * entry loses its campaign price.
 */
async function fetchFromPdp(url: string): Promise<ScrapeResult> {
  if (!/^https:\/\/www\.tokopedia\.com\//.test(url)) return null;
  try {
    const res = await fetchWithRetry(
      url,
      {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      },
      'productPage',
    );
    if (!res) return null;
    const html = await res.text();
    const price = Number(metaContent(html, 'product:price:amount'));
    const name = metaContent(html, 'og:title');
    if (!Number.isFinite(price) || price <= 0) return null;
    return { name: name || null, price, link: url };
  } catch {
    return null;
  }
}

async function searchAndPick(query: string): Promise<ScrapeResult> {
  const products = await searchTokopedia(query);
  if (products.length === 0) return null;
  const best = pickBest(products, query);
  if (!best) return null;

  const result: ScrapeResult = {
    name: best.name,
    price: best.price.number,
    link: best.url || `https://www.tokopedia.com/product/${best.id}`,
  };

  // Confirm the true selling price from the product page when reachable.
  if (best.url) {
    const pdp = await fetchFromPdp(best.url);
    if (pdp && pdp.price > 0) result.price = pdp.price;
  }
  return result;
}

/**
 * Scrape the best-matching price for a component from Tokopedia.
 * Pipeline: full query → brand-stripped query → model-only query.
 */
export async function scrapeTokopediaPrice(query: string): Promise<ScrapeResult> {
  const direct = await searchAndPick(query);
  if (direct) return direct;

  const shortQuery = query
    .replace(/^(ASUS|MSI|Gigabyte|ASRock|Colorful|Galax|Zotac|Sapphire|PowerColor|Palit|EVGA)\s+/i, '')
    .trim();
  if (shortQuery && shortQuery !== query) {
    const fallback = await searchAndPick(shortQuery);
    if (fallback) return fallback;
  }

  const modelMatch = query.match(/(\w+\s*\d{3,4}[A-Za-z]*(?:\s*\d*GB)?)/);
  if (modelMatch && modelMatch[1] !== query) {
    return searchAndPick(modelMatch[1]);
  }

  return null;
}
