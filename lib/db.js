const { PrismaClient } = require('@prisma/client');

let prisma;

const omit = {
  employee: {
    // hash: true, created: true, updated: true
  },
  org: {
    created: true, updated: true
  },
  location: {
    created: true, updated: true
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