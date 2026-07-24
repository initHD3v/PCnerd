import { PrismaLibSql } from '@prisma/adapter-libsql';
import { createClient } from '@libsql/client';
import { PrismaClient, ComponentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const libsqlConfig = { url: 'file:./dev.db' };
// @ts-ignore
const adapter = new PrismaLibSql(libsqlConfig);
const prisma = new PrismaClient({ adapter });

function add(components: any[], item: any) {
  components.push({ ...item, specs: item.specs || {} });
}

const realBrand = (brand: string, name: string) => ({ brand, name });

const moboBrands = ['ASUS', 'MSI', 'Gigabyte', 'ASRock', 'Colorful'] as const;

const realMobo = (
  brand: (typeof moboBrands)[number],
  model: string,
  chipset: string,
  socket: string,
  ramType: string,
  formFactor: string,
  price: number,
) => ({
  name: `${brand} ${model}`,
  brand,
  model,
  type: ComponentType.MOTHERBOARD,
  price,
  socket,
  ramType,
  formFactor,
});

// Each entry: [model, socket, ramType, formFactor, basePrice]
// Variations per brand are listed inline
type MoboDef = [string, string, string, string, number];
const moboModels: Record<string, MoboDef> = {
  A320M: ['A320M', 'AM4', 'DDR4', 'mATX', 780000],
  B450M: ['B450M', 'AM4', 'DDR4', 'mATX', 1150000],
  B550M: ['B550M', 'AM4', 'DDR4', 'mATX', 1650000],
  A620M: ['A620M', 'AM5', 'DDR5', 'mATX', 1450000],
  B650M: ['B650M', 'AM5', 'DDR5', 'mATX', 2150000],
  B840M: ['B840M', 'AM5', 'DDR5', 'mATX', 1700000],
  B850M: ['B850M', 'AM5', 'DDR5', 'mATX', 2600000],
  X670E: ['X670E', 'AM5', 'DDR5', 'ATX', 6500000],
  X870: ['X870', 'AM5', 'DDR5', 'ATX', 4500000],
  X870E: ['X870E', 'AM5', 'DDR5', 'ATX', 7500000],
  H510M: ['H510M', 'LGA1200', 'DDR4', 'mATX', 950000],
  B560M: ['B560M', 'LGA1200', 'DDR4', 'mATX', 1450000],
  H610M: ['H610M', 'LGA1700', 'DDR4', 'mATX', 1100000],
  B760M: ['B760M', 'LGA1700', 'DDR4', 'mATX', 1950000],
  Z790: ['Z790', 'LGA1700', 'DDR5', 'ATX', 4500000],
  H810M: ['H810M', 'LGA1851', 'DDR5', 'mATX', 1300000],
  B860M: ['B860M', 'LGA1851', 'DDR5', 'mATX', 2200000],
  Z890: ['Z890', 'LGA1851', 'DDR5', 'ATX', 5200000],
};

const asusMobos: Record<string, string[]> = {
  A320M: ['PRIME A320M-K', 'PRIME A320M-A'],
  B450M: ['PRIME B450M-A II', 'TUF GAMING B450M-PRO II', 'ROG STRIX B450M-A'],
  B550M: ['PRIME B550M-A', 'PRIME B550M-K', 'TUF GAMING B550M-PLUS', 'TUF GAMING B550M-PLUS WIFI', 'ROG STRIX B550M-A'],
  A620M: ['PRIME A620M-A', 'TUF GAMING A620M-PLUS'],
  B650M: [
    'PRIME B650M-A',
    'PRIME B650M-A WIFI II',
    'TUF GAMING B650M-PLUS',
    'TUF GAMING B650M-PLUS WIFI',
    'ROG STRIX B650M-E WIFI',
  ],
  B840M: ['PRIME B840M-A WIFI'],
  B850M: ['PRIME B850M-A', 'TUF GAMING B850M-PLUS', 'ROG STRIX B850M-E'],
  X670E: ['TUF GAMING X670E-PLUS', 'ROG STRIX X670E-A', 'ROG STRIX X670E-E', 'ROG CROSSHAIR X670E HERO'],
  X870: ['TUF GAMING X870-PLUS', 'ROG STRIX X870-A'],
  X870E: ['ROG STRIX X870E-A', 'ROG CROSSHAIR X870E HERO'],
  H510M: ['PRIME H510M-A', 'PRIME H510M-E', 'TUF GAMING H510M-PLUS'],
  B560M: ['PRIME B560M-A', 'TUF GAMING B560M-PLUS', 'TUF GAMING B560M-PLUS WIFI', 'ROG STRIX B560M-A'],
  H610M: ['PRIME H610M-A DDR4', 'PRIME H610M-E DDR4', 'TUF GAMING H610M-PLUS'],
  B760M: [
    'PRIME B760M-A DDR4',
    'PRIME B760M-A WIFI',
    'TUF GAMING B760M-PLUS',
    'TUF GAMING B760M-PLUS WIFI II',
    'ROG STRIX B760M-A',
  ],
  Z790: ['PRIME Z790-P', 'TUF GAMING Z790-PLUS', 'ROG STRIX Z790-E', 'ROG MAXIMUS Z790 HERO'],
  H810M: ['PRIME H810M-A'],
  B860M: ['PRIME B860M-A', 'TUF GAMING B860M-PLUS', 'ROG STRIX B860M-E'],
  Z890: ['PRIME Z890-P', 'TUF GAMING Z890-PLUS', 'ROG STRIX Z890-A', 'ROG MAXIMUS Z890 HERO'],
};

const msiMobos: Record<string, string[]> = {
  A320M: ['A320M-A PRO', 'A320M GAMING PRO'],
  B450M: ['B450M-A PRO', 'B450M GAMING PLUS', 'B450M MORTAR MAX', 'B450M BAZOOKA MAX'],
  B550M: ['PRO B550M-P GEN3', 'PRO B550M-VC WIFI', 'MAG B550M MORTAR', 'MAG B550M MORTAR WIFI'],
  A620M: ['PRO A620M-E', 'MAG A620M MORTAR'],
  B650M: ['PRO B650M-P', 'PRO B650M-A WIFI', 'MAG B650M MORTAR WIFI', 'MPG B650M EDGE WIFI'],
  B850M: ['PRO B850M-P', 'MAG B850M MORTAR WIFI'],
  X670E: ['PRO X670E-P', 'MAG X670E TOMAHAWK', 'MPG X670E CARBON', 'MEG X670E ACE'],
  X870: ['MAG X870 TOMAHAWK'],
  X870E: ['MPG X870E CARBON', 'MEG X870E ACE'],
  H510M: ['H510M-A PRO', 'H510M PRO-E'],
  B560M: ['B560M-A PRO', 'B560M PRO-VDH', 'MAG B560M BAZOOKA'],
  H610M: ['H610M-A DDR4', 'H610M-B DDR4', 'PRO H610M-G DDR4'],
  B760M: ['PRO B760M-P DDR4', 'PRO B760M-A WIFI', 'MAG B760M MORTAR WIFI', 'MAG B760M BAZOOKA'],
  Z790: ['PRO Z790-P', 'MAG Z790 TOMAHAWK', 'MPG Z790 EDGE', 'MEG Z790 ACE'],
  H810M: ['H810M-A PRO'],
  B860M: ['PRO B860M-P', 'MAG B860M MORTAR'],
  Z890: ['PRO Z890-P', 'MAG Z890 TOMAHAWK', 'MPG Z890 EDGE', 'MEG Z890 ACE'],
};

const gigabyteMobos: Record<string, string[]> = {
  A320M: ['A320M H', 'A320M S2H'],
  B450M: ['B450M H', 'B450M DS3H', 'B450M AORUS ELITE'],
  B550M: ['B550M H', 'B550M DS3H', 'B550M AORUS PRO-P', 'B550M AORUS ELITE'],
  A620M: ['A620M H', 'A620M DS3H'],
  B650M: ['B650M H', 'B650M GAMING PLUS WIFI', 'B650M AORUS ELITE AX', 'B650M AORUS PRO AX'],
  B840M: ['B840M DS3H'],
  B850M: ['B850M GAMING PLUS', 'B850M AORUS ELITE'],
  X670E: ['X670E GAMING PLUS', 'X670E AORUS PRO', 'X670E AORUS MASTER', 'X670E AORUS XTREME'],
  X870: ['X870 GAMING PLUS', 'X870 AORUS ELITE'],
  X870E: ['X870E AORUS MASTER'],
  H510M: ['H510M H', 'H510M S2H', 'H510M DS2V'],
  B560M: ['B560M H', 'B560M DS3H', 'B560M AORUS PRO'],
  H610M: ['H610M H DDR4', 'H610M S2H DDR4', 'H610M DS3H DDR4'],
  B760M: ['B760M H DDR4', 'B760M DS3H', 'B760M GAMING PLUS', 'B760M AORUS ELITE AX'],
  Z790: ['Z790 H', 'Z790 GAMING X', 'Z790 AORUS ELITE', 'Z790 AORUS MASTER'],
  H810M: ['H810M H'],
  B860M: ['B860M GAMING PLUS', 'B860M AORUS ELITE'],
  Z890: ['Z890 H', 'Z890 GAMING X', 'Z890 AORUS ELITE', 'Z890 AORUS MASTER'],
};

const asrockMobos: Record<string, string[]> = {
  A320M: ['A320M-HDV'],
  B450M: ['B450M-HDV', 'B450M PRO4', 'B450M STEEL LEGEND'],
  B550M: ['B550M-HDV', 'B550M PRO4', 'B550M PG RIPTIDE'],
  A620M: ['A620M-HDV/M.2'],
  B650M: ['B650M-HDV/M.2', 'B650M PRO RS', 'B650M PG RIPTIDE WIFI'],
  B840M: ['B840M PRO RS'],
  B850M: ['B850M PRO RS', 'B850M PG RIPTIDE'],
  X670E: ['X670E PRO RS', 'X670E PG LIGHTNING', 'X670E STEEL LEGEND', 'X670E TAICHI'],
  X870: ['X870 PRO RS'],
  X870E: ['X870E PG RIPTIDE', 'X870E TAICHI'],
  H510M: ['H510M-HDV', 'H510M-HVS'],
  B560M: ['B560M-HDV', 'B560M PRO4', 'B560M STEEL LEGEND'],
  H610M: ['H610M-HDV/M.2', 'H610M-HVS'],
  B760M: ['B760M-HDV/M.2', 'B760M PRO RS', 'B760M PG RIPTIDE'],
  Z790: ['Z790 PRO RS', 'Z790 PG LIGHTNING', 'Z790 STEEL LEGEND', 'Z790 TAICHI'],
  H810M: ['H810M-HDV'],
  B860M: ['B860M PRO RS', 'B860M PG RIPTIDE'],
  Z890: ['Z890 PRO RS', 'Z890 PG LIGHTNING', 'Z890 TAICHI'],
};

const colorfulMobos: Record<string, string[]> = {
  A320M: ['A320M-K PRO V14'],
  B450M: ['Battle-Ax B450M-E PRO V14'],
  B550M: ['Battle-Ax B550M-E PRO V14'],
  B650M: ['Battle-Ax B650M-E Pro V14', 'B650M-PLUS V14'],
  B850M: ['Battle-Ax B850M-E PRO V14'],
  X870E: ['iGame X870E FLOW'],
  H510M: ['H510M-K PRO V14'],
  B560M: ['Battle-Ax B560M-E PRO V14'],
  H610M: ['H610M-K PRO V14'],
  B760M: ['Battle-Ax B760M-E PRO V14'],
  Z790: ['iGame Z790 FLOW'],
  B860M: ['Battle-Ax B860M-E PRO V14'],
  Z890: ['iGame Z890 FLOW'],
};

const moboMap: Record<string, Record<string, string[]>> = {
  ASUS: asusMobos,
  MSI: msiMobos,
  Gigabyte: gigabyteMobos,
  ASRock: asrockMobos,
  Colorful: colorfulMobos,
};

async function main() {
  console.log('Cleaning up old data...');
  await prisma.buildComponent.deleteMany();

  const existingAdmin = await prisma.admin.findUnique({ where: { username: 'admin' } });
  if (!existingAdmin) {
    const hashed = await bcrypt.hash('admin123', 12);
    await prisma.admin.create({ data: { username: 'admin', password: hashed, role: 'superadmin' } });
    console.log('Default admin created: admin / admin123');
  }
  await prisma.hardwareComponent.deleteMany();

  console.log('Seeding real hardware data...');
  const components: any[] = [];

  // ─── CPUs ───
  const cpus: any[] = [
    // Intel LGA1200 & LGA1700
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
      name: 'Intel Core i3-12100',
      brand: 'Intel',
      model: 'i3-12100',
      type: ComponentType.CPU,
      price: 1425000,
      socket: 'LGA1700',
      tdp: 60,
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
      name: 'Intel Core i5-13600K',
      brand: 'Intel',
      model: 'i5-13600K',
      type: ComponentType.CPU,
      price: 4100000,
      socket: 'LGA1700',
      tdp: 125,
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
    // Intel Arrow Lake LGA1851
    {
      name: 'Intel Core Ultra 5 225F',
      brand: 'Intel',
      model: 'CU5-225F',
      type: ComponentType.CPU,
      price: 2100000,
      socket: 'LGA1851',
      tdp: 65,
    },
    {
      name: 'Intel Core Ultra 5 225',
      brand: 'Intel',
      model: 'CU5-225',
      type: ComponentType.CPU,
      price: 2300000,
      socket: 'LGA1851',
      tdp: 65,
    },
    {
      name: 'Intel Core Ultra 5 245K',
      brand: 'Intel',
      model: 'CU5-245K',
      type: ComponentType.CPU,
      price: 3900000,
      socket: 'LGA1851',
      tdp: 125,
    },
    {
      name: 'Intel Core Ultra 5 245KF',
      brand: 'Intel',
      model: 'CU5-245KF',
      type: ComponentType.CPU,
      price: 3700000,
      socket: 'LGA1851',
      tdp: 125,
    },
    {
      name: 'Intel Core Ultra 7 265K',
      brand: 'Intel',
      model: 'CU7-265K',
      type: ComponentType.CPU,
      price: 5200000,
      socket: 'LGA1851',
      tdp: 125,
    },
    {
      name: 'Intel Core Ultra 7 265KF',
      brand: 'Intel',
      model: 'CU7-265KF',
      type: ComponentType.CPU,
      price: 5000000,
      socket: 'LGA1851',
      tdp: 125,
    },
    {
      name: 'Intel Core Ultra 9 285K',
      brand: 'Intel',
      model: 'CU9-285K',
      type: ComponentType.CPU,
      price: 7800000,
      socket: 'LGA1851',
      tdp: 125,
    },
    // AMD AM4
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
    // AMD AM5
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
    {
      name: 'AMD Ryzen 5 9600',
      brand: 'AMD',
      model: 'R5-9600',
      type: ComponentType.CPU,
      price: 2850000,
      socket: 'AM5',
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 5 9600X',
      brand: 'AMD',
      model: 'R5-9600X',
      type: ComponentType.CPU,
      price: 3300000,
      socket: 'AM5',
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 7 9700X',
      brand: 'AMD',
      model: 'R7-9700X',
      type: ComponentType.CPU,
      price: 4600000,
      socket: 'AM5',
      tdp: 65,
    },
    {
      name: 'AMD Ryzen 7 9800X3D',
      brand: 'AMD',
      model: 'R7-9800X3D',
      type: ComponentType.CPU,
      price: 7200000,
      socket: 'AM5',
      tdp: 120,
    },
    {
      name: 'AMD Ryzen 9 9900X',
      brand: 'AMD',
      model: 'R9-9900X',
      type: ComponentType.CPU,
      price: 6500000,
      socket: 'AM5',
      tdp: 120,
    },
  ];
  cpus.forEach((c) => add(components, { ...c, specs: {} }));

  // ─── Motherboards ───
  for (const [chipsetKey, [model, socket, ramType, formFactor, basePrice]] of Object.entries(moboModels)) {
    for (const brand of moboBrands) {
      const models = moboMap[brand]?.[chipsetKey];
      if (!models) continue;
      for (const realModel of models) {
        const priceVariation = Math.floor(basePrice * (0.9 + Math.random() * 0.2));
        add(components, {
          name: `${brand} ${realModel}`,
          brand,
          model: realModel,
          type: ComponentType.MOTHERBOARD,
          price: priceVariation,
          socket,
          ramType,
          formFactor,
        });
      }
    }
  }

  // ─── GPUs (Real AIB Models) ───
  interface GpuEntry {
    chipset: string;
    price: number;
    vram: string;
  }
  const gpuChipsets: GpuEntry[] = [
    { chipset: 'GT 730', price: 850000, vram: '2GB' },
    { chipset: 'GT 1030', price: 1150000, vram: '2GB' },
    { chipset: 'GTX 1050 Ti', price: 1850000, vram: '4GB' },
    { chipset: 'GTX 1650', price: 2150000, vram: '4GB' },
    { chipset: 'GTX 1660 Super', price: 3250000, vram: '6GB' },
    { chipset: 'RTX 3050', price: 3650000, vram: '8GB' },
    { chipset: 'RTX 3060', price: 4250000, vram: '12GB' },
    { chipset: 'RTX 4060', price: 4750000, vram: '8GB' },
    { chipset: 'RTX 4060 Ti 8GB', price: 6500000, vram: '8GB' },
    { chipset: 'RTX 4060 Ti 16GB', price: 7200000, vram: '16GB' },
    { chipset: 'RTX 4070', price: 9500000, vram: '12GB' },
    { chipset: 'RTX 4070 Super', price: 10800000, vram: '12GB' },
    { chipset: 'RTX 4070 Ti Super', price: 14000000, vram: '16GB' },
    { chipset: 'RTX 4080 Super', price: 18500000, vram: '16GB' },
    { chipset: 'RTX 4090', price: 33500000, vram: '24GB' },
    { chipset: 'RTX 5050', price: 3800000, vram: '8GB' },
    { chipset: 'RTX 5060', price: 4800000, vram: '8GB GDDR7' },
    { chipset: 'RTX 5070', price: 9000000, vram: '12GB GDDR7' },
    { chipset: 'RTX 5070 Ti', price: 12500000, vram: '16GB GDDR7' },
    { chipset: 'RTX 5080', price: 17000000, vram: '16GB GDDR7' },
    { chipset: 'RTX 5090', price: 35000000, vram: '32GB GDDR7' },
    { chipset: 'RX 580', price: 1250000, vram: '8GB' },
    { chipset: 'RX 6600', price: 3150000, vram: '8GB' },
    { chipset: 'RX 7600', price: 4450000, vram: '8GB' },
    { chipset: 'RX 7700 XT', price: 6250000, vram: '12GB' },
    { chipset: 'RX 7800 XT', price: 8850000, vram: '16GB' },
    { chipset: 'RX 7900 XT', price: 13500000, vram: '20GB' },
    { chipset: 'RX 7900 XTX', price: 16500000, vram: '24GB' },
    { chipset: 'RX 9060', price: 4100000, vram: '8GB GDDR6' },
    { chipset: 'RX 9070', price: 9500000, vram: '16GB GDDR6' },
    { chipset: 'RX 9070 XT', price: 11000000, vram: '16GB GDDR6' },
  ];

  const nvidiaModels: Record<string, string[]> = {
    ASUS: ['DUAL', 'DUAL OC', 'TUF GAMING', 'TUF GAMING OC', 'ROG STRIX GAMING', 'ROG STRIX GAMING OC'],
    MSI: ['VENTUS 2X', 'VENTUS 3X', 'GAMING X', 'GAMING X SLIM'],
    Gigabyte: ['WINDFORCE', 'GAMING OC', 'AORUS ELITE'],
    Colorful: ['BATTLE-AX', 'iGAME ULTRA', 'iGAME ADVANCED'],
    Zotac: ['TWIN EDGE', 'TRINITY OC'],
    Galax: ['1-CLICK OC', 'EX GAMING'],
    Palit: ['STORMX', 'GAMINGPRO OC'],
  };

  const amdModels: Record<string, string[]> = {
    ASUS: ['DUAL', 'DUAL OC', 'TUF GAMING', 'TUF GAMING OC'],
    MSI: ['MECH 2X', 'GAMING X'],
    Gigabyte: ['WINDFORCE', 'GAMING OC', 'AORUS ELITE'],
    Sapphire: ['PULSE', 'NITRO+'],
    PowerColor: ['FIGHTER', 'HELLHOUND'],
    Colorful: ['BATTLE-AX', 'iGAME ULTRA'],
    ASRock: ['CHALLENGER', 'PHANTOM GAMING'],
  };

  for (const gpu of gpuChipsets) {
    const isNvidia = /^(GT |GTX |RTX )/i.test(gpu.chipset);
    const aiModels = isNvidia ? nvidiaModels : amdModels;
    for (const [brand, models] of Object.entries(aiModels)) {
      for (const modelLine of models) {
        const price = Math.floor(gpu.price * (0.88 + Math.random() * 0.24));
        add(components, {
          name: `${brand} ${gpu.chipset} ${modelLine}`,
          brand,
          model: gpu.chipset,
          type: ComponentType.GPU,
          price,
          specs: { vram: gpu.vram },
        });
      }
    }
  }

  // ─── RAM (Real SKUs) ───
  const rams: any[] = [];
  const ramEntries = [
    ['Corsair Vengeance LPX 8GB DDR4 3200MHz', 'Corsair', 'CMK8GX4M1E3200C16', 320000, 'DDR4'],
    ['Corsair Vengeance LPX 16GB (2x8) DDR4 3200MHz', 'Corsair', 'CMK16GX4M2B3200C16', 650000, 'DDR4'],
    ['Corsair Vengeance LPX 32GB (2x16) DDR4 3600MHz', 'Corsair', 'CMK32GX4M2D3600C18', 1250000, 'DDR4'],
    ['Corsair Vengeance RGB 32GB (2x16) DDR5 6000MHz', 'Corsair', 'CMH32GX5M2B6000C30', 2150000, 'DDR5'],
    ['Corsair Dominator Titanium 32GB (2x16) DDR5 6400MHz', 'Corsair', 'CMP32GX5M2B6400C32', 2800000, 'DDR5'],
    ['G.Skill Ripjaws V 16GB (2x8) DDR4 3200MHz', 'G.Skill', 'F4-3200C16D-16GVGB', 620000, 'DDR4'],
    ['G.Skill Trident Z5 Neo 32GB (2x16) DDR5 6000MHz', 'G.Skill', 'F5-6000J3038F16GX2-TZ5N', 2100000, 'DDR5'],
    ['G.Skill Trident Z5 32GB (2x16) DDR5 6400MHz', 'G.Skill', 'F5-6400J3239G16GX2-TZ5', 2400000, 'DDR5'],
    ['TeamGroup Elite 8GB DDR4 3200MHz', 'Team', 'TED48G3200C2201', 280000, 'DDR4'],
    ['TeamGroup T-Force Delta RGB 16GB (2x8) DDR4 3600MHz', 'Team', 'TF3D416G3600HC18', 850000, 'DDR4'],
    ['TeamGroup T-Force Delta RGB 32GB (2x16) DDR5 6000MHz', 'Team', 'FF3D532G6000HC30', 2000000, 'DDR5'],
    ['Kingston Fury Beast 16GB (2x8) DDR4 3200MHz', 'Kingston', 'KF432C16BB1/8', 630000, 'DDR4'],
    ['Kingston Fury Beast 32GB (2x16) DDR5 5600MHz', 'Kingston', 'KF556C36BBE/16', 1850000, 'DDR5'],
    ['Kingston Fury Renegade 32GB (2x16) DDR5 6400MHz', 'Kingston', 'KF564C32RSE-16', 2600000, 'DDR5'],
    ['Crucial Pro 16GB (2x8) DDR4 3200MHz', 'Crucial', 'CP2K8G4DFRA32A', 600000, 'DDR4'],
    ['Crucial Pro 32GB (2x16) DDR5 5600MHz', 'Crucial', 'CP2K16G56DFRA', 1950000, 'DDR5'],
    ['ADATA XPG Spectrix D35G 16GB (2x8) DDR4 3600MHz', 'ADATA', 'AX4U36008G18I-DTB', 800000, 'DDR4'],
    ['ADATA XPG Lancer DDR5 32GB (2x16) 6000MHz', 'ADATA', 'AX5U6000C3016G-DCLARBK', 2100000, 'DDR5'],
  ];
  ramEntries.forEach(([name, brand, model, price, ramType]) =>
    rams.push({ name, brand, model, price, ramType, type: ComponentType.RAM }),
  );
  rams.forEach((r) => add(components, r));

  // ─── Storage (Real SKUs) ───
  const storages: any[] = [];
  const storageEntries = [
    ['Samsung 870 EVO 250GB SATA SSD', 'Samsung', 'MZ-77E250BW', 480000],
    ['Samsung 870 EVO 500GB SATA SSD', 'Samsung', 'MZ-77E500BW', 850000],
    ['Samsung 870 EVO 1TB SATA SSD', 'Samsung', 'MZ-77E1T0BW', 1550000],
    ['Samsung 980 250GB NVMe Gen3', 'Samsung', 'MZ-V8V250BW', 580000],
    ['Samsung 980 500GB NVMe Gen3', 'Samsung', 'MZ-V8V500BW', 850000],
    ['Samsung 980 1TB NVMe Gen3', 'Samsung', 'MZ-V8V1T0BW', 1450000],
    ['Samsung 990 PRO 1TB NVMe Gen4', 'Samsung', 'MZ-V9P1T0BW', 2150000],
    ['Samsung 990 PRO 2TB NVMe Gen4', 'Samsung', 'MZ-V9P2T0BW', 3800000],
    ['Samsung 9100 PRO 1TB NVMe Gen5', 'Samsung', 'MZ-H9P1T0BW', 3450000],
    ['WD Blue SN580 500GB NVMe Gen4', 'WD', 'WDS500G3B0E', 780000],
    ['WD Blue SN580 1TB NVMe Gen4', 'WD', 'WDS100T3B0E', 1350000],
    ['WD Black SN770 1TB NVMe Gen4', 'WD', 'WDS100T3X0E', 1650000],
    ['WD Black SN850X 1TB NVMe Gen4', 'WD', 'WDS100T2X0E', 2100000],
    ['Kingston NV2 250GB NVMe Gen4', 'Kingston', 'SNV2S/250G', 385000],
    ['Kingston NV2 500GB NVMe Gen4', 'Kingston', 'SNV2S/500G', 580000],
    ['Kingston NV2 1TB NVMe Gen4', 'Kingston', 'SNV2S/1000G', 1050000],
    ['Kingston KC3000 1TB NVMe Gen4', 'Kingston', 'SKC3000S/1024G', 1850000],
    ['Crucial P3 500GB NVMe Gen3', 'Crucial', 'CT500P3SSD8', 650000],
    ['Crucial P3 1TB NVMe Gen3', 'Crucial', 'CT1000P3SSD8', 1150000],
    ['Crucial T500 1TB NVMe Gen4', 'Crucial', 'CT1000T500SSD8', 1950000],
    ['TeamGroup MP44L 1TB NVMe Gen4', 'Team', 'TM8FP4001T0C101', 1200000],
    ['ADATA Legend 850 1TB NVMe Gen4', 'ADATA', 'ALE850-1TCS', 1450000],
  ];
  storageEntries.forEach(([name, brand, model, price]) =>
    storages.push({ name, brand, model, price, type: ComponentType.STORAGE }),
  );
  storages.forEach((s) => add(components, s));

  // ─── PSU (Real Series) ───
  const psus: any[] = [];
  const psuEntries = [
    ['Corsair CV450 450W 80+ Bronze', 'Corsair', 'CP-9020209-NA', 550000, 450],
    ['Corsair CV550 550W 80+ Bronze', 'Corsair', 'CP-9020210-NA', 650000, 550],
    ['Corsair CX650 650W 80+ Bronze', 'Corsair', 'CP-9020278-NA', 950000, 650],
    ['Corsair RM750e 750W 80+ Gold', 'Corsair', 'CP-9020262-NA', 1650000, 750],
    ['Corsair RM850e 850W 80+ Gold', 'Corsair', 'CP-9020263-NA', 1950000, 850],
    ['Corsair RM1000e 1000W 80+ Gold', 'Corsair', 'CP-9020264-NA', 2850000, 1000],
    ['Corsair RM1200x SHIFT 1200W 80+ Gold', 'Corsair', 'CP-9020250-NA', 3800000, 1200],
    ['Seasonic S12III 500W 80+ Bronze', 'Seasonic', 'SSR-500GB3', 620000, 500],
    ['Seasonic Core GC-650 650W 80+ Gold', 'Seasonic', 'GC-650', 1250000, 650],
    ['Seasonic Focus GX-750 750W 80+ Gold', 'Seasonic', 'FOCUS-GX-750', 1750000, 750],
    ['Seasonic Focus GX-850 850W 80+ Gold', 'Seasonic', 'FOCUS-GX-850', 2100000, 850],
    ['Seasonic Vertex GX-1000 1000W 80+ Gold', 'Seasonic', 'VERTEX-GX-1000', 3100000, 1000],
    ['Cooler Master MWE 550W 80+ Bronze', 'Cooler Master', 'MPE-5501-ACABW', 650000, 550],
    ['Cooler Master MWE 650W 80+ Bronze V2', 'Cooler Master', 'MPE-6501-ACABW', 850000, 650],
    ['Cooler Master MWE Gold 750W V2', 'Cooler Master', 'MPE-7501-AFAAG', 1500000, 750],
    ['Cooler Master MWE Gold 850W V2', 'Cooler Master', 'MPE-8501-AFAAG', 1850000, 850],
    ['MSI MAG A550BN 550W 80+ Bronze', 'MSI', '306-007Z-101', 580000, 550],
    ['MSI MAG A650BN 650W 80+ Bronze', 'MSI', '306-007Z-102', 750000, 650],
    ['MSI MPG A750GF 750W 80+ Gold', 'MSI', '306-007Z-201', 1650000, 750],
    ['MSI MPG A850GF 850W 80+ Gold', 'MSI', '306-007Z-202', 2050000, 850],
    ['Gigabyte P550B 550W 80+ Bronze', 'Gigabyte', 'GP-P550B', 600000, 550],
    ['Gigabyte UD750GM 750W 80+ Gold', 'Gigabyte', 'GP-UD750GM', 1450000, 750],
    ['ASUS TUF Gaming 650W 80+ Bronze', 'ASUS', 'TUF-650B', 950000, 650],
    ['ASUS ROG Strix 750W 80+ Gold', 'ASUS', 'ROG-STRIX-750G', 1950000, 750],
    ['ASUS ROG Thor 1000W 80+ Platinum II', 'ASUS', 'ROG-THOR-1000P2', 4200000, 1000],
    ['EVGA 600 BR 600W 80+ Bronze', 'EVGA', '100-BR-0600-K1', 720000, 600],
    ['EVGA SuperNOVA 750 G7 750W 80+ Gold', 'EVGA', '220-G7-0750-X1', 1850000, 750],
  ];
  psuEntries.forEach(([name, brand, model, price, wattage]) =>
    psus.push({ name, brand, model, price, wattage, type: ComponentType.PSU }),
  );
  psus.forEach((p) => add(components, p));

  // ─── Cases (Real Models) ───
  const cases: any[] = [];
  const caseEntries = [
    ['Corsair 4000D Airflow', 'Corsair', 'CC-9011200-WW', 1250000, 'ATX'],
    ['Corsair 3000D Airflow', 'Corsair', 'CC-9011260-WW', 950000, 'ATX'],
    ['Corsair 5000D Airflow', 'Corsair', 'CC-9011210-WW', 1850000, 'ATX'],
    ['Corsair 6500X', 'Corsair', 'CC-9011267-WW', 2800000, 'ATX'],
    ['Corsair iCUE 220T RGB', 'Corsair', 'CC-9011200-WW', 1100000, 'mATX'],
    ['NZXT H5 Flow', 'NZXT', 'CM-H51FB-01', 1350000, 'ATX'],
    ['NZXT H7 Flow', 'NZXT', 'CM-H71FB-01', 1850000, 'ATX'],
    ['NZXT H9 Elite', 'NZXT', 'CM-H91EB-01', 2850000, 'ATX'],
    ['Lian Li LANCOOL 216', 'Lian Li', 'G99.LAN216SW', 1450000, 'ATX'],
    ['Lian Li O11 Dynamic EVO', 'Lian Li', 'G99.O11DEW', 2250000, 'ATX'],
    ['Lian Li DAN A3-mATX', 'Lian Li', 'A3-MATX', 950000, 'mATX'],
    ['Cooler Master MasterBox Q300L', 'Cooler Master', 'MCB-Q300L-KANN-S00', 550000, 'mATX'],
    ['Cooler Master MasterBox MB520', 'Cooler Master', 'MCB-B520-KGNN-S00', 850000, 'ATX'],
    ['Cooler Master MasterBox TD500 Mesh', 'Cooler Master', 'MCB-TD500-KGNN-S00', 1150000, 'ATX'],
    ['Fractal Design Pop Air', 'Fractal', 'FD-C-POA1A-06', 1350000, 'ATX'],
    ['Fractal Design North', 'Fractal', 'FD-C-NOR1C-03', 2200000, 'ATX'],
    ['Fractal Design Meshify 2', 'Fractal', 'FD-C-MES2A-01', 1950000, 'ATX'],
    ['Montech AIR 100 ARGB', 'Montech', 'AIR-100-ARGB', 650000, 'mATX'],
    ['Montech AIR 903 MAX', 'Montech', 'AIR-903-MAX', 950000, 'ATX'],
    ['Montech KING 95 PRO', 'Montech', 'KING-95-PRO', 1650000, 'ATX'],
  ];
  caseEntries.forEach(([name, brand, model, price, formFactor]) =>
    cases.push({ name, brand, model, price, formFactor, type: ComponentType.CASE }),
  );
  cases.forEach((c) => add(components, c));

  // ─── Coolers (Real Models) ───
  const coolers: any[] = [];
  const coolerEntries = [
    ['Deepcool AK400', 'Deepcool', 'R-AK400-BKNNMN-G', 350000],
    ['Deepcool AK500', 'Deepcool', 'R-AK500-BKNNMN-G', 550000],
    ['Deepcool AK620', 'Deepcool', 'R-AK620-BKNNMN-G', 750000],
    ['Deepcool LT520 240mm AIO', 'Deepcool', 'DP-ATX-LT520', 1100000],
    ['Deepcool LT720 360mm AIO', 'Deepcool', 'DP-ATX-LT720', 1650000],
    ['Cooler Master Hyper 212 Halo', 'Cooler Master', 'RR-S4HH-28PA-R1', 450000],
    ['Cooler Master MasterAir MA612 Stealth', 'Cooler Master', 'MAP-D6PN-218PK-R1', 650000],
    ['Cooler Master MasterLiquid 240L Core', 'Cooler Master', 'MLW-D24M-A18PC-Z1', 1050000],
    ['Cooler Master MasterLiquid 360L Core', 'Cooler Master', 'MLW-D36M-A18PC-Z1', 1550000],
    ['Noctua NH-U12S redux', 'Noctua', 'NH-U12S redux', 550000],
    ['Noctua NH-D15', 'Noctua', 'NH-D15', 1350000],
    ['NZXT Kraken 240 RGB', 'NZXT', 'RL-KR240-R1', 1650000],
    ['NZXT Kraken 360 RGB', 'NZXT', 'RL-KR360-R1', 2250000],
    ['Corsair H100x RGB 240mm AIO', 'Corsair', 'CW-9060055-WW', 1250000],
    ['Corsair H150i ELITE 360mm AIO', 'Corsair', 'CW-9060061-WW', 1950000],
    ['Corsair A115', 'Corsair', 'CT-9010008-WW', 850000],
    ['be quiet! Pure Rock 2', 'be quiet!', 'BK030', 450000],
    ['be quiet! Dark Rock Pro 5', 'be quiet!', 'BK047', 1450000],
    ['be quiet! Pure Loop 2 240mm AIO', 'be quiet!', 'BW035', 1350000],
    ['Thermalright Peerless Assassin 120 SE', 'Thermalright', 'PA120-SE', 450000],
    ['Thermalright Phantom Spirit 120', 'Thermalright', 'PS120', 550000],
    ['ID-COOLING SE-214-XT', 'ID-COOLING', 'SE-214-XT', 250000],
    ['ID-COOLING FROSTFLOW X 240 AIO', 'ID-COOLING', 'FROSTFLOW-X-240', 750000],
  ];
  coolerEntries.forEach(([name, brand, model, price]) =>
    coolers.push({ name, brand, model, price, type: ComponentType.COOLER }),
  );
  coolers.forEach((c) => add(components, c));

  // ─── Peripherals ───
  const monitors: any[] = [
    {
      name: 'Samsung Odyssey G3 24" 144Hz',
      brand: 'Samsung',
      model: 'LS24AG304',
      price: 2850000,
      type: ComponentType.MONITOR,
    },
    {
      name: 'Samsung Odyssey G5 27" 165Hz',
      brand: 'Samsung',
      model: 'LS27CG550',
      price: 4200000,
      type: ComponentType.MONITOR,
    },
    {
      name: 'Samsung Odyssey G7 32" 240Hz',
      brand: 'Samsung',
      model: 'LC32G75T',
      price: 7800000,
      type: ComponentType.MONITOR,
    },
    { name: 'LG 24GN600-B 24" 144Hz', brand: 'LG', model: '24GN600-B', price: 2650000, type: ComponentType.MONITOR },
    { name: 'LG 27GP850-B 27" 165Hz', brand: 'LG', model: '27GP850-B', price: 5200000, type: ComponentType.MONITOR },
    {
      name: 'ASUS TUF VG249Q3A 24" 180Hz',
      brand: 'ASUS',
      model: 'VG249Q3A',
      price: 2950000,
      type: ComponentType.MONITOR,
    },
    {
      name: 'ASUS TUF VG27AQ3A 27" 180Hz',
      brand: 'ASUS',
      model: 'VG27AQ3A',
      price: 4500000,
      type: ComponentType.MONITOR,
    },
    { name: 'MSI G244F E2 24" 170Hz', brand: 'MSI', model: 'G244F-E2', price: 2500000, type: ComponentType.MONITOR },
    {
      name: 'MSI G274QPF-QD 27" 170Hz',
      brand: 'MSI',
      model: 'G274QPF-QD',
      price: 4800000,
      type: ComponentType.MONITOR,
    },
    { name: 'AOC 24G4X 24" 180Hz', brand: 'AOC', model: '24G4X', price: 2400000, type: ComponentType.MONITOR },
    { name: 'AOC 27G4X 27" 180Hz', brand: 'AOC', model: '27G4X', price: 3500000, type: ComponentType.MONITOR },
  ];
  monitors.forEach((m) => add(components, m));

  const keyboards: any[] = [
    { name: 'Keychron C1 Pro', brand: 'Keychron', model: 'C1-PRO', price: 550000, type: ComponentType.KEYBOARD },
    { name: 'Keychron V1', brand: 'Keychron', model: 'V1', price: 850000, type: ComponentType.KEYBOARD },
    { name: 'Royal Kludge RK61', brand: 'Royal Kludge', model: 'RK61', price: 350000, type: ComponentType.KEYBOARD },
    { name: 'Royal Kludge RK87', brand: 'Royal Kludge', model: 'RK87', price: 450000, type: ComponentType.KEYBOARD },
    { name: 'Logitech G413 SE', brand: 'Logitech', model: 'G413-SE', price: 750000, type: ComponentType.KEYBOARD },
    { name: 'Logitech G Pro X', brand: 'Logitech', model: 'G-PRO-X', price: 1850000, type: ComponentType.KEYBOARD },
    {
      name: 'Razer Huntsman Mini',
      brand: 'Razer',
      model: 'RZ03-03390100',
      price: 1250000,
      type: ComponentType.KEYBOARD,
    },
    {
      name: 'Razer BlackWidow V4',
      brand: 'Razer',
      model: 'RZ03-04670200',
      price: 1950000,
      type: ComponentType.KEYBOARD,
    },
  ];
  keyboards.forEach((k) => add(components, k));

  const mice: any[] = [
    { name: 'Logitech G102 Lightsync', brand: 'Logitech', model: 'G102', price: 250000, type: ComponentType.MOUSE },
    { name: 'Logitech G304 Lightspeed', brand: 'Logitech', model: 'G304', price: 450000, type: ComponentType.MOUSE },
    {
      name: 'Logitech G Pro X Superlight',
      brand: 'Logitech',
      model: 'G-PRO-X-SL',
      price: 1850000,
      type: ComponentType.MOUSE,
    },
    {
      name: 'Razer DeathAdder Essential',
      brand: 'Razer',
      model: 'RZ01-03850100',
      price: 350000,
      type: ComponentType.MOUSE,
    },
    { name: 'Razer Viper Mini', brand: 'Razer', model: 'RZ01-03450100', price: 380000, type: ComponentType.MOUSE },
    { name: 'Razer Basilisk V3', brand: 'Razer', model: 'RZ01-04000100', price: 950000, type: ComponentType.MOUSE },
    { name: 'Pulsar X2 Mini', brand: 'Pulsar', model: 'X2-MINI', price: 850000, type: ComponentType.MOUSE },
    { name: 'Pulsar Xlite V3', brand: 'Pulsar', model: 'XLITE-V3', price: 950000, type: ComponentType.MOUSE },
  ];
  mice.forEach((m) => add(components, m));

  const headsets: any[] = [
    { name: 'Logitech G335', brand: 'Logitech', model: 'G335', price: 550000, type: ComponentType.HEADSET },
    { name: 'Logitech G Pro X', brand: 'Logitech', model: 'G-PRO-X', price: 1550000, type: ComponentType.HEADSET },
    { name: 'Razer Kraken X', brand: 'Razer', model: 'RZ04-02980100', price: 450000, type: ComponentType.HEADSET },
    {
      name: 'Razer BlackShark V2 X',
      brand: 'Razer',
      model: 'RZ04-04570100',
      price: 650000,
      type: ComponentType.HEADSET,
    },
    {
      name: 'SteelSeries Arctis 3',
      brand: 'SteelSeries',
      model: 'ARCTIS-3',
      price: 750000,
      type: ComponentType.HEADSET,
    },
    {
      name: 'Corsair HS55 Surround',
      brand: 'Corsair',
      model: 'CA-9011244',
      price: 650000,
      type: ComponentType.HEADSET,
    },
  ];
  headsets.forEach((h) => add(components, h));

  const speakers: any[] = [
    { name: 'Logitech Z120', brand: 'Logitech', model: 'Z120', price: 150000, type: ComponentType.SPEAKER },
    { name: 'Logitech Z313', brand: 'Logitech', model: 'Z313', price: 350000, type: ComponentType.SPEAKER },
    { name: 'Logitech G560', brand: 'Logitech', model: 'G560', price: 2500000, type: ComponentType.SPEAKER },
    { name: 'Razer Nommo V2', brand: 'Razer', model: 'RZ05-04230100', price: 2800000, type: ComponentType.SPEAKER },
    { name: 'Creative Pebble V3', brand: 'Creative', model: 'MF1715', price: 350000, type: ComponentType.SPEAKER },
    { name: 'Creative Pebble Plus', brand: 'Creative', model: 'MF1700', price: 450000, type: ComponentType.SPEAKER },
    { name: 'Edifier R1280T', brand: 'Edifier', model: 'R1280T', price: 850000, type: ComponentType.SPEAKER },
    { name: 'Edifier G2000', brand: 'Edifier', model: 'G2000', price: 650000, type: ComponentType.SPEAKER },
  ];
  speakers.forEach((s) => add(components, s));

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
