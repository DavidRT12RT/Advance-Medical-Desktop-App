import type { ThemeConfig } from "antd";

// Tema global de antd — única fuente de verdad (lo usan Root.jsx y App.jsx).
// Tamaños ampliados para usuarios de edad avanzada: antd deriva de estos tokens
// todos los tamaños (headings, inputs, tablas, menús), así la estética se
// mantiene proporcional. Nota: antd trabaja en px, por lo que NO se escala con
// el font-size raíz del documento (ese solo afecta a Tailwind/rem).
const theme: ThemeConfig = {
  token: {
    colorPrimary: "#009b9b",
    fontSize: 16, // base de antd (default 14); deriva fontSizeSM=14, LG=18 y headings
    controlHeight: 40, // botones/inputs/selects (default 32); deriva SM=30, LG=50
  },
  components: {
    Layout: {
      headerHeight: 72, // barra superior con más aire para el menú principal (default 64)
    },
  },
};

export default theme;
