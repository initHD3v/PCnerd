import { ComponentType } from '@prisma/client';
import { scrapeTokopediaPrice } from './tokopedia';
import { scrapeEnterkomputerCatalog, matchComponentToCatalog } from './enterkomputer';
import { prisma } from '../prisma';

const DELAY_MS = 1500;

export const COMPONENT_TYPES: ComponentType[] = [
  'CPU',
  'GPU',
  'MOTHERBOARD',
  'RAM',
  'STORAGE',
  'PSU',
  'CASE',
  'COOLER',
  'MONITOR',
  'KEYBOARD',
  'MOUSE',
  'HEADSET',
  'SPEAKER',
];

export function isValidComponentType(value: unknown): value is ComponentType {
  return typeof value === 'string' && (COMPONENT_TYPES as string[]).includes(value);
}

function typeFilter(category?: ComponentType) {
  return category ? [{ type: category } as const] : [];
}

async function getActiveJob() {
  const job = await prisma.syncJob.findFirst({
    where: { status: 'running' },
    orderBy: { createdAt: 'desc' },
  });

  if (job && job.startedAt) {
    const elapsed = Date.now() - new Date(job.startedAt).getTime();
    if (elapsed > 10 * 60 * 1000) {
      await prisma.syncJob.update({
        where: { id: job.id },
        data: { status: 'failed', message: 'Timeout — job berjalan >10 menit', endedAt: new Date() },
      });
      return null;
    }
  }

  return job;
}

async function createJob(): Promise<string> {
  await prisma.syncJob.updateMany({
    where: { status: 'running' },
    data: { status: 'failed', message: 'Interrupted by new sync', endedAt: new Date() },
  });
  const job = await prisma.syncJob.create({
    data: { status: 'running', startedAt: new Date() },
  });
  return job.id;
}

async function updateJob(id: string, data: Record<string, unknown>) {
  await prisma.syncJob.update({ where: { id }, data });
}

export async function getSyncStatus() {
  const job = await getActiveJob();
  const latest = job?.status === 'running' ? job : await prisma.syncJob.findFirst({ orderBy: { createdAt: 'desc' } });
  return latest
    ? {
        id: latest.id,
        status: latest.status,
        progress: latest.progress,
        total: latest.total,
        processed: latest.processed,
        message: latest.message,
        startedAt: latest.startedAt,
        endedAt: latest.endedAt,
      }
    : { status: 'never_run', message: 'Belum pernah ada sinkronisasi.' };
}

export async function updateAllPricesFromTokopedia(category?: ComponentType) {
  const active = await getActiveJob();
  if (active?.status === 'running') {
    return { success: false, message: 'Sinkronisasi sudah sedang berjalan.' };
  }

  const jobId = await createJob();
  const categoryLabel = category ?? 'Semua';

  process.nextTick(async () => {
    try {
      const components = await prisma.hardwareComponent.findMany({
        where: {
          AND: [{ OR: [{ marketplace: 'Tokopedia' }, { marketplace: null }] }, ...typeFilter(category)],
        },
      });
      const total = components.length;
      let updated = 0;

      await updateJob(jobId, {
        total,
        progress: 0,
        processed: 0,
        message: `Memulai sinkronisasi Tokopedia (${categoryLabel}): ${total} komponen...`,
      });

      for (let i = 0; i < total; i++) {
        const component = components[i];
        const onlineData = await scrapeTokopediaPrice(component.name);

        if (onlineData && onlineData.price > 0) {
          await prisma.hardwareComponent.update({
            where: { id: component.id },
            data: {
              price: onlineData.price,
              shopUrl: onlineData.link,
              marketplace: 'Tokopedia',
              updatedAt: new Date(),
            },
          });
          updated++;
        }

        const processed = i + 1;
        const progress = Math.round((processed / total) * 100);
        await updateJob(jobId, {
          processed,
          progress,
          message: `Tokopedia: ${processed}/${total} — ${updated} harga diperbarui`,
        });

        await new Promise((r) => setTimeout(r, DELAY_MS));
      }

      await updateJob(jobId, {
        status: 'completed',
        progress: 100,
        message: `Selesai. ${updated} dari ${total} harga Tokopedia (${categoryLabel}) berhasil diperbarui.`,
        endedAt: new Date(),
      });
    } catch (error: any) {
      await updateJob(jobId, { status: 'failed', message: error.message, endedAt: new Date() });
    }
  });

  return { success: true, message: 'Sinkronisasi Tokopedia dimulai di background.' };
}

export async function updateAllPricesFromEnterkomputer(category?: ComponentType) {
  const active = await getActiveJob();
  if (active?.status === 'running') {
    return { success: false, message: 'Sinkronisasi sudah sedang berjalan.' };
  }

  const jobId = await createJob();
  const categoryLabel = category ?? 'Semua';

  process.nextTick(async () => {
    try {
      await updateJob(jobId, {
        progress: 0,
        message: `Memulai scraping Enterkomputer (${categoryLabel})...`,
      });

      const catalog = await scrapeEnterkomputerCatalog((p) => {
        updateJob(jobId, {
          progress: Math.round((p.done / p.total) * 70),
          message: p.message,
        });
      });

      const components = await prisma.hardwareComponent.findMany({
        where: {
          AND: [{ OR: [{ marketplace: 'Enterkomputer' }, { marketplace: null }] }, ...typeFilter(category)],
        },
      });
      const total = components.length;
      let updated = 0;
      let matched = 0;

      await updateJob(jobId, {
        total,
        processed: 0,
        progress: 70,
        message: `Katalog Enterkomputer: ${catalog.length} produk. Mencocokkan ${total} komponen (${categoryLabel})...`,
      });

      for (let i = 0; i < total; i++) {
        const component = components[i];
        const match = matchComponentToCatalog(component.name, component.brand, catalog);

        if (match) {
          matched++;
          if (match.price > 0 && match.price !== component.price) {
            await prisma.hardwareComponent.update({
              where: { id: component.id },
              data: {
                price: match.price,
                shopUrl: match.link,
                marketplace: 'Enterkomputer',
                updatedAt: new Date(),
              },
            });
            updated++;
          }
        }

        const processed = i + 1;
        const progress = 70 + Math.round((processed / total) * 30);
        if (processed % 10 === 0 || processed === total) {
          await updateJob(jobId, {
            processed,
            progress,
            message: `${processed}/${total} — ${matched} cocok, ${updated} harga diperbarui`,
          });
        }
      }

      await updateJob(jobId, {
        status: 'completed',
        progress: 100,
        message: `Selesai. ${catalog.length} produk di katalog, ${matched} cocok, ${updated} harga diperbarui (${categoryLabel}).`,
        endedAt: new Date(),
      });
    } catch (error: any) {
      await updateJob(jobId, { status: 'failed', message: error.message, endedAt: new Date() });
    }
  });

  return { success: true, message: 'Sinkronisasi Enterkomputer dimulai di background.' };
}
