import { ManageShell } from "@/components/layout/manage-shell";
import { ADMIN_NAV } from "@/components/layout/nav";

// Khu quản trị: STAFF và ADMIN; mục chỉ dành cho ADMIN bị ẩn với Staff (backend vẫn chặn 403).
export default function AdminLayout() {
  return <ManageShell title="Quản trị" base="/admin" roles={["STAFF", "ADMIN"]} items={ADMIN_NAV} />;
}
