import { scrapeEnterkomputerCatalog } from './src/lib/scraper/enterkomputer.ts';

async function main() {
  console.log('Memulai test Enterkomputer scraper...\n');

  const products = await scrapeEnterkomputerCatalog((p) => {
    process.stdout.write(`\r\x1b[K${p.message}`);
  });

  console.log(`\n\nSelesai! Total produk: ${products.length}`);

  if (products.length > 0) {
    console.log('\nSample produk:');
    for (const p of products.slice(0, 5)) {
      console.log(`  Rp ${p.price.toLocaleString('id-ID')} — ${p.name.slice(0, 80)}`);
    }
  }
}

main().catch((err) => {
  console.error('\nError:', err.message);
  process.exit(1);
});
