import type { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";

// Không bao giờ select password ra ngoài API.
export const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  emailVerifiedAt: true,
  phone: true,
  dateOfBirth: true,
  avatarUrl: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const satisfies Prisma.UserSelect;

export const userDao = {
  findMany(where: Prisma.UserWhereInput, skip: number, take: number) {
    return prisma.$transaction([
      prisma.user.findMany({ where, select: publicUserSelect, orderBy: { id: "asc" }, skip, take }),
      prisma.user.count({ where }),
    ]);
  },

  findById(id: number) {
    return prisma.user.findUnique({
      where: { id },
      select: { ...publicUserSelect, _count: { select: { bookings: true, reviews: true } } },
    });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: publicUserSelect,
    });
  },

  // Chỉ dùng nội bộ cho đăng nhập/đổi mật khẩu.
  findCredentialsByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: { ...publicUserSelect, password: true } });
  },

  // Đăng nhập Google: tìm theo "sub" đã liên kết hoặc theo email.
  findForGoogle(googleId: string, email: string) {
    const select = { ...publicUserSelect, googleId: true } as const;
    return prisma.$transaction([
      prisma.user.findUnique({ where: { googleId }, select }),
      prisma.user.findUnique({ where: { email }, select }),
    ]);
  },

  findCredentialsById(id: number) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, password: true } });
  },

  create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data, select: publicUserSelect });
  },

  update(id: number, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data, select: publicUserSelect });
  },
};
