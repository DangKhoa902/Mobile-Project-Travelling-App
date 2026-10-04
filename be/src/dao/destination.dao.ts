import { prisma } from "../lib/prisma.js";

const destinationSelect = {
  id: true,
  name: true,
  description: true,
  location: true,
  imageUrl: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const destinationDao = {
  findAll() {
    return prisma.destination.findMany({
      select: destinationSelect,
      orderBy: { createdAt: "desc" },
    });
  },

  findById(id: number) {
    return prisma.destination.findUnique({
      where: { id },
      select: destinationSelect,
    });
  },
};
