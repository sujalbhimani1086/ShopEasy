import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error("DATABASE_URL must be configured to connect to SQL Server.");
}

const adapter = new PrismaMssql(databaseUrl);

export const prisma = new PrismaClient({
    adapter,
});
