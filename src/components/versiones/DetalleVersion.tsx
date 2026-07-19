import React from "react";
import {
  Modal,
  Descriptions,
  Tag,
  Timeline,
  Space,
  Typography,
  Divider,
  Row,
  Col,
  Statistic,
  Progress,
} from "antd";
import {
  DownloadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  StarOutlined,
  BugOutlined,
  ThunderboltOutlined,
  CloseCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";

const { Title, Text, Paragraph } = Typography;

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
  changelog?: {
    nuevas: string[];
    correcciones: string[];
    mejoras: string[];
    breaking: string[];
  };
  descargas?: {
    [key: string]: {
      url: string;
      checksum: string;
      tamano: number;
      arquitectura: string;
    };
  };
  estadisticas: {
    descargas: number;
    instalaciones: number;
    errores: number;
    rollbacks: number;
  };
  creadoPor: string;
  canal?: string;
}

interface DetalleVersionProps {
  visible: boolean;
  onClose: () => void;
  version: Version;
}

const DetalleVersion: React.FC<DetalleVersionProps> = ({
  visible,
  onClose,
  version,
}) => {
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const tasaExito =
    version.estadisticas.instalaciones > 0
      ? Math.round(
          (version.estadisticas.instalaciones /
            (version.estadisticas.instalaciones +
              version.estadisticas.errores)) *
            100,
        )
      : 0;

  return (
    <Modal
      title={
        <Space>
          <Text>Detalles de la Versión</Text>
          <Tag color={getTipoColor(version.tipo)}>v{version.version}</Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={900}
      footer={null}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* Información General */}
        <div>
          <Title level={4}>{version.nombre}</Title>
          <Paragraph>{version.descripcion}</Paragraph>
          <Space wrap>
            <Tag color={getTipoColor(version.tipo)}>
              {version.tipo.toUpperCase()}
            </Tag>
            <Tag color={getPrioridadColor(version.prioridad)}>
              {version.prioridad.toUpperCase()}
            </Tag>
            {version.obligatoria && <Tag color="red">OBLIGATORIA</Tag>}
            {version.activa && !version.retirada && (
              <Tag color="green" icon={<CheckCircleOutlined />}>
                ACTIVA
              </Tag>
            )}
            {version.retirada && (
              <Tag color="red" icon={<CloseCircleOutlined />}>
                RETIRADA
              </Tag>
            )}
            {version.canal && (
              <Tag color="blue">{version.canal.toUpperCase()}</Tag>
            )}
          </Space>
        </div>

        <Divider />

        {/* Estadísticas */}
        <div>
          <Title level={5}>Estadísticas</Title>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="Descargas"
                value={version.estadisticas.descargas}
                prefix={<DownloadOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Instalaciones"
                value={version.estadisticas.instalaciones}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: "#52c41a" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Errores"
                value={version.estadisticas.errores}
                prefix={<WarningOutlined />}
                valueStyle={{
                  color:
                    version.estadisticas.errores > 0 ? "#f5222d" : "#52c41a",
                }}
              />
            </Col>
            <Col span={6}>
              <div>
                <Text type="secondary">Tasa de Éxito</Text>
                <div>
                  <Progress
                    percent={tasaExito}
                    status={
                      tasaExito > 95
                        ? "success"
                        : tasaExito > 80
                          ? "normal"
                          : "exception"
                    }
                  />
                </div>
              </div>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Changelog */}
        {version.changelog && (
          <>
            <div>
              <Title level={5}>Notas de la Versión</Title>
              <Timeline
                items={[
                  ...(version.changelog.nuevas &&
                  version.changelog.nuevas.length > 0
                    ? [
                        {
                          color: "green",
                          dot: <StarOutlined />,
                          children: (
                            <>
                              <Text strong>Nuevas Funciones</Text>
                              <ul>
                                {version.changelog.nuevas.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </>
                          ),
                        },
                      ]
                    : []),
                  ...(version.changelog.mejoras &&
                  version.changelog.mejoras.length > 0
                    ? [
                        {
                          color: "blue",
                          dot: <ThunderboltOutlined />,
                          children: (
                            <>
                              <Text strong>Mejoras</Text>
                              <ul>
                                {version.changelog.mejoras.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </>
                          ),
                        },
                      ]
                    : []),
                  ...(version.changelog.correcciones &&
                  version.changelog.correcciones.length > 0
                    ? [
                        {
                          color: "orange",
                          dot: <BugOutlined />,
                          children: (
                            <>
                              <Text strong>Correcciones</Text>
                              <ul>
                                {version.changelog.correcciones.map(
                                  (item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ),
                                )}
                              </ul>
                            </>
                          ),
                        },
                      ]
                    : []),
                  ...(version.changelog.breaking &&
                  version.changelog.breaking.length > 0
                    ? [
                        {
                          color: "red",
                          dot: <CloseCircleOutlined />,
                          children: (
                            <>
                              <Text strong>Cambios Importantes</Text>
                              <ul>
                                {version.changelog.breaking.map((item, idx) => (
                                  <li key={idx}>{item}</li>
                                ))}
                              </ul>
                            </>
                          ),
                        },
                      ]
                    : []),
                ]}
              />
            </div>
            <Divider />
          </>
        )}

        {/* Archivos de Descarga */}
        {version.descargas && (
          <>
            <div>
              <Title level={5}>Archivos de Descarga</Title>
              <Space direction="vertical" style={{ width: "100%" }}>
                {version.descargas.windows && (
                  <div className="border border-gray-300 rounded p-3">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Space>
                        <Tag color="blue">Windows</Tag>
                        <Text strong>
                          {formatBytes(version.descargas.windows.tamano)}
                        </Text>
                        <Tag>{version.descargas.windows.arquitectura}</Tag>
                      </Space>
                      <Text
                        type="secondary"
                        style={{ fontSize: 14, wordBreak: "break-all" }}
                      >
                        Checksum: {version.descargas.windows.checksum}
                      </Text>
                    </Space>
                  </div>
                )}
                {version.descargas.mac && (
                  <div className="border border-gray-300 rounded p-3">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Space>
                        <Tag color="blue">macOS</Tag>
                        <Text strong>
                          {formatBytes(version.descargas.mac.tamano)}
                        </Text>
                        <Tag>{version.descargas.mac.arquitectura}</Tag>
                      </Space>
                      <Text
                        type="secondary"
                        style={{ fontSize: 14, wordBreak: "break-all" }}
                      >
                        Checksum: {version.descargas.mac.checksum}
                      </Text>
                    </Space>
                  </div>
                )}
                {version.descargas.linux && (
                  <div className="border border-gray-300 rounded p-3">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Space>
                        <Tag color="blue">Linux</Tag>
                        <Text strong>
                          {formatBytes(version.descargas.linux.tamano)}
                        </Text>
                        <Tag>{version.descargas.linux.arquitectura}</Tag>
                      </Space>
                      <Text
                        type="secondary"
                        style={{ fontSize: 14, wordBreak: "break-all" }}
                      >
                        Checksum: {version.descargas.linux.checksum}
                      </Text>
                    </Space>
                  </div>
                )}
              </Space>
            </div>
            <Divider />
          </>
        )}

        {/* Información Adicional */}
        <div>
          <Title level={5}>Información Adicional</Title>
          <Descriptions column={2} size="small">
            <Descriptions.Item label="Publicado por">
              {version.creadoPor}
            </Descriptions.Item>
            <Descriptions.Item label="Fecha de publicación">
              {dayjs(version.fechaPublicacion).format("DD/MM/YYYY HH:mm")}
            </Descriptions.Item>
            <Descriptions.Item label="Código de versión">
              {version.versionCode}
            </Descriptions.Item>
            <Descriptions.Item label="ID">{version.id}</Descriptions.Item>
          </Descriptions>
        </div>
      </Space>
    </Modal>
  );
};

export default DetalleVersion;
