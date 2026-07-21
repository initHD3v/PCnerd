import { scrapeTokopediaPrice } from './tokopedia';
import { prisma } from '../prisma';

const DELAY_MS = 1500;

async function getActiveJob() {
  return prisma.syncJob.findFirst({
    where: { status: 'running' },
    orderBy: { createdAt: 'desc' },
  });
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
  const latest = job?.status === 'running'
    ? job
    : await prisma.syncJob.findFirst({ orderBy: { createdAt: 'desc' } });
  return latest
    ? { id: latest.id, status: latest.status, progress: latest.progress, total: latest.total, processed: latest.processed, message: latest.message, startedAt: latest.startedAt, endedAt: latest.endedAt }
    : { status: 'never_run', message: 'Belum pernah ada sinkronisasi.' };
}

export async function updateAllPrices() {
  const active = await getActiveJob();
  if (active?.status === 'running') {
    return { success: false, message: 'Sinkronisasi sudah sedang berjalan.' };
  }

  const jobId = await createJob();

  process.nextTick(async () => {
    try {
      const components = await prisma.hardwareComponent.findMany();
      const total = components.length;
      let updated = 0;

      await updateJob(jobId, { total, progress: 0, processed: 0, message: `Memulai sinkronisasi ${total} komponen...` });

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
          message: `${processed}/${total} — ${updated} harga diperbarui`,
        });

        await new Promise((r) => setTimeout(r, DELAY_MS));
      }

      await updateJob(jobId, {
        status: 'completed',
        progress: 100,
        message: `Selesai. ${updated} dari ${total} harga berhasil diperbarui.`,
        endedAt: new Date(),
      });
    } catch (error: any) {
      await updateJob(jobId, { status: 'failed', message: error.message, endedAt: new Date() });
    }
  });

  return { success: true, message: 'Sinkronisasi dimulai di background.' };
}
