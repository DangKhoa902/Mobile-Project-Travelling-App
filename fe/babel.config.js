// NativeWind v4 cần preset này để `className` được chuyển thành style trên native và web.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
