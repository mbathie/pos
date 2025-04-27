const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {

  const variants = await prisma.variation.findMany({
    include: {
      products: true
    }
  })
  console.log(JSON.stringify(variants, null, 2));
}

run()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });