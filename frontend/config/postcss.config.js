//config/postcss.config.js
import tailwindcss from "tailwindcss";
import path from "path";

export default {
  plugins: {
    tailwindcss: {
      config: path.resolve("./config/tailwind.config.js"),
    },
    autoprefixer: {},
  },
};
