import { ManageShell } from "@/components/layout/manage-shell";
import { OWNER_NAV } from "@/components/layout/nav";

// Khu chủ địa điểm: chỉ role OWNER; chưa đăng nhập → A1, sai vai trò → T5.
export default function OwnerLayout() {
  return <ManageShell title="Quản lý cơ sở" base="/owner" roles={["OWNER"]} items={OWNER_NAV} />;
}
