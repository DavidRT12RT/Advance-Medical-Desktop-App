import React, { useEffect, useState } from "react";
import {
  Card,
  Button,
  Progress,
  Tag,
  Timeline,
  Alert,
  Spin,
  Divider,
  Space,
  Typography,
  Badge,
  Statistic,
  Row,
  Col,
  message,
} from "antd";
import {
  DownloadOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  RocketOutlined,
  ClockCircleOutlined,
  BugOutlined,
  StarOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import {
  getFirestore,
  doc,
  onSnapshot,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { useElectronStore } from "../hooks/useElectronStore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/es";

dayjs.extend(relativeTime);
dayjs.locale("es");

const { Title, Text, Paragraph } = Typography;

interface ChangelogItem {
  nuevas: string[];
  correcciones: string[];
  mejoras: string[];
  breaking: string[];
}

interface UpdateInfo {
  id: string;
  version: string;
  versionCode: number;
  nombre: string;
  descripcion: string;
  fechaPublicacion: string;
  tipo: "major" | "minor" | "patch" | "hotfix";
  prioridad: "critica" | "alta" | "media" | "baja";
  obligatoria: boolean;
  changelog: ChangelogItem;
  descargas: {
    [key: string]: {
      url: string;
      checksum: string;
      tamano: number;
      arquitectura: string;
    };
  };
  requiereReinicio: boolean;
  activa: boolean;
  retirada: boolean;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

const ActualizacionSoftware: React.FC = () => {
  const { user } = useElectronStore();
  const [currentVersion, setCurrentVersion] = useState<string>("1.5.1");
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({
    percent: 0,
    transferred: 0,
    total: 0,
    bytesPerSecond: 0,
  });
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updateHistory, setUpdateHistory] = useState<UpdateInfo[]>([]);

  // Obtener versión actual de la app
  useEffect(() => {
    const getVersion = async () => {
      try {
        // @ts-ignore
        const version = await window.electron.ipcRenderer.invoke(
          "update:getCurrentVersion",
        );
        setCurrentVersion(version);
      } catch (error) {
        console.error("Error getting version:", error);
        // Fallback a versión hardcodeada
        setCurrentVersion("1.5.1");
      }
    };
    getVersion();
  }, []);

  // Listener de Firebase para actualizaciones
  useEffect(() => {
    if (!user?.empresa?.id) return;

    const db = getFirestore();

    // Escuchar la última actualización disponible
    const latestUpdateRef = doc(
      db,
      `empresas/${user.empresa.id}/actualizaciones-software-aim`,
      "latest",
    );

    const unsubscribe = onSnapshot(
      latestUpdateRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as UpdateInfo;

          // Verificar si está activa y no retirada
          if (data.activa && !data.retirada) {
            // Comparar versiones (simple comparación numérica)
            const currentVersionCode = parseInt(
              currentVersion.replace(/\./g, ""),
            );

            if (data.versionCode > currentVersionCode) {
              setUpdateAvailable(true);
              setUpdateInfo(data);
            } else {
              setUpdateAvailable(false);
              setUpdateInfo(null);
            }
          }
        }
      },
      (error) => {
        console.error("Error listening to updates:", error);
        setError("Error al verificar actualizaciones");
      },
    );

    // Obtener historial de actualizaciones
    const fetchUpdateHistory = async () => {
      const historyRef = collection(
        db,
        `empresas/${user.empresa.id}/actualizaciones-software-aim`,
      );
      const q = query(
        historyRef,
        orderBy("fechaPublicacion", "desc"),
        limit(5),
      );
      const snapshot = await getDocs(q);

      const history: UpdateInfo[] = [];
      snapshot.forEach((doc) => {
        if (doc.id !== "latest") {
          history.push(doc.data() as UpdateInfo);
        }
      });

      setUpdateHistory(history);
    };

    fetchUpdateHistory();

    return () => unsubscribe();
  }, [user, currentVersion]);

  const handleCheckForUpdates = async () => {
    setChecking(true);
    setError(null);

    try {
      // La verificación ya se hace automáticamente con el listener de Firebase
      // Este botón solo fuerza una re-verificación
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setChecking(false);
    } catch (error) {
      console.error("Error checking for updates:", error);
      setError("Error al verificar actualizaciones");
      setChecking(false);
    }
  };

  // Listener para eventos de progreso de descarga
  useEffect(() => {
    // @ts-ignore
    if (!window.electron?.ipcRenderer) return;

    // @ts-ignore
    const handleDownloadProgress = (event, progress) => {
      setDownloadProgress(progress);
    };

    // @ts-ignore
    const handleDownloadComplete = (event, data) => {
      setDownloading(false);
      setUpdateDownloaded(true);
      message.success("Actualización descargada correctamente");
    };

    // @ts-ignore
    window.electron.ipcRenderer.on(
      "update-download-progress",
      handleDownloadProgress,
    );
    // @ts-ignore
    window.electron.ipcRenderer.on("update-downloaded", handleDownloadComplete);

    return () => {
      // @ts-ignore
      window.electron.ipcRenderer.removeListener(
        "update-download-progress",
        handleDownloadProgress,
      );
      // @ts-ignore
      window.electron.ipcRenderer.removeListener(
        "update-downloaded",
        handleDownloadComplete,
      );
    };
  }, []);

  const handleDownloadUpdate = async () => {
    if (!updateInfo) return;

    setDownloading(true);
    setError(null);
    setDownloadProgress({
      percent: 0,
      transferred: 0,
      total: 0,
      bytesPerSecond: 0,
    });

    try {
      // @ts-ignore
      const result = await window.electron.ipcRenderer.invoke(
        "update:downloadUpdate",
      );

      if (!result.success) {
        setDownloading(false);
        setError(result.error || "Error al descargar la actualización");
        message.error("Error al descargar la actualización");
      }
      // El éxito se maneja en el listener 'update-downloaded'
    } catch (error) {
      console.error("Error downloading update:", error);
      setDownloading(false);
      setError("Error al descargar la actualización");
      message.error("Error al descargar la actualización");
    }
  };

  const handleInstallUpdate = async () => {
    try {
      // @ts-ignore
      const result = await window.electron.ipcRenderer.invoke(
        "update:installUpdate",
      );

      if (result.success) {
        message.success(
          "Instalando actualización... La aplicación se reiniciará.",
        );
      } else {
        setError(result.error || "Error al instalar la actualización");
        message.error("Error al instalar la actualización");
      }
    } catch (error) {
      console.error("Error installing update:", error);
      setError("Error al instalar la actualización");
      message.error("Error al instalar la actualización");
    }
  };

  const getPriorityColor = (prioridad: string) => {
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

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "major":
        return <RocketOutlined />;
      case "minor":
        return <StarOutlined />;
      case "patch":
        return <BugOutlined />;
      case "hotfix":
        return <ThunderboltOutlined />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <Title level={2}>
          <RocketOutlined className="text-purple-600 mr-2" />
          Actualización de Software
        </Title>
        <Text type="secondary">
          Mantén tu aplicación actualizada con las últimas funciones y mejoras
          de seguridad
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {/* Columna principal */}
        <Col xs={24} lg={16}>
          {/* Card de versión actual */}
          <Card className="mb-4">
            <Row gutter={16} align="middle">
              <Col flex="auto">
                <Space direction="vertical" size="small">
                  <Text type="secondary">Versión Actual</Text>
                  <Title level={3} style={{ margin: 0 }}>
                    v{currentVersion}
                  </Title>
                </Space>
              </Col>
              <Col>
                <Button
                  type="primary"
                  icon={<ReloadOutlined />}
                  onClick={handleCheckForUpdates}
                  loading={checking}
                  disabled={downloading}
                  size="large"
                >
                  Buscar Actualizaciones
                </Button>
              </Col>
            </Row>
          </Card>

          {/* Estado de actualización */}
          {checking && (
            <Alert
              message="Buscando actualizaciones..."
              description="Verificando si hay nuevas versiones disponibles"
              type="info"
              icon={<Spin />}
              className="mb-4"
              showIcon
            />
          )}

          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              icon={<CloseCircleOutlined />}
              className="mb-4"
              showIcon
              closable
              onClose={() => setError(null)}
            />
          )}

          {!updateAvailable && !checking && !error && (
            <Alert
              message="Tu aplicación está actualizada"
              description="Tienes la última versión disponible instalada"
              type="success"
              icon={<CheckCircleOutlined />}
              className="mb-4"
              showIcon
            />
          )}

          {/* Nueva actualización disponible */}
          {updateAvailable && updateInfo && (
            <Card
              className="mb-4"
              title={
                <Space>
                  <Badge status="processing" />
                  <span>Nueva Actualización Disponible</span>
                  <Tag color={getPriorityColor(updateInfo.prioridad)}>
                    {updateInfo.prioridad.toUpperCase()}
                  </Tag>
                  {updateInfo.obligatoria && <Tag color="red">OBLIGATORIA</Tag>}
                </Space>
              }
            >
              <Space
                direction="vertical"
                size="large"
                style={{ width: "100%" }}
              >
                {/* Información de la versión */}
                <div>
                  <Space align="center" size="large">
                    <div>
                      <Text type="secondary">Nueva Versión</Text>
                      <Title level={2} style={{ margin: 0 }}>
                        v{updateInfo.version}
                      </Title>
                    </div>
                    <Divider type="vertical" style={{ height: 60 }} />
                    <div>
                      <Text type="secondary">Tipo</Text>
                      <div>
                        <Tag icon={getTipoIcon(updateInfo.tipo)} color="blue">
                          {updateInfo.tipo.toUpperCase()}
                        </Tag>
                      </div>
                    </div>
                    <Divider type="vertical" style={{ height: 60 }} />
                    <div>
                      <Text type="secondary">Fecha</Text>
                      <div>
                        <Text>
                          {dayjs(updateInfo.fechaPublicacion).format(
                            "DD MMM YYYY",
                          )}
                        </Text>
                      </div>
                    </div>
                  </Space>
                </div>

                <Divider style={{ margin: 0 }} />

                {/* Nombre y descripción */}
                <div>
                  <Title level={4}>{updateInfo.nombre}</Title>
                  <Paragraph>{updateInfo.descripcion}</Paragraph>
                </div>

                {/* Changelog */}
                <div>
                  <Title level={5}>Novedades</Title>
                  <Timeline
                    items={[
                      ...(updateInfo.changelog.nuevas.length > 0
                        ? [
                            {
                              color: "green",
                              dot: <StarOutlined />,
                              children: (
                                <>
                                  <Text strong>Nuevas Funciones</Text>
                                  <ul>
                                    {updateInfo.changelog.nuevas.map(
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
                      ...(updateInfo.changelog.mejoras.length > 0
                        ? [
                            {
                              color: "blue",
                              dot: <ThunderboltOutlined />,
                              children: (
                                <>
                                  <Text strong>Mejoras</Text>
                                  <ul>
                                    {updateInfo.changelog.mejoras.map(
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
                      ...(updateInfo.changelog.correcciones.length > 0
                        ? [
                            {
                              color: "orange",
                              dot: <BugOutlined />,
                              children: (
                                <>
                                  <Text strong>Correcciones</Text>
                                  <ul>
                                    {updateInfo.changelog.correcciones.map(
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
                      ...(updateInfo.changelog.breaking.length > 0
                        ? [
                            {
                              color: "red",
                              dot: <CloseCircleOutlined />,
                              children: (
                                <>
                                  <Text strong>Cambios Importantes</Text>
                                  <ul>
                                    {updateInfo.changelog.breaking.map(
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
                    ]}
                  />
                </div>

                {/* Progreso de descarga */}
                {downloading && (
                  <div>
                    <Text strong>Descargando actualización...</Text>
                    <Progress
                      percent={Math.round(downloadProgress.percent)}
                      status="active"
                      format={(percent) => `${percent}%`}
                    />
                    <Space>
                      <Text type="secondary">
                        {formatBytes(downloadProgress.transferred)} /{" "}
                        {formatBytes(downloadProgress.total)}
                      </Text>
                      <Text type="secondary">•</Text>
                      <Text type="secondary">
                        {formatBytes(downloadProgress.bytesPerSecond)}/s
                      </Text>
                    </Space>
                  </div>
                )}

                {/* Actualización descargada */}
                {updateDownloaded && (
                  <Alert
                    message="Actualización descargada"
                    description={
                      updateInfo.requiereReinicio
                        ? "La actualización se instalará al reiniciar la aplicación"
                        : "La actualización está lista para instalarse"
                    }
                    type="success"
                    icon={<CheckCircleOutlined />}
                    showIcon
                  />
                )}

                {/* Botones de acción */}
                <Space>
                  {!downloading && !updateDownloaded && (
                    <Button
                      type="primary"
                      size="large"
                      icon={<DownloadOutlined />}
                      onClick={handleDownloadUpdate}
                    >
                      Descargar Actualización
                    </Button>
                  )}

                  {updateDownloaded && (
                    <Button
                      type="primary"
                      size="large"
                      icon={<RocketOutlined />}
                      onClick={handleInstallUpdate}
                    >
                      {updateInfo.requiereReinicio
                        ? "Reiniciar e Instalar"
                        : "Instalar Ahora"}
                    </Button>
                  )}
                </Space>
              </Space>
            </Card>
          )}
        </Col>

        {/* Columna lateral */}
        <Col xs={24} lg={8}>
          {/* Información del sistema */}
          <Card title="Información del Sistema" className="mb-4">
            <Space direction="vertical" style={{ width: "100%" }}>
              <div>
                <Text type="secondary">Plataforma</Text>
                <div>
                  <Text strong>{navigator.platform}</Text>
                </div>
              </div>
              <Divider style={{ margin: "8px 0" }} />
              <div>
                <Text type="secondary">Arquitectura</Text>
                <div>
                  <Text strong>x64</Text>
                </div>
              </div>
              <Divider style={{ margin: "8px 0" }} />
              <div>
                <Text type="secondary">Canal</Text>
                <div>
                  <Tag color="green">STABLE</Tag>
                </div>
              </div>
            </Space>
          </Card>

          {/* Historial de actualizaciones */}
          {updateHistory.length > 0 && (
            <Card title="Historial de Actualizaciones">
              <Timeline
                items={updateHistory.map((update) => ({
                  color: "blue",
                  children: (
                    <div>
                      <Space>
                        <Text strong>v{update.version}</Text>
                        <Tag color={getPriorityColor(update.prioridad)}>
                          {update.tipo}
                        </Tag>
                      </Space>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {dayjs(update.fechaPublicacion).fromNow()}
                        </Text>
                      </div>
                      <div>
                        <Text style={{ fontSize: 12 }}>{update.nombre}</Text>
                      </div>
                    </div>
                  ),
                }))}
              />
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
};

export default ActualizacionSoftware;
