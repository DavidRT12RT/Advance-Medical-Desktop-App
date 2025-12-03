// Ant design
import { ConfigProvider } from "antd";

//Routes
import AppRoutes from "./routes/AppRoutes";

// Redux
import { Provider } from "react-redux";
import { store } from "./store";

const App = () => {
  return (
    <Provider store={store}>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#009b9b",
          },
        }}
      >
        <AppRoutes />
      </ConfigProvider>
    </Provider>
  );
};

export default App;
