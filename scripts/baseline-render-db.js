const { execFileSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const migrationName = '20260627002500_init_postgresql';
const expectedTables = [
  'User',
  'Category',
  'Product',
  'ProductVariant',
  'Review',
  'Cart',
  'CartItem',
  'Order',
  'OrderItem',
];

async function tableExists(tableName) {
  const rows = await prisma.$queryRaw`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = ${tableName}
    LIMIT 1
  `;
  return rows.length > 0;
}

async function main() {
  const hasMigrationsTable = await tableExists('_prisma_migrations');
  if (hasMigrationsTable) {
    console.log('Prisma migrations table exists; skipping baseline.');
    return;
  }

  const existingTables = [];
  for (const table of expectedTables) {
    if (await tableExists(table)) existingTables.push(table);
  }

  if (existingTables.length === 0) {
    console.log('Database is empty; migrations will create the schema.');
    return;
  }

  if (existingTables.length !== expectedTables.length) {
    throw new Error(
      `Database is not empty but only ${existingTables.length}/${expectedTables.length} expected tables exist. ` +
      `Refusing to baseline automatically. Existing tables: ${existingTables.join(', ')}`
    );
  }

  console.log(`Existing Render schema detected; baselining migration ${migrationName}.`);
  execFileSync(
    'npx',
    ['prisma', 'migrate', 'resolve', '--applied', migrationName],
    { stdio: 'inherit' },
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
