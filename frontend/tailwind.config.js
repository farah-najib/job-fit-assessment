/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#08111f",
        mist: "#dbeafe",
        glow: "#7dd3fc",
        lime: "#bef264",
        coral: "#fb7185",
      },
      boxShadow: {
        panel: "0 24px 80px rgba(8, 17, 31, 0.45)",
      },
      backgroundImage: {
        mesh: "radial-gradient(circle at top left, rgba(125, 211, 252, 0.20), transparent 28%), radial-gradient(circle at 85% 15%, rgba(190, 242, 100, 0.18), transparent 20%), linear-gradient(135deg, #020617 0%, #0f172a 50%, #08111f 100%)",
      },
    },
  },
  plugins: [],
};
