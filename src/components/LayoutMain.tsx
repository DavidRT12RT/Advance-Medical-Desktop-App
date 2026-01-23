import React from "react";
import { Layout, Menu } from "antd";
import {
  UserOutlined,
  TeamOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  SettingOutlined,
  LogoutOutlined,
  CloudDownloadOutlined,
} from "@ant-design/icons";
import { getAuth, signOut } from "firebase/auth";
import { app } from "../firebaseConfig";

import { Outlet, useNavigate, useLocation } from "react-router-dom";
// @ts-ignore
import logoEmpresa from "../../assets/logo.png";
import { useElectronStore } from "../hooks/useElectronStore";
// @ts-ignore
import AppVersion from "./AppVersion";

const { Header, Content } = Layout;

const LayoutMain = () => {
  // Electron Store with local state
  const { logout } = useElectronStore();

  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      // Logout from Firebase
      const auth = getAuth(app);
      await signOut(auth);

      // Logout from Electron Store
      await logout();

      // Redirect to login
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      // Even if Firebase logout fails, still logout from Electron Store
      await logout();
      navigate("/login");
    }
  };

  const getSelectedKey = () => {
    const path = location.pathname;

    if (path.includes("/actualizacion")) return "6";
    if (path.includes("/configuracion")) return "5";

    if (path.includes("/estudios")) return "4";

    if (path.includes("/consultas")) return "3";

    if (path.startsWith("/paciente-detalle") || path === "/") return "2";

    return "2"; // Default
  };

  const selectedKey = getSelectedKey();

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
                navigate("/consultas");
              },
            },
            {
              key: "4",
              icon: <FileTextOutlined />,
              label: "Estudios",
              onClick: () => {
                navigate("/estudios");
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
              icon: <CloudDownloadOutlined />,
              label: "Actualización",
              onClick: () => navigate("/actualizacion"),
            },
            {
              key: "7",
              icon: <LogoutOutlined />,
              label: "Cerrar Sesión",
              onClick: () => {
                handleLogout();
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
          position: "relative",
        }}
      >
        <Outlet />
        <div
          style={{
            position: "fixed",
            bottom: 8,
            right: 16,
            zIndex: 1000,
          }}
        >
          <AppVersion />
        </div>
      </Content>
    </Layout>
  );
};

export default LayoutMain;
