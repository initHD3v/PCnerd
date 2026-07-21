import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const libsqlConfig = { url: process.env.DATABASE_URL || 'file:./dev.db' };

const adapter = new PrismaLibSql(libsqlConfig);

export const prisma = new PrismaClient({ adapter });
