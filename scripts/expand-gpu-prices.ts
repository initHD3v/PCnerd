import { readFileSync, writeFileSync, existsSync } from 'fs';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import { PrismaClient } from '@prisma/client';

// tmp/gpu-chipset-prices.json: { "<chipset model>": { price, shopUrl, match } }
// Expands to every GPU component of that chipset, merged into main prices file.
const chipsetFile = process.argv[2];
const mainFile = process.argv[3];

const chipsetPrices: Record<string, { price: number; shopUrl?: string | null; match?: string }> = JSON.parse(
  readFileSync(chipsetFile, 'utf-8'),
);

const libsqlConfig = { url: 'file:./dev.db' };
// @ts-ignore
const adapter = new PrismaLibSql(libsqlConfig);
const prisma = new PrismaClient({ adapter });

async function main() {
  const main: { id: string; price: number; shopUrl?: string | null; match?: string }[] = existsSync(mainFile)
    ? JSON.parse(readFileSync(mainFile, 'utf-8'))
    : [];
  const byId = new Map(main.map((e) => [e.id, e]));

  let added = 0;
  for (const [chipset, data] of Object.entries(chipsetPrices)) {
    const gpus = await prisma.hardwareComponent.findMany({
      where: { type: 'GPU', model: chipset },
      select: { id: true },
    });
    for (const gpu of gpus) {
      byId.set(gpu.id, { id: gpu.id, price: data.price, shopUrl: data.shopUrl ?? null, match: data.match });
      added++;
    }
  }

  writeFileSync(mainFile, JSON.stringify(Array.from(byId.values())));
  console.log(`Expanded ${added} GPU entries for ${Object.keys(chipsetPrices).length} chipsets (total ${byId.size})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
