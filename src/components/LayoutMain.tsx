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

import { Outlet } from "react-router-dom";
// @ts-ignore
import logoEmpresa from "../../assets/logo.png";

const { Header, Content } = Layout;

const LayoutMain = () => {

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
          defaultSelectedKeys={["1"]}
          style={{
            flex: 1,
            backgroundColor: "transparent",
            borderBottom: "none",
          }}
          items={[
            { key: "1", icon: <UserOutlined />, label: "Doctores" },
            { key: "2", icon: <TeamOutlined />, label: "Pacientes" },
            { key: "3", icon: <ScheduleOutlined />, label: "Consultas" },
            { key: "4", icon: <FileTextOutlined />, label: "Estudios" },
            { key: "5", icon: <SettingOutlined />, label: "Configuraciones" },
            { key: "6", icon: <LogoutOutlined />, label: "Cerrar Sesión" },
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
