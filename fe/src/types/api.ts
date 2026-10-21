// Kiểu dữ liệu khớp với response của backend (be/src/routes).

export type Role = "USER" | "STAFF" | "ADMIN";
export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "ONLINE_MOCK" | "PAY_AT_PROPERTY";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "FAILED";

export type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type User = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  role: Role;
  status: "ACTIVE" | "LOCKED";
};

export type AuthResult = { user: User; token: string };

export type Category = { id: number; name: string; slug: string; iconName: string | null };

export type DestinationSummary = {
  id: number;
  name: string;
  slug: string;
  location: string;
  imageUrl: string | null;
  minPrice: number;
  averageRating: number;
  reviewCount: number;
  isFeatured: boolean;
  category: Pick<Category, "id" | "name" | "slug"> | null;
};

export type TravelPackage = {
  id: number;
  name: string;
  description: string | null;
  inclusions: string[] | null;
  durationDays: number;
  durationNights: number;
  price: number;
  freeCancellationHours: number;
};

export type RoomType = {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  pricePerNight: number;
  totalRooms: number;
};

export type AddonService = {
  id: number;
  name: string;
  price: number;
  pricingUnit: "PER_BOOKING" | "PER_GUEST" | "PER_NIGHT";
};

export type Review = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: number; name: string; avatarUrl: string | null };
};

export type DestinationDetail = DestinationSummary & {
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  policy: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  images: { id: number; url: string }[];
  facilities: { id: number; name: string; iconName: string | null }[];
  packages: TravelPackage[];
  roomTypes: RoomType[];
  services: AddonService[];
  latestReviews: Review[];
  isFavorite: boolean;
};

export type BookingSummary = {
  id: number;
  code: string;
  status: BookingStatus;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: number;
  roomsCount: number;
  totalAmount: number;
  createdAt: string;
  destination: Pick<DestinationSummary, "id" | "name" | "slug" | "location" | "imageUrl">;
  package: { id: number; name: string };
  roomType: { id: number; name: string };
  payment: { method: PaymentMethod; status: PaymentStatus; paidAt: string | null } | null;
  review: { id: number; rating: number; status: string } | null;
};

export type AppNotification = {
  id: number;
  type: "BOOKING" | "PAYMENT" | "SUPPORT" | "REVIEW" | "SYSTEM";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};
