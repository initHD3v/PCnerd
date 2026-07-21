import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import { PrismaClient, ComponentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const libsqlConfig = {
  url: 'file:./dev.db',
};

// @ts-ignore
const adapter = new PrismaLibSql(libsqlConfig);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Cleaning up old data...');
  await prisma.buildComponent.deleteMany();

  // Seed default admin
  const existingAdmin = await prisma.admin.findUnique({ where: { username: 'admin' } });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash('admin123', 12);
    await prisma.admin.create({
      data: { username: 'admin', password: hashed, role: 'superadmin' },
    });
    console.log('Default admin created: admin / admin123');
  } else {
    console.log('Admin user already exists, skipping.');
  }
  await prisma.hardwareComponent.deleteMany();

  console.log('Seeding massive hardware data (The Ultimate Collection)...');

  const components: any[] = [];

  // --- HELPER TO ADD VARIATIONS ---
  const brands = [
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
  ];

  const addVariations = (base: any, count: number = 3) => {
    components.push({ ...base, specs: base.specs || {} });
    for (let i = 0; i < count; i++) {
      const brand = brands[Math.floor(Math.random() * brands.length)];
      if (brand === base.brand) continue;
      const suffix = ['V2', 'OC', 'Pro', 'Elite', 'Gaming', 'TUF', 'ROG', 'Suprim', 'Aorus'][
        Math.floor(Math.random() * 9)
      ];
      components.push({
        ...base,
        name: `${brand} ${base.model || base.name || ''} ${suffix}`,
        brand: brand,
        price: Math.floor(base.price * (0.85 + Math.random() * 0.3)),
        specs: base.specs || {},
      });
    }
  };

  // --- CPUs ---
  // Intel LGA1200 & LGA1700
  [
    {
      name: 'Intel Core i3-10100F',
      brand: 'Intel',
      model: 'i3-10100F',
      type: ComponentType.CPU,
      price: 1050000,
      socket: 'LGA1200',
      tdp: 65,
    },
    {
      name: 'Intel Core i5-10400F',
      brand: 'Intel',
      model: 'i5-10400F',
      type: ComponentType.CPU,
      price: 1550000,
      socket: 'LGA1200',
      tdp: 65,
    },
    {
      name: 'Intel Core i3-12100F',
      brand: 'Intel',
      model: 'i3-12100F',
      type: ComponentType.CPU,
      price: 1250000,
      socket: 'LGA1700',
      tdp: 58,
    },
    {
      name: 'Intel Core i5-12400F',
      brand: 'Intel',
      model: 'i5-12400F',
      type: ComponentType.CPU,
      price: 1850000,
      socket: 'LGA1700',
      tdp: 65,
    },
    {
      name: 'Intel Core i5-13400F',
      brand: 'Intel',
      model: 'i5-13400F',
      type: ComponentType.CPU,
      price: 3100000,
      socket: 'LGA1700',
      tdp: 65,
    },
    {
      name: 'Intel Core i7-14700K',
      brand: 'Intel',
      model: 'i7-14700K',
      type: ComponentType.CPU,
      price: 6850000,
      socket: 'LGA1700',
      tdp: 125,
    },
    {
      name: 'Intel Core i9-14900K',
      brand: 'Intel',
      model: 'i9-14900K',
      type: ComponentType.CPU,
      price: 9600000,
      socket: 'LGA1700',
      tdp: 125,
    },
  ].forEach((c) => components.push({ ...c, specs: JSON.stringify({}) }));

  // AMD AM4 & AM5
  [
    {
      name: 'AMD Ryzen 3 3200G',
      brand: 'AMD',
      model: 'R3-3200G',
      type: ComponentType.CPU,
      price: 1150000,
      socket: 'AM4',
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 5 4500',
      brand: 'AMD',
      model: 'R5-4500',
      type: ComponentType.CPU,
      price: 1100000,
      socket: 'AM4',
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 5 5600',
      brand: 'AMD',
      model: 'R5-5600',
      type: ComponentType.CPU,
      price: 1850000,
      socket: 'AM4',
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 7 5700X',
      brand: 'AMD',
      model: 'R7-5700X',
      type: ComponentType.CPU,
      price: 2750000,
      socket: 'AM4',
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 5 7500F',
      brand: 'AMD',
      model: 'R5-7500F',
      type: ComponentType.CPU,
      price: 2550000,
      socket: 'AM5',
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 7 7800X3D',
      brand: 'AMD',
      model: 'R7-7800X3D',
      type: ComponentType.CPU,
      price: 6750000,
      socket: 'AM5',
      tdp: 120,
    },
    {
      name: 'AMD Ryzen 9 9950X',
      brand: 'AMD',
      model: 'R9-9950X',
      type: ComponentType.CPU,
      price: 11500000,
      socket: 'AM5',
      tdp: 170,
    },
  ].forEach((c) => components.push({ ...c, specs: JSON.stringify({}) }));

  // --- GPUs (Masive Variations) ---
  const gpuBases = [
    { model: 'GT 730', price: 850000, specs: { vram: '2GB' } },
    { model: 'GT 1030', price: 1150000, specs: { vram: '2GB' } },
    { model: 'GTX 1050 Ti', price: 1850000, specs: { vram: '4GB' } },
    { model: 'GTX 1650', price: 2150000, specs: { vram: '4GB' } },
    { model: 'GTX 1660 Super', price: 3250000, specs: { vram: '6GB' } },
    { model: 'RTX 3050', price: 3650000, specs: { vram: '8GB' } },
    { model: 'RTX 3060', price: 4250000, specs: { vram: '12GB' } },
    { model: 'RTX 4060', price: 4750000, specs: { vram: '8GB' } },
    { model: 'RTX 4060 Ti', price: 6500000, specs: { vram: '8GB' } },
    { model: 'RTX 4070', price: 9500000, specs: { vram: '12GB' } },
    { model: 'RTX 4070 Super', price: 10800000, specs: { vram: '12GB' } },
    { model: 'RTX 4080 Super', price: 18500000, specs: { vram: '16GB' } },
    { model: 'RTX 4090', price: 33500000, specs: { vram: '24GB' } },
    { model: 'RX 580', price: 1250000, specs: { vram: '8GB' } },
    { model: 'RX 6600', price: 3150000, specs: { vram: '8GB' } },
    { model: 'RX 7600', price: 4450000, specs: { vram: '8GB' } },
    { model: 'RX 7800 XT', price: 8850000, specs: { vram: '16GB' } },
    { model: 'RX 7900 XTX', price: 16500000, specs: { vram: '24GB' } },
  ];
  gpuBases.forEach((b) =>
    addVariations({ ...b, brand: 'NVIDIA', type: ComponentType.GPU, name: `NVIDIA ${b.model}` }, 8),
  );

  // --- Motherboards (Masive Variations) ---
  const moboBases = [
    { model: 'H510M', price: 950000, socket: 'LGA1200', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'B560M', price: 1450000, socket: 'LGA1200', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'H610M', price: 1100000, socket: 'LGA1700', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'B760M', price: 1950000, socket: 'LGA1700', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'Z790', price: 4500000, socket: 'LGA1700', ramType: 'DDR5', formFactor: 'ATX' },
    { model: 'A320M', price: 780000, socket: 'AM4', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'B450M', price: 1150000, socket: 'AM4', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'B550M', price: 1650000, socket: 'AM4', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'B650M', price: 2150000, socket: 'AM5', ramType: 'DDR5', formFactor: 'mATX' },
    { model: 'X670E', price: 6500000, socket: 'AM5', ramType: 'DDR5', formFactor: 'ATX' },
  ];
  moboBases.forEach((b) =>
    addVariations({ ...b, brand: 'ASUS', type: ComponentType.MOTHERBOARD, name: `ASUS ${b.model}` }, 6),
  );

  // --- RAM ---
  const ramBases = [
    { name: '8GB DDR4 3200MHz', price: 320000, ramType: 'DDR4' },
    { name: '16GB (2x8) DDR4 3200MHz', price: 650000, ramType: 'DDR4' },
    { name: '16GB (2x8) DDR4 3600MHz RGB', price: 850000, ramType: 'DDR4' },
    { name: '32GB (2x16) DDR4 3600MHz', price: 1250000, ramType: 'DDR4' },
    { name: '16GB (2x8) DDR5 5200MHz', price: 1150000, ramType: 'DDR5' },
    { name: '32GB (2x16) DDR5 6000MHz RGB', price: 2150000, ramType: 'DDR5' },
    { name: '64GB (2x32) DDR5 6400MHz', price: 4500000, ramType: 'DDR5' },
  ];
  ramBases.forEach((b) => addVariations({ ...b, brand: 'Team', type: ComponentType.RAM }, 5));

  // --- Storage ---
  [
    { name: '120GB SSD SATA', price: 185000 },
    { name: '240GB SSD SATA', price: 285000 },
    { name: '480GB SSD SATA', price: 480000 },
    { name: '256GB NVMe Gen3', price: 385000 },
    { name: '512GB NVMe Gen3', price: 580000 },
    { name: '1TB NVMe Gen4', price: 1050000 },
    { name: '2TB NVMe Gen4', price: 1950000 },
    { name: '1TB NVMe Gen5', price: 3450000 },
  ].forEach((s) => addVariations({ ...s, brand: 'Samsung', type: ComponentType.STORAGE }, 4));

  // --- PSU ---
  [
    { name: '400W 80+', price: 385000, wattage: 400 },
    { name: '500W 80+ Bronze', price: 550000, wattage: 500 },
    { name: '600W 80+ Bronze', price: 750000, wattage: 600 },
    { name: '750W 80+ Gold', price: 1450000, wattage: 750 },
    { name: '850W 80+ Gold Modular', price: 1950000, wattage: 850 },
    { name: '1000W 80+ Gold ATX 3.0', price: 2850000, wattage: 1000 },
  ].forEach((p) => addVariations({ ...p, brand: 'Corsair', type: ComponentType.PSU }, 5));

  // --- Case ---
  [
    { name: 'mATX Office Case', price: 250000, formFactor: 'mATX' },
    { name: 'Gaming Case RGB', price: 550000, formFactor: 'ATX' },
    { name: 'Mesh Airflow Case', price: 850000, formFactor: 'ATX' },
    { name: 'Premium Glass Case', price: 1550000, formFactor: 'ATX' },
    { name: 'Dual Chamber Case', price: 2450000, formFactor: 'ATX' },
  ].forEach((c) => addVariations({ ...c, brand: 'Paradox', type: ComponentType.CASE }, 6));

  // --- Cooler ---
  [
    { name: 'Stock Cooler', price: 0, type: ComponentType.COOLER },
    { name: 'Air Cooler Single Tower', price: 250000, type: ComponentType.COOLER },
    { name: 'Air Cooler Dual Tower', price: 650000, type: ComponentType.COOLER },
    { name: '240mm AIO Liquid', price: 950000, type: ComponentType.COOLER },
    { name: '360mm AIO Liquid RGB', price: 1850000, type: ComponentType.COOLER },
  ].forEach((c) => addVariations({ ...c, brand: 'Deepcool', type: ComponentType.COOLER }, 5));

  try {
    console.log(`Total components to seed: ${components.length}`);
    await prisma.hardwareComponent.createMany({ data: components });
    console.log(`Seeding finished! Successfully added ${components.length} components.`);
  } catch (error) {
    console.error('Error seeding:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
