const { PrismaClient } = require('@prisma/client');

let prisma;

const omit = {
  employee: {
    // hash: true, createdAt: true, updatedAt: true
  },
  org: {
    createdAt: true, updatedAt: true
  },
  location: {
    createdAt: true, updatedAt: true
  }
}

if (process.env.NODE_ENV !== 'production') {
  if (!global.prisma) {
    global.prisma = new PrismaClient({omit})
  }
  prisma = global.prisma;
} else {
  prisma = new PrismaClient({omit})
}

module.exports = prisma;