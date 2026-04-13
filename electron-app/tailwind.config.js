/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      boxShadow: {
        panel: "0 30px 90px rgba(15, 23, 42, 0.18)",
      },
      backgroundImage: {
        darkmesh:
          "radial-gradient(circle at top left, rgba(56,189,248,0.18), transparent 28%), radial-gradient(circle at 80% 10%, rgba(255,255,255,0.08), transparent 18%), linear-gradient(135deg, #020617 0%, #0f172a 50%, #111827 100%)",
        lightmesh:
          "radial-gradient(circle at top left, rgba(15,23,42,0.08), transparent 28%), radial-gradient(circle at 85% 10%, rgba(59,130,246,0.10), transparent 18%), linear-gradient(180deg, #ffffff 0%, #f8fafc 55%, #e5e7eb 100%)",
      },
    },
  },
  plugins: [],
};
