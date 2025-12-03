import React from "react";
import { Layout, Menu } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
} from "@ant-design/icons";

import { Outlet, useNavigate, useLocation } from "react-router-dom";
// @ts-ignore
import logoEmpresa from "../../assets/logo.png";
import { useElectronStore } from "../hooks/useElectronStore";

const { Header, Content } = Layout;

const LayoutMain = () => {
  // Electron Store with local state
  const { logout } = useElectronStore();

  const navigate = useNavigate();
  const location = useLocation();

  let selectedKey = "2";
  if (location.pathname.startsWith("/configuracion")) {
    selectedKey = "5";
  } else if (location.pathname.startsWith("/")) {
    selectedKey = "2";
  }

  return (
    <Layout style={{ minHeight: "100vh", backgroundColor: "#fff" }}>
      <Header
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          backgroundColor: "#fff", // Blanco
          borderBottom: "1px solid #f0f0f0",
          zIndex: 10,
        }}
      >
        <img
          src={logoEmpresa}
          alt="Advance logo"
          style={{ height: 40, marginRight: 24 }}
        />

        <Menu
          mode="horizontal"
          theme="light"
          selectedKeys={[selectedKey]}
          style={{
            flex: 1,
            backgroundColor: "transparent",
            borderBottom: "none",
          }}
          items={[
            {
              key: "2",
              icon: <TeamOutlined />,
              label: "Pacientes",
              onClick: () => navigate("/"),
            },
            {
              key: "3",
              icon: <ScheduleOutlined />,
              label: "Consultas",
              onClick: () => {
                // pendiente definir ruta real de consultas
                navigate("/");
              },
            },
            {
              key: "4",
              icon: <FileTextOutlined />,
              label: "Estudios",
              onClick: () => {
                // pendiente definir ruta real de estudios
                navigate("/");
              },
            },
            {
              key: "5",
              icon: <SettingOutlined />,
              label: "Configuraciones",
              onClick: () => navigate("/configuracion"),
            },
            {
              key: "6",
              icon: <LogoutOutlined />,
              label: "Cerrar Sesión",
              onClick: () => {
                logout();
              },
            },
          ]}
        />
      </Header>
      <Content
        style={{
          margin: "24px 16px",
          padding: 24,
          backgroundColor: "#fff",
          borderRadius: 8,
          minHeight: 360,
        }}
      >
        <Outlet />
      </Content>
    </Layout>
  );
};

export default LayoutMain;
