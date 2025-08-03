import React from "react";
import { ConfigProvider } from "antd";

//Routes
import AppRoutes from "./routes/AppRoutes";

const App = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#009b9b",
        },
      }}
    >
      <AppRoutes />
    </ConfigProvider>
  );
};

export default App;
