export type ScrapeResult = {
  name: string | null;
  price: number;
  link: string | undefined;
} | null;

const TOKOPEDIA_GRAPHQL = 'https://gql.tokopedia.com/graphql/GetSearchProduct';

/**
 * Attempt to scrape price from Tokopedia using their GraphQL search API.
 * Falls back to Playwright HTML scraping if the API approach fails.
 */
export async function scrapeTokopediaPrice(query: string, _existingPage?: any, _retries = 1): Promise<ScrapeResult> {
  const result = await viaGraphqlApi(query);
  if (result) return result;

  // Strip brand prefix to broaden the search
  const shortQuery = query
    .replace(/^(ASUS|MSI|Gigabyte|ASRock|Colorful|Galax|Zotac|Sapphire|PowerColor|Palit|EVGA)\s+/i, '')
    .trim();
  if (shortQuery !== query) {
    const fallback = await viaGraphqlApi(shortQuery);
    if (fallback) return fallback;
  }

  // Last resort: search by product type + model
  const modelMatch = query.match(/(\w+\s*\d{3,4}[A-Za-z]*(?:\s*\d*GB)?)/);
  if (modelMatch) {
    return viaGraphqlApi(modelMatch[1]);
  }

  return null;
}

async function viaGraphqlApi(searchQuery: string): Promise<ScrapeResult> {
  try {
    const res = await fetch(TOKOPEDIA_GRAPHQL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: 'https://www.tokopedia.com',
        referer: 'https://www.tokopedia.com/',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      },
      body: JSON.stringify({
        query: `query GetSearchProduct($params:SearchProductQueryInput!){searchProduct(params:$params){products{id,name,price}}}`,
        variables: { params: { query: searchQuery, page: 1, pageSize: 3 } },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;

    const json: any = await res.json();
    if (json.errors || !json.data?.searchProduct?.products?.length) return null;

    const product = json.data.searchProduct.products[0];
    const price =
      typeof product.price === 'number' ? product.price : parseInt(String(product.price).replace(/[^0-9]/g, ''));

    if (isNaN(price) || price <= 0) return null;

    return {
      name: product.name || null,
      price,
      link: `https://www.tokopedia.com/product/${product.id}`,
    };
  } catch {
    return null;
  }
}
