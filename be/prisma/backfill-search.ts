// Tính lại Destination.searchText cho mọi địa điểm. Chạy sau migration platform_extensions: npm run db:backfill
import { searchTextFor } from "../src/lib/destination-search.js";
import { prisma } from "../src/lib/prisma.js";

export async function backfillSearchText() {
  const destinations = await prisma.destination.findMany({
    select: { id: true, name: true, location: true, address: true, category: { select: { name: true } } },
  });
  for (const destination of destinations) {
    await prisma.destination.update({ where: { id: destination.id }, data: { searchText: searchTextFor(destination) } });
  }
  return destinations.length;
}

if (process.argv[1]?.endsWith("backfill-search.ts")) {
  backfillSearchText()
    .then((count) => console.log(`Updated searchText for ${count} destinations`))
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
