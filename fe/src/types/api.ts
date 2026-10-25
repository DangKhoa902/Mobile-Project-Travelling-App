// Kiểu dữ liệu khớp với response thật của backend (be/src/routes). Ngày giờ là chuỗi ISO.

export type Role = "USER" | "OWNER" | "STAFF" | "ADMIN";
export type UserStatus = "ACTIVE" | "LOCKED";
export type BookingStatus = "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type PaymentMethod = "ONLINE_MOCK" | "PAY_AT_PROPERTY";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
export type PaymentChannel = "CARD" | "EWALLET" | "BANK_TRANSFER";
export type ListingStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED";
export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";
export type PartnerStatus = "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type PayoutStatus = "PENDING" | "PAID" | "CANCELLED";
export type PricingUnit = "PER_BOOKING" | "PER_GUEST" | "PER_NIGHT";
export type NotificationType = "BOOKING" | "PAYMENT" | "SUPPORT" | "REVIEW" | "SYSTEM" | "PARTNER" | "LISTING" | "PAYOUT";

export type PageMeta = { page: number; limit: number; total: number; totalPages: number };
export type Paginated<T> = { data: T[]; meta: PageMeta };

export type User = {
  id: number;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
  _count?: { bookings: number; reviews: number };
};

export type Session = {
  user?: User;
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  sessionId: number;
  devVerificationToken?: string;
};

export type LoginSession = {
  id: number;
  deviceName: string | null;
  userAgent: string | null;
  ip: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string;
};

export type Category = { id: number; name: string; slug: string; iconName: string | null; _count?: { destinations: number } };
export type Facility = { id: number; name: string; iconName: string | null };

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
  isActive: boolean;
  listingStatus: ListingStatus;
  ownerId: number | null;
  category: Pick<Category, "id" | "name" | "slug"> | null;
};

export type TravelPackage = {
  id: number;
  destinationId: number;
  name: string;
  description: string | null;
  inclusions: string[] | null;
  durationDays: number;
  durationNights: number;
  price: number;
  freeCancellationHours: number;
  isActive: boolean;
};

export type RoomRate = { id: number; roomTypeId: number; name: string; startDate: string; endDate: string; pricePerNight: number };

export type RoomType = {
  id: number;
  destinationId: number;
  name: string;
  description: string | null;
  capacity: number;
  pricePerNight: number;
  totalRooms: number;
  isActive: boolean;
  rates?: RoomRate[];
};

export type AddonService = {
  id: number;
  destinationId: number;
  name: string;
  description: string | null;
  price: number;
  pricingUnit: PricingUnit;
  isActive: boolean;
};

export type ReviewImage = { id: number; url: string };

export type PublicReview = {
  id: number;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: { id: number; name: string; avatarUrl: string | null };
  images: ReviewImage[];
};

export type DestinationDetail = DestinationSummary & {
  description: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  policy: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  categoryId: number | null;
  listingRejectReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  images: { id: number; url: string; sortOrder: number }[];
  facilities: Facility[];
  packages: TravelPackage[];
  roomTypes: RoomType[];
  services: AddonService[];
  latestReviews?: PublicReview[];
  isFavorite?: boolean;
};

export type ManagedDestination = DestinationSummary & {
  listingRejectReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  owner: { id: number; name: string; partnerProfile: { businessName: string } | null } | null;
  _count: { bookings: number; packages: number; roomTypes: number };
};

export type ManagedDestinationDetail = DestinationDetail & {
  owner: { id: number; name: string; email: string; partnerProfile: { businessName: string } | null } | null;
  _count: { bookings: number; favorites: number };
};

export type Availability = { nights: number; availableRooms: number; isAvailable: boolean };

export type QuoteInput = {
  packageId: number;
  roomTypeId: number;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  roomsCount: number;
  services: { addonServiceId: number; quantity: number }[];
  voucherCode?: string;
};

export type Quote = {
  destination: { id: number; name: string; slug: string; imageUrl: string | null; location: string };
  package: { id: number; name: string; durationDays: number; durationNights: number };
  roomType: { id: number; name: string; capacity: number; pricePerNight: number };
  services: { id: number; name: string; price: number; pricingUnit: PricingUnit; quantity: number; totalPrice: number }[];
  nights: number;
  nightlyRoomPrices: { date: string; price: number; rateName: string | null }[];
  guests: number;
  roomsCount: number;
  availableRooms: number;
  isAvailable: boolean;
  taxRate: number;
  price: {
    packagePrice: number;
    roomPrice: number;
    servicesPrice: number;
    services: { addonServiceId: number; quantity: number; unitPrice: number; totalPrice: number }[];
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    totalAmount: number;
  };
  voucherCode?: string;
};

export type CreateBookingInput = QuoteInput & {
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  note?: string;
  paymentMethod: PaymentMethod;
};

export type Booking = {
  id: number;
  code: string;
  status: BookingStatus;
  userId: number;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guests: number;
  roomsCount: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  note: string | null;
  packagePrice: number;
  roomPrice: number;
  servicesPrice: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  commissionRate: number;
  commissionAmount: number;
  ownerRevenue: number;
  paymentDueAt: string | null;
  confirmedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  destination: { id: number; name: string; slug: string; location: string; imageUrl: string | null; ownerId: number | null };
  package: { id: number; name: string; durationDays?: number; durationNights?: number; freeCancellationHours?: number };
  roomType: { id: number; name: string; capacity?: number };
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    channel?: PaymentChannel | null;
    paidAt: string | null;
    refundedAt?: string | null;
    transactionRef?: string | null;
  } | null;
  review: { id: number; rating: number; status: ReviewStatus } | null;
};

