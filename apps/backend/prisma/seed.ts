import {
  PrismaClient,
  Role,
  RoomMemberRole,
  MatchSource,
  MatchStatus,
  UserStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await hash('Admin12345', 12);
  const userPasswordHash = await hash('Usuario12345', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {
      passwordHash: adminPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    create: {
      name: 'Administrador',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'usuario@example.com' },
    update: {
      passwordHash: userPasswordHash,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
    create: {
      name: 'Usuario Demo',
      email: 'usuario@example.com',
      passwordHash: userPasswordHash,
      role: Role.USER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });

  const peru = await prisma.team.upsert({
    where: { externalId: 900001 },
    update: {},
    create: {
      externalId: 900001,
      name: 'Peru',
      shortName: 'PER',
    },
  });

  const argentina = await prisma.team.upsert({
    where: { externalId: 900002 },
    update: {},
    create: {
      externalId: 900002,
      name: 'Argentina',
      shortName: 'ARG',
    },
  });

  await prisma.match.upsert({
    where: { externalId: 990001 },
    update: {},
    create: {
      externalId: 990001,
      homeTeamId: peru.id,
      awayTeamId: argentina.id,
      utcDate: new Date('2026-06-11T20:00:00.000Z'),
      status: MatchStatus.SCHEDULED,
      source: MatchSource.SEED,
    },
  });

  const room = await prisma.room.upsert({
    where: { code: 'DEMO2026' },
    update: {},
    create: {
      name: 'Sala Demo Mundial',
      description: 'Sala inicial para probar predicciones, integrantes y podio.',
      color: '#1457d9',
      code: 'DEMO2026',
      ownerId: user.id,
    },
  });

  await prisma.roomMember.upsert({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      roomId: room.id,
      userId: user.id,
      role: RoomMemberRole.OWNER,
    },
  });

  await prisma.roomMember.upsert({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      roomId: room.id,
      userId: admin.id,
      role: RoomMemberRole.MEMBER,
    },
  });

  await prisma.invitation.upsert({
    where: { code: 'INV-DEMO2026' },
    update: {},
    create: {
      roomId: room.id,
      code: 'INV-DEMO2026',
      expiresAt: new Date('2026-12-31T23:59:59.000Z'),
      createdById: user.id,
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
