// Ant design
import { ConfigProvider } from "antd";
import theme from "./theme";

//Routes
import AppRoutes from "./routes/AppRoutes";

// Redux
import { Provider } from "react-redux";
import { store } from "./store";

const App = () => {
  return (
    <Provider store={store}>
      <ConfigProvider theme={theme}>
        <AppRoutes />
      </ConfigProvider>
    </Provider>
  );
};

export default App;
