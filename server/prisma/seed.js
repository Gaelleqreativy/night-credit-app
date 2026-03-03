const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Establishments
  const etab1 = await prisma.establishment.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Club Étoile', address: 'Rue de la Paix, Paris' },
  })
  const etab2 = await prisma.establishment.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'Le Palace', address: 'Avenue des Champs, Paris' },
  })
  const etab3 = await prisma.establishment.upsert({
    where: { id: 3 },
    update: {},
    create: { name: 'Night Lounge', address: 'Boulevard Victor Hugo, Lyon' },
  })

  // Admin user
  const hashedPassword = await bcrypt.hash('admin1234', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@spirittab.com' },
    update: {},
    create: {
      email: 'admin@spirittab.com',
      password: hashedPassword,
      name: 'Administrateur',
      role: 'ADMIN',
      establishments: {
        create: [
          { establishmentId: etab1.id },
          { establishmentId: etab2.id },
          { establishmentId: etab3.id },
        ],
      },
    },
  })

  // Comptable user
  const hashedPassword2 = await bcrypt.hash('comptable1234', 10)
  await prisma.user.upsert({
    where: { email: 'comptable@spirittab.com' },
    update: {},
    create: {
      email: 'comptable@spirittab.com',
      password: hashedPassword2,
      name: 'Marie Dupont',
      role: 'COMPTABLE',
      establishments: {
        create: [{ establishmentId: etab1.id }],
      },
    },
  })

  console.log('✅ Seed terminé !')
  console.log('   Admin    : admin@spirittab.com / admin1234')
  console.log('   Comptable: comptable@spirittab.com / comptable1234')
  console.log('   3 établissements créés')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
