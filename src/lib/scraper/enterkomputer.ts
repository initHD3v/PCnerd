import { chromium, firefox, type Page } from 'playwright';

export interface EnterkomputerProduct {
  name: string;
  price: number;
  link: string;
  category: string;
}

export interface ScrapeProgress {
  category: string;
  found: number;
  done: number;
  total: number;
  message: string;
}

type OnProgress = (p: ScrapeProgress) => void;

const CATEGORIES = [
  { kcode: 17, name: 'processor', type: 'CPU' },
  { kcode: 12, name: 'motherboard', type: 'MOTHERBOARD' },
  { kcode: 24, name: 'vga', type: 'GPU' },
  { kcode: 11, name: 'memory-ram', type: 'RAM' },
  { kcode: 101, name: 'ssd', type: 'STORAGE' },
  { kcode: 19, name: 'psu', type: 'PSU' },
  { kcode: 3, name: 'casing', type: 'CASE' },
  { kcode: 4, name: 'aircooler', type: 'COOLER' },
];

const BASE_URL = 'https://www.enterkomputer.com';

async function extractToken(page: Page): Promise<{ token: string; signature: string } | null> {
  return page.evaluate(() => {
    const el = document.querySelector('[data-token]');
    if (!el) return null;
    return {
      token: el.getAttribute('data-token') || '',
      signature: el.getAttribute('data-signature') || '',
    };
  });
}

async function fetchProductList(
  page: Page,
  kcode: number,
  pageNum: number,
  token: string,
  signature: string,
): Promise<{ products: EnterkomputerProduct[]; hasMore: boolean }> {
  const cookies = await page.context().cookies();
  const cookieStr = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  const url = `${BASE_URL}/jeanne/v2/product-list?page=${pageNum}&kcode=${kcode}&sort=&skeyword=&limit=40&price_min=&price_max=&sconfiguration=&token=${token}&signature=${signature}`;

  const res = await fetch(url, {
    headers: {
      accept: 'application/json, text/javascript, */*; q=0.01',
      'x-requested-with': 'XMLHttpRequest',
      referer: `${BASE_URL}/category/${kcode}/${CATEGORIES.find((c) => c.kcode === kcode)?.name || ''}`,
      cookie: cookieStr,
      'user-agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'accept-language': 'id-ID,id;q=0.9,en;q=0.8',
    },
  });

  if (!res.ok) return { products: [], hasMore: false };

  const json = await res.json();
  const items: any[] = json?.data || json?.products || json?.items || [];

  const products: EnterkomputerProduct[] = items
    .filter((item: any) => {
      const price = parseInt(String(item.PPRCZ || item.price || '0').replace(/[^0-9]/g, ''));
      return price > 0 && item.PDISP !== 0 && item.PSTTS !== 0;
    })
    .map((item: any) => ({
      name: (item.PNAME || item.name || '').trim(),
      price: parseInt(String(item.PPRCZ || item.price || '0').replace(/[^0-9]/g, '')),
      link: `${BASE_URL}/product/detail/${item.PCODE}/${item.PLINK || ''}`,
      category: CATEGORIES.find((c) => c.kcode === kcode)?.type || String(kcode),
    }));

  const totalPages = json?.total_page || json?.totalPages || 1;
  const hasMore = pageNum < totalPages;

  return { products, hasMore };
}

async function bypassCloudflare(page: Page): Promise<boolean> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const title = await page.title();
    const bodyLen = await page.evaluate(() => document.body.innerText.length);

    if (bodyLen > 500 && !title.toLowerCase().includes('just a moment')) {
      return true;
    }

    await page.waitForTimeout(5000);
  }
  return false;
}

async function tryLaunchBrowser() {
  const headless = process.env.EK_HEADLESS !== 'false';

  const baseArgs = [
    '--no-sandbox',
    '--disable-blink-features=AutomationControlled',
    '--disable-features=ChromeWhatsNewUI',
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
    '--disable-site-isolation-trials',
    '--disable-component-update',
  ];

  if (headless) {
    baseArgs.push('--headless=new');
  }

  try {
    const browser = await chromium.launch({
      headless,
      channel: 'chrome',
      args: baseArgs,
    });
    return { browser, engine: `system chrome${headless ? ' (headless)' : ''}` as const };
  } catch {
    try {
      const browser = await chromium.launch({
        headless,
        args: baseArgs,
      });
      return { browser, engine: `playwright chromium${headless ? ' (headless)' : ''}` as const };
    } catch {
      const browser = await firefox.launch({ headless });
      return { browser, engine: `firefox${headless ? ' (headless)' : ''}` as const };
    }
  }
}

