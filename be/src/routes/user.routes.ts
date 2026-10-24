import { Router } from "express";
import { z } from "zod";
import { bookingDao } from "../dao/booking.dao.js";
import { userDao } from "../dao/user.dao.js";
import { badRequest, notFound } from "../lib/http-error.js";
import { idParamSchema, paginated, paginationSchema, toSkipTake } from "../lib/pagination.js";
import { authenticate, currentUser, requireRole } from "../middlewares/auth.js";
import { audit, requestIp } from "../services/audit.service.js";
import { revokeAllSessions } from "../services/session.service.js";

// Quản lý người dùng: chỉ dành cho STAFF/ADMIN (danh sách trước đây công khai cho mọi người).
export const userRouter = Router();

userRouter.use(authenticate, requireRole("STAFF", "ADMIN"));

const listUsersSchema = paginationSchema.extend({
  q: z.string().trim().optional(),
  role: z.enum(["USER", "OWNER", "STAFF", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "LOCKED"]).optional(),
});

userRouter.get("/", async (request, response) => {
  const query = listUsersSchema.parse(request.query);
  const where = {
    ...(query.role ? { role: query.role } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.q ? { OR: [{ name: { contains: query.q } }, { email: { contains: query.q } }] } : {}),
  };
  const { skip, take } = toSkipTake(query);
  const [data, total] = await userDao.findMany(where, skip, take);
  response.json(paginated(data, total, query));
});

userRouter.get("/:id", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const user = await userDao.findById(id);
  if (!user) throw notFound("User");
  response.json({ data: user });
});

userRouter.get("/:id/bookings", async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const query = paginationSchema.parse(request.query);
  const { skip, take } = toSkipTake(query);
  const [data, total] = await bookingDao.findMany({ userId: id }, skip, take);
  response.json(paginated(data, total, query));
});

userRouter.patch("/:id/status", requireRole("ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const { status } = z.object({ status: z.enum(["ACTIVE", "LOCKED"]) }).parse(request.body);
  if (id === currentUser(request).id) throw badRequest("Không thể tự khóa tài khoản của mình");
  const before = await userDao.findById(id);
  if (!before) throw notFound("User");
  const data = await userDao.update(id, { status });
  // Khóa tài khoản thì thu hồi mọi phiên để không làm mới được token nữa.
  if (status === "LOCKED") await revokeAllSessions(id);
  await audit({ actorId: currentUser(request).id, action: status === "LOCKED" ? "user.lock" : "user.unlock", entity: "User", entityId: id, before: { status: before.status }, after: { status }, ip: requestIp(request) });
  response.json({ data });
});

userRouter.patch("/:id/role", requireRole("ADMIN"), async (request, response) => {
  const { id } = idParamSchema.parse(request.params);
  const { role } = z.object({ role: z.enum(["USER", "STAFF", "ADMIN"]) }).parse(request.body);
  if (id === currentUser(request).id) throw badRequest("Không thể tự đổi quyền của mình");
  // Quyền OWNER gắn với hồ sơ đối tác; cấp/thu hồi qua /api/partners để dữ liệu không lệch nhau.
  const target = await userDao.findById(id);
  if (!target) throw notFound("User");
  if (target.role === "OWNER") throw badRequest("Đổi quyền chủ địa điểm qua quản lý đối tác", "USE_PARTNER_API");
  const data = await userDao.update(id, { role });
  await audit({ actorId: currentUser(request).id, action: "user.role_change", entity: "User", entityId: id, before: { role: target.role }, after: { role }, ip: requestIp(request) });
  response.json({ data });
});
