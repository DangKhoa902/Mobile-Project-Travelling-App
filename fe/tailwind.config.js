/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Đồng bộ với src/constants/theme.ts; dùng tên token thay vì mã màu rải rác.
      colors: {
        brand: { DEFAULT: "#193B35", light: "#2F6B5E", soft: "#DDEDE3" },
        surface: { DEFAULT: "#F8F7F3", card: "#FFFFFF" },
        muted: "#71827A",
        accent: "#E9A23B",
        danger: "#C2410C",
      },
    },
  },
  plugins: [],
};
