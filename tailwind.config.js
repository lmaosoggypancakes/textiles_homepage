/** @type {import('tailwindcss').Config} */
module.exports =  {
  // purge: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  content: ["./index.html", "./src/**/*.{html,js,vue,ts}"],
  theme: {
    extend: {
      colors: {
        base: "#191724",
        surface: "#1f1d2e",
        overlay: "#26233a",
        muted: "#6e6a86",
        subtle: "#908caa",
        text: "#e0def4",
        danger: "#eb6f92",
        warning: "#f6c177",
        rose: "#ebbcba",
        foam: "#9ccfd8",
        iris: "#c4a7e7",
        highlight: "#56526e",
      }
    },
  },
}

