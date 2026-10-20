import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
try {
  const created = await prisma.paymentGateway.upsert({
    where: { key: 'snappay' },
    update: {
      label: 'پرداخت اعتباری (اسنپ‌پی)',
      description: 'پرداخت اقساطی و تقسیم‌بندی بانکی بدون کارت از درگاه اسنپ‌پی.',
      isActive: true,
      isSandbox: true,
      sortOrder: 0,
    },
    create: {
      key: 'snappay',
      label: 'پرداخت اعتباری (اسنپ‌پی)',
      description: 'پرداخت اقساطی و تقسیم‌بندی بانکی بدون کارت از درگاه اسنپ‌پی.',
      isActive: true,
      isSandbox: true,
      sortOrder: 0,
    },
  })
  console.log('created/upserted:', created.key, created.isActive, created.isSandbox)
} catch (error) {
  console.error('ERROR:', error.message)
  process.exit(1)
} finally {
  await prisma.$disconnect()
}
