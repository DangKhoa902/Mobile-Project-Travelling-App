import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { router, useLocalSearchParams, usePathname } from "expo-router";
import { useState } from "react";
import { Linking, Platform, Pressable, ScrollView, Share, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ReviewItem } from "@/components/explore/review-item";
import { loginHref } from "@/components/layout/require-auth";
import { Button, IconButton } from "@/components/ui/button";
import { Banner, Card, SectionTitle } from "@/components/ui/card";
import { Stars } from "@/components/ui/choice";
import { goBack } from "@/components/ui/screen";
import { StateView } from "@/components/ui/state-view";
import { Colors } from "@/constants/theme";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { ApiError, errorMessage } from "@/services/api/client";
import { useDestination, useToggleFavorite } from "@/services/destination.service";
import { useAuthStore } from "@/store/auth-store";
import { useBookingDraft } from "@/store/booking-draft-store";
import { toast } from "@/store/toast-store";
import type { DestinationDetail, TravelPackage } from "@/types/api";
import { formatDate, formatVnd, LISTING_STATUS_LABEL, PRICING_UNIT_LABEL } from "@/utils/format";

// D2 – Chi tiết địa điểm: mọi thông tin để khách quyết định đặt; thanh đáy "Đặt ngay".
export default function DestinationScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const query = useDestination(slug);

  if (query.isPending) return <SafeAreaView className="flex-1 bg-surface"><StateView kind="loading" /></SafeAreaView>;
  if (query.isError || !query.data) {
    const notFound = query.error instanceof ApiError && query.error.status === 404;
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <IconButton icon="arrow-back" label="Quay lại" onPress={() => goBack("/")} />
        {notFound ? (
          <StateView kind="empty" icon="map-outline" message="Địa điểm không tồn tại hoặc đã ngừng hoạt động" action={{ label: "Về trang chủ", onPress: () => router.replace("/") }} />
        ) : (
          <StateView kind="error" error={query.error} onRetry={() => void query.refetch()} />
        )}
      </SafeAreaView>
    );
  }
  return <DestinationView destination={query.data} />;
}

