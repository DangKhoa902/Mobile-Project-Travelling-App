import { prisma } from "../lib/prisma.js";

const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const userDao = {
  findAll() {
    return prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { id: "asc" },
    });
  },

  findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: publicUserSelect,
    });
  },
};
