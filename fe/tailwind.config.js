/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // App chỉ có giao diện sáng (app.json userInterfaceStyle: light). "class" tránh lỗi NativeWind trên web
  // khi trình duyệt đổi class của <html> ("Cannot manually set color scheme").
  darkMode: "class",
  theme: {
    // Khớp với hooks/use-breakpoint.ts: md = tablet, lg = web có sidebar.
    screens: { md: "768px", lg: "1024px" },
    extend: {
      // Đồng bộ với src/constants/theme.ts; dùng tên token thay vì mã màu rải rác.
      colors: {
        brand: { DEFAULT: "#193B35", light: "#2F6B5E", soft: "#DDEDE3" },
        surface: { DEFAULT: "#F8F7F3", card: "#FFFFFF" },
        line: "#E4E7E3",
        muted: "#71827A",
        accent: { DEFAULT: "#E9A23B", soft: "#FDF1DE" },
        danger: { DEFAULT: "#C2410C", soft: "#FDE8DF" },
        info: { DEFAULT: "#2563EB", soft: "#E0EAFE" },
      },
    },
  },
  plugins: [],
};