export async function scrapeEnterkomputerCatalog(onProgress?: OnProgress): Promise<EnterkomputerProduct[]> {
  const { browser, engine } = await tryLaunchBrowser();
  const allProducts: EnterkomputerProduct[] = [];

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      locale: 'id-ID',
      timezoneId: 'Asia/Jakarta',
      geolocation: { latitude: -6.2088, longitude: 106.8456 },
      permissions: ['geolocation'],
    });

    const page = await context.newPage();

    // Stealth patches to avoid Cloudflare detection
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en'] });
      (window as any).chrome = { runtime: {} };
    });

    onProgress?.({
      category: 'init',
      found: 0,
      done: 0,
      total: CATEGORIES.length,
      message: `Membuka Enterkomputer via ${engine}...`,
    });

    // Try homepage first, fallback to direct category page
    let bypassed = false;
    let tokenData: { token: string; signature: string } | null = null;

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    bypassed = await bypassCloudflare(page);

    if (bypassed) {
      tokenData = await extractToken(page);
    }

    if (!bypassed) {
      onProgress?.({
        category: 'init',
        found: 0,
        done: 0,
        total: CATEGORIES.length,
        message: 'Homepage diblokir, coba kategori langsung...',
      });

      for (const cat of CATEGORIES) {
        const catUrl = `${BASE_URL}/category/${cat.kcode}/${cat.name}`;
        await page.goto(catUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        bypassed = await bypassCloudflare(page);
        if (bypassed) {
          tokenData = await extractToken(page);
          break;
        }
      }
    }

    if (!bypassed) {
      throw new Error(
        `Gagal melewati Cloudflare. Cara memperbaiki:\n` +
          `1. Install Google Chrome: https://www.google.com/chrome/\n` +
          `2. Atau install Playwright Chromium: npx playwright install chromium --with-deps\n` +
          `3. Coba non-headless: set EK_HEADLESS=false lalu restart dev server`,
      );
    }

    for (let ci = 0; ci < CATEGORIES.length; ci++) {
      const cat = CATEGORIES[ci];
      let pageNum = 1;
      let catProducts: EnterkomputerProduct[] = [];
      let hasMore = true;
      let emptyPages = 0;

      onProgress?.({
        category: cat.type,
        found: 0,
        done: ci,
        total: CATEGORIES.length,
        message: `Scraping ${cat.type}...`,
      });

      while (hasMore && emptyPages < 3) {
        let products: EnterkomputerProduct[] = [];

        if (tokenData) {
          const result = await fetchProductList(page, cat.kcode, pageNum, tokenData.token, tokenData.signature);
          products = result.products;
          hasMore = result.hasMore;
        } else {
          const catUrl = `${BASE_URL}/category/${cat.kcode}/${cat.name}`;
          const result = await scrapeCategoryPage(page, catUrl, pageNum);
          products = result.products;
          hasMore = result.hasMore;
        }

        if (products.length === 0) {
          emptyPages++;
        } else {
          emptyPages = 0;
        }

        catProducts.push(...products);
        pageNum++;

        onProgress?.({
          category: cat.type,
          found: catProducts.length,
          done: ci,
          total: CATEGORIES.length,
          message: `${cat.type}: ${catProducts.length} produk`,
        });

        if (hasMore) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      allProducts.push(...catProducts);
    }

    return allProducts;
  } finally {
    await browser.close();
  }
}

async function scrapeCategoryPage(
  page: Page,
  url: string,
  pageNum: number,
): Promise<{ products: EnterkomputerProduct[]; hasMore: boolean }> {
  const loadMoreUrl = pageNum === 1 ? url : `${url}?page=${pageNum}`;
  await page.goto(loadMoreUrl, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(3000);

  const products = await page.evaluate(() => {
    const items: Array<{ name: string; price: number; link: string; category: string }> = [];

    const scripts = document.querySelectorAll('script');
    for (const script of scripts) {
      const text = script.textContent || '';
      const match = text.match(/window\.__INITIAL_STATE__\s*=\s*({.+?});/);
      if (match) {
        try {
          const jsonData = JSON.parse(match[1]);
          const list = jsonData?.products || jsonData?.items || [];
          for (const p of list) {
            const price = parseInt(String(p.PPRCZ || p.price || '0').replace(/[^0-9]/g, ''));
            if (price > 0) {
              items.push({
                name: (p.PNAME || p.name || '').trim(),
                price,
                link: `${window.location.origin}/product/detail/${p.PCODE || p.id}/${p.PLINK || ''}`,
                category: '',
              });
            }
          }
          return items;
        } catch {}
        break;
      }
    }

    const cards = document.querySelectorAll('[class*="product" i], [class*="produk" i], .item, .card');
    for (const card of cards) {
      const linkEl = card.querySelector('a[href*="/product/detail/"]');
      const nameEl = linkEl || card.querySelector('h5 a, h4 a, .name a, .title a, .card-title a');
      const priceEl = card.querySelector('[class*="price" i], .harga, .Price');
      if (nameEl && priceEl) {
        const name = (nameEl.textContent || '').trim();
        const priceText = (priceEl.textContent || '').replace(/[^0-9]/g, '');
        const price = parseInt(priceText);
        const link = (nameEl as HTMLAnchorElement).href || '';
        if (name && price > 0) {
          items.push({ name, price, link, category: '' });
        }
      }
    }

    return items;
  });

  return {
    products,
    hasMore: products.length >= 40,
  };
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function computeSimilarity(a: string, b: string): number {
  const aWords = new Set(
    normalizeName(a)
      .split(' ')
      .filter((w) => w.length > 2),
  );
  const bWords = new Set(
    normalizeName(b)
      .split(' ')
      .filter((w) => w.length > 2),
  );

  if (aWords.size === 0 || bWords.size === 0) return 0;

  let intersect = 0;
  for (const w of aWords) {
    if (bWords.has(w)) intersect++;
  }

  const union = new Set([...aWords, ...bWords]).size;
  return intersect / union;
}

export function matchComponentToCatalog(
  componentName: string,
  componentBrand: string,
  catalog: EnterkomputerProduct[],
): EnterkomputerProduct | null {
  const brandLower = componentBrand.toLowerCase();
  const catFiltered = catalog.filter((p) => p.name.toLowerCase().includes(brandLower));

  if (catFiltered.length === 0) return null;

  let bestMatch: EnterkomputerProduct | null = null;
  let bestScore = 0;

  for (const product of catFiltered) {
    const score = computeSimilarity(componentName, product.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = product;
    }
  }

  return bestScore > 0.3 ? bestMatch : null;
}
