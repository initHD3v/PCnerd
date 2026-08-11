import { readFileSync, writeFileSync, existsSync } from 'fs';

type Entry = { id: string; price: number; shopUrl?: string | null; match?: string };

const batchFile = process.argv[2];
const mainFile = process.argv[3];

const batch: Entry[] = JSON.parse(readFileSync(batchFile, 'utf-8'));
const main: Entry[] = existsSync(mainFile) ? JSON.parse(readFileSync(mainFile, 'utf-8')) : [];

const byId = new Map(main.map((e) => [e.id, e]));
for (const e of batch) byId.set(e.id, e);

writeFileSync(mainFile, JSON.stringify(Array.from(byId.values())));
console.log(`Merged ${batch.length} entries (total ${byId.size})`);
