import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  try {
    const topics = await prisma.trendingTopic.findMany({
      where: { used: false },
    });
    console.log(`Unused topics count: ${topics.length}`);
    if (topics.length > 0) {
      console.log('Unused topics snapshot:', topics.slice(0, 3));
    }

    const videos = await prisma.video.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log('Latest videos:', videos);

    const publishLogs = await prisma.publishLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    console.log('Latest publish logs:', publishLogs);

  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
