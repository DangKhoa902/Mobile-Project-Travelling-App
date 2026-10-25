import { create } from "zustand";

import type { PaymentMethod, QuoteInput } from "@/types/api";

// Nháp đặt chỗ B1–B4: quay lại bước trước không mất lựa chọn. Xóa sau khi tạo booking.
export type BookingDraft = {
  destinationId: number | null;
  packageId: number | null;
  roomTypeId: number | null;
  checkInDate: string | null;
  checkOutDate: string | null;
  guests: number;
  roomsCount: number;
  services: Record<number, number>; // addonServiceId -> số lượng
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  note: string;
  voucherCode: string | null;
  paymentMethod: PaymentMethod;
};

const empty: BookingDraft = {
  destinationId: null,
  packageId: null,
  roomTypeId: null,
  checkInDate: null,
  checkOutDate: null,
  guests: 2,
  roomsCount: 1,
  services: {},
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  note: "",
  voucherCode: null,
  paymentMethod: "ONLINE_MOCK",
};

type DraftState = BookingDraft & {
  startDraft: (input: { destinationId: number; packageId?: number }) => void;
  update: (patch: Partial<BookingDraft>) => void;
  setService: (addonServiceId: number, quantity: number) => void;
  reset: () => void;
};

export const useBookingDraft = create<DraftState>((set, get) => ({
  ...empty,
  // Hợp đồng D2 → B1 (yeu-cau-frontend.md mục 7): giữ ngày / số khách nếu vẫn là địa điểm cũ.
  startDraft({ destinationId, packageId }) {
    const same = get().destinationId === destinationId;
    set({
      ...(same ? {} : { ...empty }),
      destinationId,
      packageId: packageId ?? (same ? get().packageId : null),
      ...(same ? {} : { roomTypeId: null, services: {} }),
    });
  },
  update(patch) {
    set(patch);
  },
  setService(addonServiceId, quantity) {
    const services = { ...get().services };
    if (quantity > 0) services[addonServiceId] = quantity;
    else delete services[addonServiceId];
    set({ services });
  },
  reset() {
    set({ ...empty });
  },
}));

export function draftToQuoteInput(draft: BookingDraft, voucherCode = draft.voucherCode): QuoteInput | null {
  if (!draft.packageId || !draft.roomTypeId || !draft.checkInDate || !draft.checkOutDate) return null;
  return {
    packageId: draft.packageId,
    roomTypeId: draft.roomTypeId,
    checkInDate: draft.checkInDate,
    checkOutDate: draft.checkOutDate,
    guests: draft.guests,
    roomsCount: draft.roomsCount,
    services: Object.entries(draft.services).map(([id, quantity]) => ({ addonServiceId: Number(id), quantity })),
    ...(voucherCode ? { voucherCode } : {}),
  };
}
