import { useState } from "react";
import { Tabs } from "antd";
import {
  FileTextOutlined,
  UserOutlined,
  VideoCameraOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import ConfiguracionReporte from "../components/configuraciones/ConfiguracionReporte";
import DatosMedicoDoctor from "../components/configuraciones/DatosMedicoDoctor";
import ConfiguracionCamara from "../components/configuraciones/ConfiguracionCamara";
import CatalogosEstudioConfig from "../components/configuraciones/CatalogosEstudioConfig";
import { useElectronStore } from "../hooks/useElectronStore";

const Configuracion = () => {
  const [activeTab, setActiveTab] = useState("reporte");
  const { user } = useElectronStore();

  const idEmpresa = user?.empresa?.id;
  const idOrganizacion = user?.usuarioDetail?.idOrganizacion;
  const idUsuario = user?.usuarioDetail?.id;

  const tabItems = [
    {
      key: "reporte",
      label: <span>Configuración del Reporte</span>,
      children:
        idEmpresa && idOrganizacion && idUsuario ? (
          <ConfiguracionReporte
            idEmpresa={idEmpresa}
            idOrganizacion={idOrganizacion}
            idUsuario={idUsuario}
            usuarioData={user?.usuarioDetail}
          />
        ) : (
          <div style={{ padding: "24px", color: "#999" }}>
            No se pudo cargar la configuración del reporte. Verifica tu sesión.
          </div>
        ),
    },
    {
      key: "datosMedicos",
      label: <span>Datos Médicos Profesionales</span>,
      children:
        idEmpresa && idOrganizacion && idUsuario ? (
          <DatosMedicoDoctor
            idEmpresa={idEmpresa}
            idOrganizacion={idOrganizacion}
            idUsuario={idUsuario}
            usuarioData={user?.usuarioDetail}
          />
        ) : (
          <div style={{ padding: "24px", color: "#999" }}>
            No se pudo cargar los datos médicos. Verifica tu sesión.
          </div>
        ),
    },
    {
      key: "listados",
      label: (
        <span>
          <UnorderedListOutlined /> Listados del Estudio
        </span>
      ),
      children: <CatalogosEstudioConfig />,
    },
    {
      key: "camara",
      label: (
        <span>
          <VideoCameraOutlined /> Cámara y Video
        </span>
      ),
      children: <ConfiguracionCamara />,
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "16px" }}>
        Configuraciones del Sistema
      </h1>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginTop: "24px" }}
      />
    </div>
  );
};

export default Configuracion;
