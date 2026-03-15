import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@local.test';
  const adminPassword = 'password123';
  const hash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: hash,
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: adminEmail,
      passwordHash: hash,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Seed: admin created', { id: admin.id, email: admin.email });
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
