import { prisma } from "../lib/prisma.js";

export const bookingDao = {
  findAll() {
    return prisma.booking.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        destination: {
          select: { id: true, name: true, location: true, imageUrl: true },
        },
      },
    });
  },

  findById(id: number) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        destination: {
          select: { id: true, name: true, location: true, imageUrl: true },
        },
      },
    });
  },
};
