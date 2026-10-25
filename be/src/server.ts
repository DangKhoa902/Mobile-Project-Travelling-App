import { app } from "./app.js";
import { env } from "./config/env.js";
import { captureError, flushMonitoring, initMonitoring } from "./lib/monitoring.js";
import { prisma } from "./lib/prisma.js";
import { expireOverdueBookings } from "./services/booking.service.js";
import { dispatchPendingPush } from "./services/push.service.js";

initMonitoring();

const server = app.listen(env.PORT, () => {
  console.log(`API server listening on port ${env.PORT} (${env.NODE_ENV})`);
});

// Mỗi phút hủy booking online quá hạn thanh toán. Chạy trong tiến trình API là đủ cho một instance;
// khi chạy nhiều instance nên tách thành cron job riêng.
const expiryTimer = setInterval(() => {
  expireOverdueBookings().catch((error) => {
    console.error("expireOverdueBookings failed", error);
    captureError(error, { job: "expireOverdueBookings" });
  });
}, 60_000);
expiryTimer.unref();

// Gửi push cho thông báo mới (outbox). Chỉ chạy khi PUSH_ENABLED=true.
const pushTimer = env.PUSH_ENABLED
  ? setInterval(() => {
      dispatchPendingPush().catch((error) => {
        console.error("dispatchPendingPush failed", error);
        captureError(error, { job: "dispatchPendingPush" });
      });
    }, 15_000)
  : undefined;
pushTimer?.unref();

async function shutdown(signal: string): Promise<void> {
  console.log(`${signal} received; shutting down`);
  // Nếu còn kết nối treo quá 10 giây thì thoát cưỡng bức để orchestrator không chờ mãi.
  clearInterval(expiryTimer);
  if (pushTimer) clearInterval(pushTimer);
  setTimeout(() => process.exit(1), 10_000).unref();
  server.close(async () => {
    await flushMonitoring();
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
