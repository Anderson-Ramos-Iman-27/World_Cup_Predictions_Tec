const { PrismaClient, Role, UserStatus } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  if (process.env.BOOTSTRAP_ADMIN !== 'true') {
    return;
  }

  const passwordHash = await hash('Admin@Pr3dictions', 12);

  await prisma.user.upsert({
    where: { email: 'admin@worldcuppre.com' },
    update: {
      name: 'Administrador',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    create: {
      id: 'admin_manual_001',
      name: 'Administrador',
      email: 'admin@worldcuppre.com',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
