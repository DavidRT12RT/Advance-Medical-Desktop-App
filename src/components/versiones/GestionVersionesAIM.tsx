import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Statistic,
  Row,
  Col,
  message,
  Popconfirm,
  Typography,
  Badge,
  Tooltip,
} from "antd";
import {
  RocketOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
} from "firebase/firestore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";
import ModalPublicarVersion from "../components/aim-system/ModalPublicarVersion";
import DetalleVersion from "../components/aim-system/DetalleVersion";

dayjs.extend(relativeTime);
dayjs.locale("es");

const { Title, Text } = Typography;

interface Version {
  id: string;
  version: string;
  versionCode: number;
  nombre: string;
  descripcion: string;
  fechaPublicacion: string;
  tipo: "major" | "minor" | "patch" | "hotfix";
  prioridad: "critica" | "alta" | "media" | "baja";
  obligatoria: boolean;
  activa: boolean;
  retirada: boolean;
  estadisticas: {
    descargas: number;
    instalaciones: number;
    errores: number;
    rollbacks: number;
  };
  creadoPor: string;
}

interface GestionVersionesAIMProps {
  empresaId: string;
}

const GestionVersionesAIM: React.FC<GestionVersionesAIMProps> = ({
  empresaId,
}) => {
  const [versiones, setVersiones] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalPublicarVisible, setModalPublicarVisible] = useState(false);
  const [modalDetalleVisible, setModalDetalleVisible] = useState(false);
  const [versionSeleccionada, setVersionSeleccionada] =
    useState<Version | null>(null);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState({
    versionActual: "",
    instalacionesActivas: 0,
    ultimaActualizacion: "",
    totalVersiones: 0,
  });

  useEffect(() => {
    if (!empresaId) return;

    const db = getFirestore();
    const versionesRef = collection(
      db,
      `empresas/${empresaId}/actualizaciones-software-aim`,
    );
    const q = query(versionesRef, orderBy("fechaPublicacion", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const versionesData: Version[] = [];
        let totalInstalaciones = 0;
        let versionMasReciente = "";
        let fechaMasReciente = "";

        snapshot.forEach((doc) => {
          if (doc.id !== "latest") {
            const data = doc.data() as Version;
            versionesData.push({ ...data, id: doc.id });

            if (data.activa && !data.retirada) {
              totalInstalaciones += data.estadisticas?.instalaciones || 0;

              if (
                !versionMasReciente ||
                data.versionCode >
                  parseInt(versionMasReciente.replace(/\./g, ""))
              ) {
                versionMasReciente = data.version;
                fechaMasReciente = data.fechaPublicacion;
              }
            }
          }
        });

        setVersiones(versionesData);
        setEstadisticasGenerales({
          versionActual: versionMasReciente,
          instalacionesActivas: totalInstalaciones,
          ultimaActualizacion: fechaMasReciente,
          totalVersiones: versionesData.length,
        });
        setLoading(false);
      },
      (error) => {
        console.error("Error al cargar versiones:", error);
        message.error("Error al cargar las versiones");
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [empresaId]);

  const handleRetirarVersion = async (versionId: string) => {
    try {
      const db = getFirestore();
      const versionRef = doc(
        db,
        `empresas/${empresaId}/actualizaciones-software-aim/${versionId}`,
      );

      await updateDoc(versionRef, {
        retirada: true,
        activa: false,
        motivoRetiro: "Retirada manualmente desde el CRM",
        fechaRetiro: new Date().toISOString(),
      });

      message.success("Versión retirada exitosamente");
    } catch (error) {
      console.error("Error al retirar versión:", error);
      message.error("Error al retirar la versión");
    }
  };

  const handleVerDetalles = (version: Version) => {
    setVersionSeleccionada(version);
    setModalDetalleVisible(true);
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case "critica":
        return "red";
      case "alta":
        return "orange";
      case "media":
        return "blue";
      case "baja":
        return "green";
      default:
        return "default";
    }
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case "major":
        return "purple";
      case "minor":
        return "blue";
      case "patch":
        return "green";
      case "hotfix":
        return "red";
      default:
        return "default";
    }
  };

  const columns = [
    {
      title: "Versión",
      dataIndex: "version",
      key: "version",
      render: (version: string, record: Version) => (
        <Space direction="vertical" size="small">
          <Space>
            <Text strong style={{ fontSize: 16 }}>
              v{version}
            </Text>
            {record.activa && !record.retirada && (
              <Badge status="processing" text="Activa" />
            )}
            {record.retirada && <Badge status="error" text="Retirada" />}
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.nombre}
          </Text>
        </Space>
      ),
    },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      render: (tipo: string) => (
        <Tag color={getTipoColor(tipo)}>{tipo.toUpperCase()}</Tag>
      ),
    },
    {
      title: "Prioridad",
      dataIndex: "prioridad",
      key: "prioridad",
      render: (prioridad: string, record: Version) => (
        <Space direction="vertical" size="small">
          <Tag color={getPrioridadColor(prioridad)}>
            {prioridad.toUpperCase()}
          </Tag>
          {record.obligatoria && <Tag color="red">OBLIGATORIA</Tag>}
        </Space>
      ),
    },
    {
      title: "Estadísticas",
      key: "estadisticas",
      render: (_: any, record: Version) => (
        <Space direction="vertical" size="small">
          <Text style={{ fontSize: 12 }}>
            <DownloadOutlined /> {record.estadisticas?.descargas || 0} descargas
          </Text>
          <Text style={{ fontSize: 12 }}>
            <CheckCircleOutlined /> {record.estadisticas?.instalaciones || 0}{" "}
            instalaciones
          </Text>
          {record.estadisticas?.errores > 0 && (
            <Text type="danger" style={{ fontSize: 12 }}>
              <WarningOutlined /> {record.estadisticas.errores} errores
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: "Fecha",
      dataIndex: "fechaPublicacion",
      key: "fechaPublicacion",
      render: (fecha: string) => (
        <Space direction="vertical" size="small">
          <Text>{dayjs(fecha).format("DD MMM YYYY")}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {dayjs(fecha).fromNow()}
          </Text>
        </Space>
      ),
    },
    {
      title: "Acciones",
      key: "acciones",
      render: (_: any, record: Version) => (
        <Space>
          <Tooltip title="Ver detalles">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleVerDetalles(record)}
            />
          </Tooltip>
          {record.activa && !record.retirada && (
            <Popconfirm
              title="¿Retirar esta versión?"
              description="Los usuarios no podrán descargar esta versión"
              onConfirm={() => handleRetirarVersion(record.id)}
              okText="Sí, retirar"
              cancelText="Cancelar"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Retirar versión">
                <Button type="link" danger icon={<CloseCircleOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>
          <RocketOutlined className="text-purple-600 mr-2" />
          Gestión de Versiones - AIM Desktop
        </Title>
        <Text type="secondary">
          Administra las versiones de la aplicación de escritorio AIM
        </Text>
      </div>

      {/* Estadísticas Generales */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Versión Actual"
              value={estadisticasGenerales.versionActual || "N/A"}
              prefix={<RocketOutlined />}
              valueStyle={{ color: "#722ED1" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Instalaciones Activas"
              value={estadisticasGenerales.instalacionesActivas}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: "#52C41A" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total de Versiones"
              value={estadisticasGenerales.totalVersiones}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: "#1890FF" }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Última Actualización"
              value={
                estadisticasGenerales.ultimaActualizacion
                  ? dayjs(estadisticasGenerales.ultimaActualizacion).fromNow()
                  : "N/A"
              }
              prefix={<ClockCircleOutlined />}
              valueStyle={{ fontSize: 16 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Botón Publicar */}
      <div className="mb-4">
        <Button
          type="primary"
          size="large"
          icon={<RocketOutlined />}
          onClick={() => setModalPublicarVisible(true)}
        >
          Publicar Nueva Versión
        </Button>
      </div>

      {/* Tabla de Versiones */}
      <Card title="Historial de Versiones">
        <Table
          columns={columns}
          dataSource={versiones}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total: ${total} versiones`,
          }}
        />
      </Card>

      {/* Modales */}
      <ModalPublicarVersion
        visible={modalPublicarVisible}
        onClose={() => setModalPublicarVisible(false)}
        empresaId={empresaId}
      />

      {versionSeleccionada && (
        <DetalleVersion
          visible={modalDetalleVisible}
          onClose={() => {
            setModalDetalleVisible(false);
            setVersionSeleccionada(null);
          }}
          version={versionSeleccionada}
        />
      )}
    </div>
  );
};

export default GestionVersionesAIM;