export type BookingDetail = Booking & {
  user: { id: number; name: string; email: string; phone: string | null };
  voucher: { id: number; code: string } | null;
  services: { id: number; quantity: number; unitPrice: number; totalPrice: number; addonService: { id: number; name: string; pricingUnit: PricingUnit } }[];
};

export type MyReview = {
  id: number;
  bookingId: number;
  destinationId: number;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  rejectReason: string | null;
  createdAt: string;
  destination: { id: number; name: string; slug: string; imageUrl: string | null };
  images: ReviewImage[];
};

export type ModerationReview = Omit<MyReview, "destination"> & {
  user: { id: number; name: string; email: string };
  destination: { id: number; name: string };
};

export type AppNotification = {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  data: NotificationData | null;
  isRead: boolean;
  createdAt: string;
};

export type NotificationData = {
  bookingId?: number;
  conversationId?: number;
  destinationId?: number;
  reviewId?: number;
  partnerProfileId?: number;
  payoutId?: number;
};

export type Message = {
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  readAt: string | null;
  createdAt: string;
  sender?: { id: number; name: string; role: Role; avatarUrl: string | null };
};

export type Conversation = {
  id: number;
  customerId: number;
  staffId: number | null;
  bookingId: number | null;
  subject: string;
  status: "OPEN" | "CLOSED";
  lastMessageAt: string;
  createdAt: string;
  customer: { id: number; name: string; avatarUrl: string | null };
  staff: { id: number; name: string; avatarUrl: string | null } | null;
  messages: Message[];
};

export type PartnerProfile = {
  id: number;
  userId: number;
  businessName: string;
  taxCode: string | null;
  businessAddress: string;
  contactPhone: string;
  description: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  status: PartnerStatus;
  commissionRate: number;
  rejectReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

export type AdminPartner = PartnerProfile & {
  user: { id: number; name: string; email: string; phone: string | null; role: Role; status: UserStatus; _count: { ownedDestinations: number } };
  reviewedBy: { id: number; name: string } | null;
};

export type PartnerInput = {
  businessName: string;
  businessAddress: string;
  contactPhone: string;
  taxCode?: string;
  description?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
};

export type StatsOverview = {
  scope: "PLATFORM" | "OWNER";
  range: { from: string; to: string; days: number };
  summary: {
    grossBookingValue: number;
    platformRevenue: number;
    ownerRevenue: number;
    discountGiven: number;
    totalBookings: number;
    confirmedBookings: number;
    cancellationRate: number;
    averageBookingValue: number;
    roomNightsSold: number;
  };
  bookingsByStatus: Record<BookingStatus, number>;
  revenueByDay: { date: string; bookings: number; grossBookingValue: number; commission: number; ownerRevenue: number }[];
  topDestinations: { id: number; name: string; location?: string; averageRating?: number; reviewCount?: number; bookings: number; grossBookingValue: number; commission: number }[];
  paymentMethods: { method: PaymentMethod; count: number; amount: number }[];
  users?: { newUsers: number; totalUsers: number; activeOwners: number };
  listings?: Record<ListingStatus, number>;
  rating?: { average: number; reviews: number };
  pending: {
    partnerApplications?: number;
    listingsToReview?: number;
    reviewsToModerate?: number;
    bookingsToConfirm: number;
    openConversations?: number;
    upcomingCheckIns?: number;
  };
  payouts?: { unsettledAmount: number; unsettledBookings: number; pendingPayoutAmount: number; pendingPayouts: number };
};

export type Payout = {
  id: number;
  ownerId: number;
  periodStart: string;
  periodEnd: string;
  bookingCount: number;
  grossAmount: number;
  commissionAmount: number;
  amount: number;
  status: PayoutStatus;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  transferRef: string | null;
  note: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  owner: { id: number; name: string; email?: string; partnerProfile: { businessName: string } | null };
};

export type PayoutDetail = Payout & {
  bookings: {
    id: number;
    code: string;
    checkInDate: string;
    checkOutDate: string;
    completedAt: string | null;
    totalAmount: number;
    commissionRate: number;
    commissionAmount: number;
    ownerRevenue: number;
    destination: { id: number; name: string };
  }[];
};

export type Unsettled = { bookingCount: number; grossAmount: number; commissionAmount: number; amount: number };

export type PayoutPreviewRow = Unsettled & { ownerId: number; businessName: string; hasBankAccount: boolean };

export type Voucher = {
  id: number;
  code: string;
  description: string | null;
  discountType: "PERCENT" | "FIXED";
  value: number;
  maxDiscount: number | null;
  minOrderValue: number;
  usageLimit: number | null;
  usedCount: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

export type AuditLog = {
  id: number;
  actorId: number | null;
  action: string;
  entity: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: { id: number; name: string; email: string; role: Role } | null;
};

export type Upload = { id: number; url: string; mimeType: string; size: number };
