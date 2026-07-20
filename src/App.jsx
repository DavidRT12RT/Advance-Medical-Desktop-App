// Ant design
import { ConfigProvider } from "antd";
import { useEffect } from "react";
import theme from "./theme";

//Routes
import AppRoutes from "./routes/AppRoutes";

// Redux
import { Provider } from "react-redux";
import { store } from "./store";
import { useElectronStore } from "./hooks/useElectronStore";

const App = () => {
  // Restaurar el zoom de accesibilidad guardado en el perfil del usuario
  const { user } = useElectronStore();
  const zoomApp = user?.usuarioDetail?.configuraciones?.zoomApp;
  useEffect(() => {
    if (!zoomApp) return;
    window.appZoom?.setZoomFactor?.(zoomApp / 100);
  }, [zoomApp]);

  return (
    <Provider store={store}>
      <ConfigProvider theme={theme}>
        <AppRoutes />
      </ConfigProvider>
    </Provider>
  );
};

export default App;
