import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
try {
  const rows = await prisma.paymentGateway.findMany({
    orderBy: { sortOrder: 'asc' },
  })
  console.log('count:', rows.length)
  for (const row of rows) {
    console.log(row.key, '| isActive:', row.isActive, '| sandbox:', row.isSandbox, '| label:', row.label)
  }
} catch (error) {
  console.error('ERROR:', error.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