function DestinationView({ destination }: { destination: DestinationDetail }) {
  const { isLg, width } = useBreakpoint();
  const authed = useAuthStore((state) => state.status === "authenticated");
  const pathname = usePathname();
  const startDraft = useBookingDraft((state) => state.startDraft);
  const toggle = useToggleFavorite();
  const [favorite, setFavorite] = useState(Boolean(destination.isFavorite));
  const [expanded, setExpanded] = useState(false);

  // Dữ liệu tải lại (đổi người dùng) thì đồng bộ ♥ theo server.
  const [syncedFavorite, setSyncedFavorite] = useState(destination.isFavorite);
  if (syncedFavorite !== destination.isFavorite) {
    setSyncedFavorite(destination.isFavorite);
    setFavorite(Boolean(destination.isFavorite));
  }

  const packages = destination.packages.filter((item) => item.isActive);
  const rooms = destination.roomTypes.filter((item) => item.isActive);
  const services = destination.services.filter((item) => item.isActive);
  const images = destination.images.length ? destination.images.map((image) => image.url) : destination.imageUrl ? [destination.imageUrl] : [];
  const cheapest = [...packages].sort((a, b) => a.price - b.price)[0];
  const bookable = destination.listingStatus === "APPROVED" && destination.isActive && packages.length > 0 && rooms.length > 0;

  // ♥ đổi ngay khi chạm (optimistic), lỗi thì hoàn tác. Chưa đăng nhập → A1 rồi quay lại.
  function onFavorite() {
    if (!authed) return router.push(loginHref(pathname));
    const next = !favorite;
    setFavorite(next);
    toggle.mutate(destination.id, {
      onSuccess: (result) => setFavorite(result.isFavorite),
      onError: (error) => {
        setFavorite(!next);
        toast.error(errorMessage(error));
      },
    });
  }

  async function onShare() {
    const url = Platform.OS === "web" ? globalThis.location?.href : `travellingapp://destinations/${destination.slug}`;
    try {
      if (Platform.OS === "web" && !(globalThis.navigator as Navigator | undefined)?.share) {
        await Clipboard.setStringAsync(url ?? destination.name);
        toast.success("Đã sao chép link");
      } else {
        await Share.share({ message: `${destination.name} – ${url}`, url });
      }
    } catch {}
  }

  function book(pkg?: TravelPackage) {
    startDraft({ destinationId: destination.id, packageId: (pkg ?? cheapest)?.id });
    router.push("/booking/options");
  }

  const openMap = () => {
    const query = destination.latitude && destination.longitude ? `${destination.latitude},${destination.longitude}` : encodeURIComponent(destination.address ?? destination.name);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const gallery = (
    <View>
      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} className={isLg ? "rounded-2xl" : ""}>
        {(images.length ? images : [null]).map((url, index) => (
          <Image
            key={url ?? index}
            source={url ?? undefined}
            style={{ width: isLg ? Math.min(width - 420, 760) : width, aspectRatio: 16 / 10, backgroundColor: Colors.brandSoft }}
            contentFit="cover"
            accessibilityLabel={`Ảnh ${index + 1} của ${destination.name}`}
          />
        ))}
      </ScrollView>
      <SafeAreaView edges={["top"]} className="absolute inset-x-0 top-0 flex-row justify-between px-3">
        <IconButton icon="arrow-back" label="Quay lại" className="bg-white/90" onPress={() => goBack("/")} />
        <View className="flex-row gap-2">
          <IconButton icon="share-outline" label="Chia sẻ" className="bg-white/90" onPress={onShare} />
          <IconButton icon={favorite ? "heart" : "heart-outline"} label={favorite ? "Bỏ yêu thích" : "Yêu thích"} color={favorite ? Colors.danger : Colors.brand} className="bg-white/90" onPress={onFavorite} />
        </View>
      </SafeAreaView>
      {images.length > 1 ? (
        <View className="absolute bottom-3 right-3 rounded-full bg-black/50 px-2 py-1">
          <Text className="text-xs text-white">{`${images.length} ảnh · vuốt để xem`}</Text>
        </View>
      ) : null}
    </View>
  );

  const content = (
    <View className="gap-6 px-4 py-4">
      {destination.listingStatus !== "APPROVED" ? (
        <Banner tone="warning" title={`Bản xem trước · ${LISTING_STATUS_LABEL[destination.listingStatus]}`}>
          Tin này chưa hiển thị công khai. Khách chỉ thấy sau khi quản trị viên duyệt.
        </Banner>
      ) : null}

      <View className="gap-1">
        <Text className="text-xs font-semibold uppercase text-brand-light">{`${destination.category?.name ?? "Điểm đến"} · ${destination.location}`}</Text>
        <Text className="text-2xl font-bold text-brand">{destination.name}</Text>
        <View className="flex-row items-center gap-2">
          <Stars value={destination.averageRating} />
          <Text className="text-sm text-muted">
            {destination.reviewCount ? `${destination.averageRating.toFixed(1)} · ${destination.reviewCount} đánh giá` : "Chưa có đánh giá"}
          </Text>
        </View>
      </View>

      {destination.description ? (
        <View className="gap-1">
          <Text className="text-base leading-6 text-brand" numberOfLines={expanded ? undefined : 4}>
            {destination.description}
          </Text>
          {destination.description.length > 200 ? (
            <Pressable onPress={() => setExpanded(!expanded)}>
              <Text className="font-semibold text-brand-light">{expanded ? "Thu gọn" : "Xem thêm"}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {destination.facilities.length ? (
        <View className="gap-3">
          <SectionTitle title="Tiện ích" />
          <View className="flex-row flex-wrap gap-2">
            {destination.facilities.map((facility) => (
              <View key={facility.id} className="flex-row items-center gap-2 rounded-full bg-brand-soft px-3 py-2">
                <Ionicons name="checkmark-circle" size={16} color={Colors.brandLight} />
                <Text className="text-sm text-brand">{facility.name}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View className="gap-3">
        <SectionTitle title="Các gói dịch vụ" />
        {packages.length === 0 ? <Text className="text-muted">Chưa có gói nào đang bán.</Text> : null}
        {packages.map((pkg) => (
          <Card key={pkg.id} onPress={bookable ? () => book(pkg) : undefined} className="gap-2">
            <View className="flex-row items-start justify-between gap-2">
              <View className="flex-1">
                <Text className="text-base font-bold text-brand">{pkg.name}</Text>
                <Text className="text-sm text-muted">{`${pkg.durationDays} ngày ${pkg.durationNights} đêm`}</Text>
              </View>
              <Text className="text-base font-bold text-brand">{formatVnd(pkg.price)}</Text>
            </View>
            {pkg.inclusions?.length ? (
              <View className="gap-1">
                {pkg.inclusions.map((item) => (
                  <View key={item} className="flex-row items-center gap-2">
                    <Ionicons name="checkmark" size={14} color={Colors.brandLight} />
                    <Text className="text-sm text-brand">{item}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text className="text-xs text-muted">{`Hủy miễn phí trước ${pkg.freeCancellationHours} giờ`}</Text>
          </Card>
        ))}
      </View>

      <View className="gap-3">
        <SectionTitle title="Loại phòng" />
        {rooms.map((room) => (
          <Card key={room.id} className="gap-1">
            <View className="flex-row justify-between gap-2">
              <Text className="flex-1 text-base font-semibold text-brand">{room.name}</Text>
              <Text className="font-bold text-brand">{`${formatVnd(room.pricePerNight)}/đêm`}</Text>
            </View>
            <Text className="text-sm text-muted">{`Tối đa ${room.capacity} khách / phòng`}</Text>
            {room.rates?.map((rate) => (
              <Text key={rate.id} className="text-xs text-[#8A5A12]">
                {`${rate.name}: ${formatVnd(rate.pricePerNight)}/đêm (${formatDate(rate.startDate)} – ${formatDate(rate.endDate)})`}
              </Text>
            ))}
          </Card>
        ))}
      </View>

      {services.length ? (
        <View className="gap-3">
          <SectionTitle title="Dịch vụ bổ sung" />
          <Card className="gap-1">
            {services.map((service) => (
              <View key={service.id} className="flex-row justify-between py-1">
                <Text className="text-brand">{service.name}</Text>
                <Text className="font-medium text-brand">{`${formatVnd(service.price)}${PRICING_UNIT_LABEL[service.pricingUnit]}`}</Text>
              </View>
            ))}
          </Card>
        </View>
      ) : null}

      <View className="gap-3">
        <SectionTitle title="Vị trí & liên hệ" />
        <Card className="gap-3">
          {destination.address ? (
            <Pressable onPress={openMap} className="flex-row items-start gap-2">
              <Ionicons name="location-outline" size={18} color={Colors.brandLight} />
              <Text className="flex-1 text-brand">{destination.address}</Text>
              <Text className="font-semibold text-brand-light">Bản đồ</Text>
            </Pressable>
          ) : null}
          {destination.contactPhone ? (
            <Pressable onPress={() => void Linking.openURL(`tel:${destination.contactPhone}`)} className="flex-row items-center gap-2">
              <Ionicons name="call-outline" size={18} color={Colors.brandLight} />
              <Text className="text-brand">{destination.contactPhone}</Text>
            </Pressable>
          ) : null}
          {destination.contactEmail ? (
            <Pressable onPress={() => void Linking.openURL(`mailto:${destination.contactEmail}`)} className="flex-row items-center gap-2">
              <Ionicons name="mail-outline" size={18} color={Colors.brandLight} />
              <Text className="text-brand">{destination.contactEmail}</Text>
            </Pressable>
          ) : null}
        </Card>
      </View>

      {destination.policy ? (
        <View className="gap-3">
          <SectionTitle title="Chính sách" />
          <Text className="text-base leading-6 text-brand">{destination.policy}</Text>
        </View>
      ) : null}

      <View className="gap-3">
        <SectionTitle
          title="Đánh giá"
          action={
            destination.reviewCount ? (
              <Pressable onPress={() => router.push({ pathname: "/destinations/[slug]/reviews", params: { slug: destination.slug } })} hitSlop={8}>
                <Text className="font-semibold text-brand-light">Xem tất cả</Text>
              </Pressable>
            ) : null
          }
        />
        {destination.latestReviews?.length ? (
          destination.latestReviews.map((review) => <ReviewItem key={review.id} review={review} />)
        ) : (
          <Text className="text-muted">Chưa có đánh giá nào.</Text>
        )}
      </View>
    </View>
  );

  const footer = (
    <View className="flex-row items-center justify-between gap-3">
      <View>
        <Text className="text-xs text-muted">Giá từ</Text>
        <Text className="text-xl font-bold text-brand">{formatVnd(destination.minPrice)}</Text>
      </View>
      <Button title={bookable ? "Đặt ngay" : "Chưa nhận đặt"} disabled={!bookable} onPress={() => book()} />
    </View>
  );

  if (isLg) {
    return (
      <SafeAreaView edges={["top"]} className="flex-1 bg-surface">
        <ScrollView contentContainerClassName="w-full max-w-[1120px] self-center flex-row gap-6 p-6">
          <View className="flex-1 gap-2">
            {gallery}
            {content}
          </View>
          <View className="w-80">
            <Card className="gap-3">{footer}</Card>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView>{gallery}{content}</ScrollView>
      <SafeAreaView edges={["bottom"]} className="border-t border-line bg-surface-card px-4 py-3">
        {footer}
      </SafeAreaView>
    </View>
  );
}
