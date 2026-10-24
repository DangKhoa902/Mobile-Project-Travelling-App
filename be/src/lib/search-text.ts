// "Đà Lạt  Resort!" -> "da lat resort": viết thường, bỏ dấu, gộp khoảng trắng.
// Dùng cho cột Destination.searchText và cho từ khóa người dùng gõ, để "da lat" tìm ra "Đà Lạt".
export function toSearchText(...parts: (string | null | undefined)[]): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 1000);
}
