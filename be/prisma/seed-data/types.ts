// Kiểu dữ liệu mẫu dùng chung cho seed.ts và các file trong seed-data/.
export type SeedPackage = {
  name: string;
  durationDays: number;
  durationNights: number;
  price: number;
  inclusions: string[];
  freeCancellationHours?: number;
};
export type SeedRoomType = { name: string; capacity: number; pricePerNight: number; totalRooms: number };
export type SeedService = { name: string; price: number; pricingUnit: "PER_BOOKING" | "PER_GUEST" | "PER_NIGHT" };

export type SeedDestination = {
  name: string;
  slug: string;
  category: string;
  location: string;
  address: string;
  latitude: number;
  longitude: number;
  description: string;
  isFeatured: boolean;
  facilities: string[];
  packages: SeedPackage[];
  roomTypes: SeedRoomType[];
  services: SeedService[];
  // Email chủ địa điểm (đối tác); không có = sàn tự quản lý.
  owner?: string;
};
