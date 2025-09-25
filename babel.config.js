const path = require("path");

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Add react-refresh plugin for development
      process.env.NODE_ENV === "development" && "react-refresh/babel"
    ].filter(Boolean),
  };
};
