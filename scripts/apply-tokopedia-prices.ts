import { readFileSync } from 'fs';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import { PrismaClient } from '@prisma/client';

const mainFile = process.argv[2];

const entries: { id: string; price: number; shopUrl?: string | null }[] = JSON.parse(readFileSync(mainFile, 'utf-8'));

const libsqlConfig = { url: 'file:./dev.db' };
// @ts-ignore
const adapter = new PrismaLibSql(libsqlConfig);
const prisma = new PrismaClient({ adapter });

async function main() {
  let updated = 0;
  let skipped = 0;
  for (const e of entries) {
    if (!e.id || !(e.price > 0)) {
      skipped++;
      continue;
    }
    await prisma.hardwareComponent.update({
      where: { id: e.id },
      data: { price: e.price, shopUrl: e.shopUrl ?? null, marketplace: 'Tokopedia', updatedAt: new Date() },
    });
    updated++;
  }
  console.log(`Applied: ${updated} updated, ${skipped} skipped (of ${entries.length})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
