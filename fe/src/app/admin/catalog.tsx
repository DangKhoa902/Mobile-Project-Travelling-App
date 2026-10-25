import { useState } from "react";
import { Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/card";
import { Dialog, useDialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { QueryState } from "@/components/ui/state-view";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { errorMessage } from "@/services/api/client";
import { useCategories, useFacilities } from "@/services/destination.service";
import { manageService, useManageMutation } from "@/services/manage.service";
import { toast } from "@/store/toast-store";

type Row = { id: number; name: string; slug?: string; iconName: string | null; count?: number };

// M9 – Danh mục & tiện ích (ADMIN): sửa trực tiếp, thêm, xóa.
export default function CatalogScreen() {
  const categories = useCategories();
  const facilities = useFacilities();
  const saveCategory = useManageMutation(({ id, input }: { id: number | null; input: { name: string; slug?: string; iconName?: string | null } }) => manageService.saveCategory(id, input));
  const saveFacility = useManageMutation(({ id, input }: { id: number | null; input: { name: string; iconName?: string | null } }) => manageService.saveFacility(id, input));
  const removeCategory = useManageMutation(manageService.removeCategory);
  const removeFacility = useManageMutation(manageService.removeFacility);
  const { isLg } = useBreakpoint();

  return (
    <Screen title="Danh mục & tiện ích">
      <View className={isLg ? "flex-row gap-6" : "gap-6"}>
        <View className="flex-1 gap-3">
          <SectionTitle title="Danh mục" />
          <QueryState query={categories}>
            {(data) => (
              <EditableList
                withSlug
                rows={data.map((item) => ({ id: item.id, name: item.name, slug: item.slug, iconName: item.iconName, count: item._count?.destinations }))}
                onSave={(id, input) => saveCategory.mutateAsync({ id, input })}
                onRemove={(id) => removeCategory.mutateAsync(id)}
              />
            )}
          </QueryState>
        </View>
        <View className="flex-1 gap-3">
          <SectionTitle title="Tiện ích" />
          <QueryState query={facilities}>
            {(data) => (
              <EditableList
                rows={data.map((item) => ({ id: item.id, name: item.name, iconName: item.iconName }))}
                onSave={(id, input) => saveFacility.mutateAsync({ id, input: { name: input.name, iconName: input.iconName } })}
                onRemove={(id) => removeFacility.mutateAsync(id)}
              />
            )}
          </QueryState>
        </View>
      </View>
    </Screen>
  );
}

function EditableList({
  rows,
  withSlug,
  onSave,
  onRemove,
}: {
  rows: Row[];
  withSlug?: boolean;
  onSave: (id: number | null, input: { name: string; slug?: string; iconName?: string | null }) => Promise<unknown>;
  onRemove: (id: number) => Promise<unknown>;
}) {
  const remove = useDialog<Row>();
  return (
    <View className="gap-2">
      {rows.map((row) => (
        <RowEditor key={row.id} row={row} withSlug={withSlug} onSave={onSave} onRemove={() => remove.open(row)} />
      ))}
      <RowEditor row={null} withSlug={withSlug} onSave={onSave} />
      <Dialog
        open={remove.isOpen}
        onClose={remove.close}
        title={`Xóa "${remove.target?.name}"?`}
        message={remove.target?.count ? `Đang có ${remove.target.count} địa điểm dùng mục này.` : undefined}
        confirmLabel="Xóa"
        destructive
        onConfirm={async () => {
          const target = remove.target;
          if (target) await onRemove(target.id);
          toast.success("Đã xóa");
        }}
      />
    </View>
  );
}

function RowEditor({ row, withSlug, onSave, onRemove }: { row: Row | null; withSlug?: boolean; onSave: (id: number | null, input: { name: string; slug?: string; iconName?: string | null }) => Promise<unknown>; onRemove?: () => void }) {
  const [name, setName] = useState(row?.name ?? "");
  const [slug, setSlug] = useState(row?.slug ?? "");
  const [icon, setIcon] = useState(row?.iconName ?? "");
  const [busy, setBusy] = useState(false);
  const dirty = !row || name !== row.name || slug !== (row.slug ?? "") || icon !== (row.iconName ?? "");

  async function save() {
    setBusy(true);
    try {
      await onSave(row?.id ?? null, { name: name.trim(), ...(withSlug && slug.trim() ? { slug: slug.trim() } : {}), iconName: icon.trim() || null });
      toast.success(row ? "Đã lưu" : "Đã thêm");
      if (!row) {
        setName("");
        setSlug("");
        setIcon("");
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="gap-2">
      {!row ? <Text className="text-sm font-semibold text-brand">Thêm mới</Text> : null}
      <View className="flex-row flex-wrap gap-2">
        <Input className="min-w-40 flex-1" placeholder="Tên" value={name} onChangeText={setName} />
        {withSlug ? <Input className="min-w-32 flex-1" placeholder="slug (tự sinh nếu trống)" autoCapitalize="none" value={slug} onChangeText={setSlug} /> : null}
        <Input className="min-w-32 flex-1" placeholder="Icon (Material)" autoCapitalize="none" value={icon} onChangeText={setIcon} />
      </View>
      <View className="flex-row items-center justify-end gap-2">
        {row?.count !== undefined ? <Text className="flex-1 text-xs text-muted">{`${row.count} địa điểm`}</Text> : null}
        {onRemove ? <Button title="Xóa" size="sm" variant="ghost" onPress={onRemove} /> : null}
        <Button title={row ? "Lưu" : "Thêm"} size="sm" loading={busy} disabled={!dirty || name.trim().length < 2} onPress={save} />
      </View>
    </Card>
  );
}
