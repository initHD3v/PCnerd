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

  const addVariations = (base: any, count: number = 3, validBrands?: string[]) => {
    components.push({ ...base, specs: base.specs || {} });
    const pool = validBrands || brands;
    for (let i = 0; i < count; i++) {
      const brand = pool[Math.floor(Math.random() * pool.length)];
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
  // Intel LGA1200 & LGA1700 (12th-14th Gen)
  [
    { name: 'Intel Core i3-10100F', brand: 'Intel', model: 'i3-10100F', type: ComponentType.CPU, price: 1050000, socket: 'LGA1200', tdp: 65 },
    { name: 'Intel Core i5-10400F', brand: 'Intel', model: 'i5-10400F', type: ComponentType.CPU, price: 1550000, socket: 'LGA1200', tdp: 65 },
    { name: 'Intel Core i3-12100F', brand: 'Intel', model: 'i3-12100F', type: ComponentType.CPU, price: 1250000, socket: 'LGA1700', tdp: 58 },
    { name: 'Intel Core i5-12400F', brand: 'Intel', model: 'i5-12400F', type: ComponentType.CPU, price: 1850000, socket: 'LGA1700', tdp: 65 },
    { name: 'Intel Core i5-13400F', brand: 'Intel', model: 'i5-13400F', type: ComponentType.CPU, price: 3100000, socket: 'LGA1700', tdp: 65 },
    { name: 'Intel Core i5-13600K', brand: 'Intel', model: 'i5-13600K', type: ComponentType.CPU, price: 4100000, socket: 'LGA1700', tdp: 125 },
    { name: 'Intel Core i7-14700K', brand: 'Intel', model: 'i7-14700K', type: ComponentType.CPU, price: 6850000, socket: 'LGA1700', tdp: 125 },
    { name: 'Intel Core i9-14900K', brand: 'Intel', model: 'i9-14900K', type: ComponentType.CPU, price: 9600000, socket: 'LGA1700', tdp: 125 },
  ].forEach((c) => components.push({ ...c, specs: JSON.stringify({}) }));

  // Intel Arrow Lake (Core Ultra 200S Series) — LGA1851 (2024-2025)
  [
    { name: 'Intel Core Ultra 5 225F', brand: 'Intel', model: 'CU5-225F', type: ComponentType.CPU, price: 2100000, socket: 'LGA1851', tdp: 65 },
    { name: 'Intel Core Ultra 5 225', brand: 'Intel', model: 'CU5-225', type: ComponentType.CPU, price: 2300000, socket: 'LGA1851', tdp: 65 },
    { name: 'Intel Core Ultra 5 235', brand: 'Intel', model: 'CU5-235', type: ComponentType.CPU, price: 2600000, socket: 'LGA1851', tdp: 65 },
    { name: 'Intel Core Ultra 5 245', brand: 'Intel', model: 'CU5-245', type: ComponentType.CPU, price: 2900000, socket: 'LGA1851', tdp: 65 },
    { name: 'Intel Core Ultra 5 245K', brand: 'Intel', model: 'CU5-245K', type: ComponentType.CPU, price: 3900000, socket: 'LGA1851', tdp: 125 },
    { name: 'Intel Core Ultra 5 245KF', brand: 'Intel', model: 'CU5-245KF', type: ComponentType.CPU, price: 3700000, socket: 'LGA1851', tdp: 125 },
    { name: 'Intel Core Ultra 7 265', brand: 'Intel', model: 'CU7-265', type: ComponentType.CPU, price: 3800000, socket: 'LGA1851', tdp: 65 },
    { name: 'Intel Core Ultra 7 265F', brand: 'Intel', model: 'CU7-265F', type: ComponentType.CPU, price: 3600000, socket: 'LGA1851', tdp: 65 },
    { name: 'Intel Core Ultra 7 265K', brand: 'Intel', model: 'CU7-265K', type: ComponentType.CPU, price: 5200000, socket: 'LGA1851', tdp: 125 },
    { name: 'Intel Core Ultra 7 265KF', brand: 'Intel', model: 'CU7-265KF', type: ComponentType.CPU, price: 5000000, socket: 'LGA1851', tdp: 125 },
    { name: 'Intel Core Ultra 9 285', brand: 'Intel', model: 'CU9-285', type: ComponentType.CPU, price: 5800000, socket: 'LGA1851', tdp: 65 },
    { name: 'Intel Core Ultra 9 285K', brand: 'Intel', model: 'CU9-285K', type: ComponentType.CPU, price: 7800000, socket: 'LGA1851', tdp: 125 },
  ].forEach((c) => components.push({ ...c, specs: JSON.stringify({}) }));

  // AMD AM4 & AM5
  [
    { name: 'AMD Ryzen 3 3200G', brand: 'AMD', model: 'R3-3200G', type: ComponentType.CPU, price: 1150000, socket: 'AM4', tdp: 65 },
    { name: 'AMD Ryzen 5 4500', brand: 'AMD', model: 'R5-4500', type: ComponentType.CPU, price: 1100000, socket: 'AM4', tdp: 65 },
    { name: 'AMD Ryzen 5 5600', brand: 'AMD', model: 'R5-5600', type: ComponentType.CPU, price: 1850000, socket: 'AM4', tdp: 65 },
    { name: 'AMD Ryzen 7 5700X', brand: 'AMD', model: 'R7-5700X', type: ComponentType.CPU, price: 2750000, socket: 'AM4', tdp: 65 },
    { name: 'AMD Ryzen 5 7500F', brand: 'AMD', model: 'R5-7500F', type: ComponentType.CPU, price: 2550000, socket: 'AM5', tdp: 65 },
    { name: 'AMD Ryzen 7 7800X3D', brand: 'AMD', model: 'R7-7800X3D', type: ComponentType.CPU, price: 6750000, socket: 'AM5', tdp: 120 },
    { name: 'AMD Ryzen 9 9950X', brand: 'AMD', model: 'R9-9950X', type: ComponentType.CPU, price: 11500000, socket: 'AM5', tdp: 170 },
  ].forEach((c) => components.push({ ...c, specs: JSON.stringify({}) }));

  // AMD Ryzen 9000 Series (Zen 5) — AM5 (2024-2025)
  [
    { name: 'AMD Ryzen 5 9600', brand: 'AMD', model: 'R5-9600', type: ComponentType.CPU, price: 2850000, socket: 'AM5', tdp: 65 },
    { name: 'AMD Ryzen 5 9600X', brand: 'AMD', model: 'R5-9600X', type: ComponentType.CPU, price: 3300000, socket: 'AM5', tdp: 65 },
    { name: 'AMD Ryzen 7 9700X', brand: 'AMD', model: 'R7-9700X', type: ComponentType.CPU, price: 4600000, socket: 'AM5', tdp: 65 },
    { name: 'AMD Ryzen 7 9800X3D', brand: 'AMD', model: 'R7-9800X3D', type: ComponentType.CPU, price: 7200000, socket: 'AM5', tdp: 120 },
    { name: 'AMD Ryzen 7 9850X3D', brand: 'AMD', model: 'R7-9850X3D', type: ComponentType.CPU, price: 7800000, socket: 'AM5', tdp: 120 },
    { name: 'AMD Ryzen 9 9900X', brand: 'AMD', model: 'R9-9900X', type: ComponentType.CPU, price: 6500000, socket: 'AM5', tdp: 120 },
    { name: 'AMD Ryzen 9 9900X3D', brand: 'AMD', model: 'R9-9900X3D', type: ComponentType.CPU, price: 9000000, socket: 'AM5', tdp: 120 },
    { name: 'AMD Ryzen 9 9950X3D', brand: 'AMD', model: 'R9-9950X3D', type: ComponentType.CPU, price: 14000000, socket: 'AM5', tdp: 170 },
  ].forEach((c) => components.push({ ...c, specs: JSON.stringify({}) }));

  // --- GPUs (Masive Variations) ---
  const gpuBases = [
    // NVIDIA RTX 40 series
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
    // NVIDIA RTX 50 series (Blackwell) — 2025
    { model: 'RTX 5050', price: 3800000, specs: { vram: '8GB' } },
    { model: 'RTX 5060', price: 4800000, specs: { vram: '8GB GDDR7' } },
    { model: 'RTX 5060 Ti 8GB', price: 5800000, specs: { vram: '8GB GDDR7' } },
    { model: 'RTX 5060 Ti 16GB', price: 6500000, specs: { vram: '16GB GDDR7' } },
    { model: 'RTX 5070', price: 9000000, specs: { vram: '12GB GDDR7' } },
    { model: 'RTX 5070 Ti', price: 12500000, specs: { vram: '16GB GDDR7' } },
    { model: 'RTX 5080', price: 17000000, specs: { vram: '16GB GDDR7' } },
    { model: 'RTX 5090', price: 35000000, specs: { vram: '32GB GDDR7' } },
    // AMD RX 6000 series
    { model: 'RX 580', price: 1250000, specs: { vram: '8GB' } },
    { model: 'RX 6600', price: 3150000, specs: { vram: '8GB' } },
    { model: 'RX 7600', price: 4450000, specs: { vram: '8GB' } },
    { model: 'RX 7700 XT', price: 6250000, specs: { vram: '12GB' } },
    { model: 'RX 7800 XT', price: 8850000, specs: { vram: '16GB' } },
    { model: 'RX 7900 XT', price: 13500000, specs: { vram: '20GB' } },
    { model: 'RX 7900 XTX', price: 16500000, specs: { vram: '24GB' } },
    // AMD RX 9000 series (RDNA 4) — 2025
    { model: 'RX 9060', price: 4100000, specs: { vram: '8GB GDDR6' } },
    { model: 'RX 9060 XT 8GB', price: 5100000, specs: { vram: '8GB GDDR6' } },
    { model: 'RX 9060 XT 16GB', price: 5900000, specs: { vram: '16GB GDDR6' } },
    { model: 'RX 9070', price: 9500000, specs: { vram: '16GB GDDR6' } },
    { model: 'RX 9070 XT', price: 11000000, specs: { vram: '16GB GDDR6' } },
  ];
  const isNvidia = (m: string) => /^(GT |GTX |RTX )/i.test(m);
  gpuBases.forEach((b) => {
    const brand = isNvidia(b.model) ? 'NVIDIA' : 'AMD';
    addVariations({ ...b, brand, type: ComponentType.GPU, name: `${brand} ${b.model}` }, 8);
  });

  // --- Motherboards (Masive Variations) ---
  const moboBases = [
    // Intel LGA1200
    { model: 'H510M', price: 950000, socket: 'LGA1200', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'B560M', price: 1450000, socket: 'LGA1200', ramType: 'DDR4', formFactor: 'mATX' },
    // Intel LGA1700
    { model: 'H610M', price: 1100000, socket: 'LGA1700', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'B760M', price: 1950000, socket: 'LGA1700', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'Z790', price: 4500000, socket: 'LGA1700', ramType: 'DDR5', formFactor: 'ATX' },
    // Intel LGA1851 (800 series — 2024-2025)
    { model: 'H810M', price: 1300000, socket: 'LGA1851', ramType: 'DDR5', formFactor: 'mATX' },
    { model: 'B860M', price: 2200000, socket: 'LGA1851', ramType: 'DDR5', formFactor: 'mATX' },
    { model: 'Z890', price: 5200000, socket: 'LGA1851', ramType: 'DDR5', formFactor: 'ATX' },
    // AMD AM4
    { model: 'A320M', price: 780000, socket: 'AM4', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'B450M', price: 1150000, socket: 'AM4', ramType: 'DDR4', formFactor: 'mATX' },
    { model: 'B550M', price: 1650000, socket: 'AM4', ramType: 'DDR4', formFactor: 'mATX' },
    // AMD AM5
    { model: 'A620M', price: 1450000, socket: 'AM5', ramType: 'DDR5', formFactor: 'mATX' },
    { model: 'B650M', price: 2150000, socket: 'AM5', ramType: 'DDR5', formFactor: 'mATX' },
    { model: 'X670E', price: 6500000, socket: 'AM5', ramType: 'DDR5', formFactor: 'ATX' },
    // AMD AM5 (800 series — 2024-2025)
    { model: 'B840M', price: 1700000, socket: 'AM5', ramType: 'DDR5', formFactor: 'mATX' },
    { model: 'B850M', price: 2600000, socket: 'AM5', ramType: 'DDR5', formFactor: 'mATX' },
    { model: 'X870', price: 4500000, socket: 'AM5', ramType: 'DDR5', formFactor: 'ATX' },
    { model: 'X870E', price: 7500000, socket: 'AM5', ramType: 'DDR5', formFactor: 'ATX' },
  ];
  const moboBrands = ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Colorful'];
  moboBases.forEach((b) =>
    addVariations({ ...b, brand: 'ASUS', type: ComponentType.MOTHERBOARD, name: `ASUS ${b.model}` }, 6, moboBrands),
  );

  // --- RAM ---
  const ramBases = [
    { name: '8GB DDR4 3200MHz', price: 320000, ramType: 'DDR4' },
    { name: '16GB (2x8) DDR4 3200MHz', price: 650000, ramType: 'DDR4' },
    { name: '16GB (2x8) DDR4 3600MHz RGB', price: 850000, ramType: 'DDR4' },
    { name: '32GB (2x16) DDR4 3600MHz', price: 1250000, ramType: 'DDR4' },
    { name: '16GB (2x8) DDR5 5200MHz', price: 1150000, ramType: 'DDR5' },
    { name: '32GB (2x16) DDR5 6000MHz RGB', price: 2150000, ramType: 'DDR5' },
    { name: '32GB (2x16) DDR5 6400MHz', price: 2400000, ramType: 'DDR5' },
    { name: '64GB (2x32) DDR5 6400MHz', price: 4500000, ramType: 'DDR5' },
    // High-speed DDR5 (2024-2025)
    { name: '32GB (2x16) DDR5 6800MHz RGB', price: 2900000, ramType: 'DDR5' },
    { name: '48GB (2x24) DDR5 7200MHz', price: 4200000, ramType: 'DDR5' },
    { name: '64GB (2x32) DDR5 7200MHz RGB', price: 5500000, ramType: 'DDR5' },
    { name: '48GB (2x24) DDR5 8000MHz', price: 5800000, ramType: 'DDR5' },
  ];
  ramBases.forEach((b) => addVariations({ ...b, brand: 'Team', type: ComponentType.RAM }, 5));

  // --- Storage ---
  [
    { name: '120GB SSD SATA', price: 185000 },
    { name: '240GB SSD SATA', price: 285000 },
    { name: '480GB SSD SATA', price: 480000 },
    { name: '1TB SSD SATA', price: 850000 },
    { name: '256GB NVMe Gen3', price: 385000 },
    { name: '512GB NVMe Gen3', price: 580000 },
    { name: '1TB NVMe Gen4', price: 1050000 },
    { name: '2TB NVMe Gen4', price: 1950000 },
    { name: '4TB NVMe Gen4', price: 3800000 },
    { name: '1TB NVMe Gen5', price: 3450000 },
    { name: '2TB NVMe Gen5', price: 5200000 },
    { name: '4TB NVMe Gen5', price: 9800000 },
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
