import React, { useState } from "react";
import {
  Modal,
  Steps,
  Form,
  Input,
  Button,
  Space,
  message,
  Select,
  Switch,
  Upload,
  Progress,
  Alert,
  Divider,
  Typography,
  Tag,
  List,
} from "antd";
import {
  InfoCircleOutlined,
  InboxOutlined,
  FileTextOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  UploadOutlined,
  DeleteOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";
import { firestore } from "../../firebaseConfig";
import { v4 as uuidv4 } from "uuid";

const { Step } = Steps;
const { TextArea } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;

interface ModalPublicarVersionProps {
  visible: boolean;
  onClose: () => void;
  empresaId: string;
}

interface BinaryFile {
  file: File;
  platform: "windows" | "mac" | "linux";
  checksum?: string;
  url?: string;
  uploadProgress?: number;
  uploading?: boolean;
}

interface VersionData {
  version: string;
  nombre: string;
  descripcion: string;
  tipo: "major" | "minor" | "patch" | "hotfix";
  prioridad: "critica" | "alta" | "media" | "baja";
  obligatoria: boolean;
  canal: "stable" | "beta" | "alpha";
  changelog: {
    nuevas: string[];
    correcciones: string[];
    mejoras: string[];
    breaking: string[];
  };
  descargas: {
    [key: string]: {
      url: string;
      checksum: string;
      tamano: number;
      arquitectura: string;
    };
  };
}

const ModalPublicarVersion: React.FC<ModalPublicarVersionProps> = ({
  visible,
  onClose,
  empresaId,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  // Archivos binarios
  const [windowsFile, setWindowsFile] = useState<BinaryFile | null>(null);
  const [macFile, setMacFile] = useState<BinaryFile | null>(null);
  const [linuxFile, setLinuxFile] = useState<BinaryFile | null>(null);

  // Changelog
  const [nuevasFunciones, setNuevasFunciones] = useState<string[]>([]);
  const [correcciones, setCorrecciones] = useState<string[]>([]);
  const [mejoras, setMejoras] = useState<string[]>([]);
  const [breakingChanges, setBreakingChanges] = useState<string[]>([]);

  // Inputs temporales para changelog
  const [nuevaFuncionInput, setNuevaFuncionInput] = useState("");
  const [correccionInput, setCorreccionInput] = useState("");
  const [mejoraInput, setMejoraInput] = useState("");
  const [breakingInput, setBreakingInput] = useState("");

  // Generar checksum SHA256
  const generateChecksum = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  };

  // Subir archivo a Firebase Storage
  const uploadBinary = async (
    binaryFile: BinaryFile,
    version: string,
  ): Promise<{ url: string; checksum: string; size: number }> => {
    const storage = getStorage();
    const extension =
      binaryFile.platform === "windows"
        ? "exe"
        : binaryFile.platform === "mac"
          ? "dmg"
          : "AppImage";

    const fileName = `AIM-Setup-${version}.${extension}`;
    const path = `empresas/${empresaId}/aim-desktop-releases/${version}/${fileName}`;
    const storageRef = ref(storage, path);

    // Generar checksum
    const checksum = await generateChecksum(binaryFile.file);

    // Subir archivo con progreso
    const uploadTask = uploadBytesResumable(storageRef, binaryFile.file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;

          // Actualizar progreso según plataforma
          if (binaryFile.platform === "windows") {
            setWindowsFile((prev) =>
              prev ? { ...prev, uploadProgress: progress } : null,
            );
          } else if (binaryFile.platform === "mac") {
            setMacFile((prev) =>
              prev ? { ...prev, uploadProgress: progress } : null,
            );
          } else {
            setLinuxFile((prev) =>
              prev ? { ...prev, uploadProgress: progress } : null,
            );
          }
        },
        (error) => {
          console.error("Error uploading file:", error);
          reject(error);
        },
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({
            url: downloadURL,
            checksum,
            size: binaryFile.file.size,
          });
        },
      );
    });
  };

  // Validar paso actual
  const validateCurrentStep = async () => {
    try {
      if (currentStep === 0) {
        // Paso 1: Información básica
        await form.validateFields(["version", "nombre", "descripcion"]);
        return true;
      } else if (currentStep === 1) {
        // Paso 2: Binarios
        if (!windowsFile && !macFile && !linuxFile) {
          message.error("Debes subir al menos un archivo binario");
          return false;
        }
        return true;
      } else if (currentStep === 2) {
        // Paso 3: Changelog
        const totalItems =
          nuevasFunciones.length +
          correcciones.length +
          mejoras.length +
          breakingChanges.length;

        if (totalItems === 0) {
          message.error("Debes agregar al menos un item al changelog");
          return false;
        }
        return true;
      } else if (currentStep === 3) {
        // Paso 4: Configuración
        await form.validateFields([
          "tipo",
          "prioridad",
          "obligatoria",
          "canal",
        ]);
        return true;
      }
      return true;
    } catch (error) {
      return false;
    }
  };

  // Siguiente paso
  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  // Paso anterior
  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  // Publicar versión
  const handlePublish = async () => {
    try {
      setLoading(true);

      // Validar todo el formulario
      const values = await form.validateFields();

      // Subir binarios
      const descargas: any = {};

      if (windowsFile) {
        message.loading({
          content: "Subiendo binario de Windows...",
          key: "upload",
        });
        const result = await uploadBinary(windowsFile, values.version);
        descargas.windows = {
          url: result.url,
          checksum: result.checksum,
          tamano: result.size,
          arquitectura: "x64",
        };
      }

      if (macFile) {
        message.loading({
          content: "Subiendo binario de macOS...",
          key: "upload",
        });
        const result = await uploadBinary(macFile, values.version);
        descargas.mac = {
          url: result.url,
          checksum: result.checksum,
          tamano: result.size,
          arquitectura: "universal",
        };
      }

      if (linuxFile) {
        message.loading({
          content: "Subiendo binario de Linux...",
          key: "upload",
        });
        const result = await uploadBinary(linuxFile, values.version);
        descargas.linux = {
          url: result.url,
          checksum: result.checksum,
          tamano: result.size,
          arquitectura: "x64",
        };
      }

      message.loading({ content: "Publicando versión...", key: "upload" });

      // Crear documento en Firestore
      const db = firestore;
      const versionId = `v${values.version}`;
      const versionData = {
        id: uuidv4(),
        version: values.version,
        versionCode: parseInt(values.version.replace(/\./g, "")),
        nombre: values.nombre,
        descripcion: values.descripcion,
        fechaPublicacion: new Date().toISOString(),
        tipo: values.tipo,
        prioridad: values.prioridad,
        obligatoria: values.obligatoria,
        changelog: {
          nuevas: nuevasFunciones,
          correcciones: correcciones,
          mejoras: mejoras,
          breaking: breakingChanges,
        },
        descargas,
        canal: values.canal,
        disponiblePara: ["all"],
        regionesDisponibles: ["all"],
        versionMinimaRequerida: "1.0.0",
        requiereReinicio: true,
        requiereMigracionDatos: false,
        activa: true,
        retirada: false,
        estadisticas: {
          descargas: 0,
          instalaciones: 0,
          errores: 0,
          rollbacks: 0,
        },
        creadoPor: "admin@crm.com", // TODO: Obtener del contexto
        emailCreador: "admin@crm.com",
        fechaCreacion: new Date().toISOString(),
        configuracion: {
          descargarEnSegundoPlano: true,
          notificarUsuario: true,
          permitirPosponer: !values.obligatoria,
          diasMaximoPosponer: 7,
          horaPreferidaInstalacion: "02:00",
        },
      };

      // Guardar versión específica
      const versionRef = doc(
        db,
        `empresas/${empresaId}/actualizaciones-software-aim/${versionId}`,
      );
      await setDoc(versionRef, versionData);

      // Actualizar "latest"
      const latestRef = doc(
        db,
        `empresas/${empresaId}/actualizaciones-software-aim/latest`,
      );
      await setDoc(latestRef, versionData);

      message.success({
        content: `Versión ${values.version} publicada exitosamente`,
        key: "upload",
      });

      // Cerrar modal y resetear
      handleClose();
    } catch (error) {
      console.error("Error al publicar versión:", error);
      message.error({ content: "Error al publicar la versión", key: "upload" });
    } finally {
      setLoading(false);
    }
  };

  // Cerrar modal
  const handleClose = () => {
    form.resetFields();
    setCurrentStep(0);
    setWindowsFile(null);
    setMacFile(null);
    setLinuxFile(null);
    setNuevasFunciones([]);
    setCorrecciones([]);
    setMejoras([]);
    setBreakingChanges([]);
    onClose();
  };

  // Manejar subida de archivo
  const handleFileUpload = (
    file: File,
    platform: "windows" | "mac" | "linux",
  ) => {
    const binaryFile: BinaryFile = {
      file,
      platform,
      uploadProgress: 0,
      uploading: false,
    };

    if (platform === "windows") {
      setWindowsFile(binaryFile);
    } else if (platform === "mac") {
      setMacFile(binaryFile);
    } else {
      setLinuxFile(binaryFile);
    }

    return false; // Prevenir subida automática
  };

  // Agregar item al changelog
  const agregarNuevaFuncion = () => {
    if (nuevaFuncionInput.trim()) {
      setNuevasFunciones([...nuevasFunciones, nuevaFuncionInput.trim()]);
      setNuevaFuncionInput("");
    }
  };

  const agregarCorreccion = () => {
    if (correccionInput.trim()) {
      setCorrecciones([...correcciones, correccionInput.trim()]);
      setCorreccionInput("");
    }
  };

  const agregarMejora = () => {
    if (mejoraInput.trim()) {
      setMejoras([...mejoras, mejoraInput.trim()]);
      setMejoraInput("");
    }
  };

  const agregarBreaking = () => {
    if (breakingInput.trim()) {
      setBreakingChanges([...breakingChanges, breakingInput.trim()]);
      setBreakingInput("");
    }
  };

  // Renderizar contenido según paso
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        // Paso 1: Información Básica
        return (
          <div>
            <Alert
              message="Información Básica de la Versión"
              description="Ingresa los datos principales de la nueva versión"
              type="info"
              icon={<InfoCircleOutlined />}
              showIcon
              className="mb-4"
            />

            <Form form={form} layout="vertical">
              <Form.Item
                label="Versión"
                name="version"
                rules={[
                  { required: true, message: "La versión es requerida" },
                  {
                    pattern: /^\d+\.\d+\.\d+$/,
                    message:
                      "Formato inválido. Use: MAJOR.MINOR.PATCH (ej: 1.5.3)",
                  },
                ]}
                extra="Formato SemVer: MAJOR.MINOR.PATCH (ej: 1.5.3)"
              >
                <Input placeholder="1.5.3" size="large" />
              </Form.Item>

              <Form.Item
                label="Nombre de la Versión"
                name="nombre"
                rules={[{ required: true, message: "El nombre es requerido" }]}
              >
                <Input
                  placeholder="Actualización de Primavera 2026"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                label="Descripción"
                name="descripcion"
                rules={[
                  { required: true, message: "La descripción es requerida" },
                ]}
              >
                <TextArea
                  rows={4}
                  placeholder="Breve descripción de los cambios principales..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Form>
          </div>
        );

      case 1:
        // Paso 2: Subir Binarios
        return (
          <div>
            <Alert
              message="Archivos Binarios"
              description="Sube los instaladores para cada plataforma. Los archivos se subirán a Firebase Storage."
              type="info"
              icon={<InboxOutlined />}
              showIcon
              className="mb-4"
            />

            <Space direction="vertical" style={{ width: "100%" }} size="large">
              {/* Windows */}
              <div>
                <Title level={5}>Windows (.exe)</Title>
                {!windowsFile ? (
                  <Dragger
                    accept=".exe"
                    beforeUpload={(file) => handleFileUpload(file, "windows")}
                    showUploadList={false}
                    maxCount={1}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                      Arrastra el archivo .exe aquí o haz clic para seleccionar
                    </p>
                    <p className="ant-upload-hint">Máximo 500 MB</p>
                  </Dragger>
                ) : (
                  <div className="border border-gray-300 rounded p-4">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        <Text strong>{windowsFile.file.name}</Text>
                        <Tag color="blue">
                          {(windowsFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </Tag>
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => setWindowsFile(null)}
                        >
                          Eliminar
                        </Button>
                      </Space>
                      {windowsFile.uploadProgress !== undefined &&
                        windowsFile.uploadProgress > 0 && (
                          <Progress
                            percent={Math.round(windowsFile.uploadProgress)}
                          />
                        )}
                    </Space>
                  </div>
                )}
              </div>

              {/* macOS */}
              <div>
                <Title level={5}>macOS (.dmg)</Title>
                {!macFile ? (
                  <Dragger
                    accept=".dmg"
                    beforeUpload={(file) => handleFileUpload(file, "mac")}
                    showUploadList={false}
                    maxCount={1}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                      Arrastra el archivo .dmg aquí o haz clic para seleccionar
                    </p>
                    <p className="ant-upload-hint">Máximo 500 MB</p>
                  </Dragger>
                ) : (
                  <div className="border border-gray-300 rounded p-4">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        <Text strong>{macFile.file.name}</Text>
                        <Tag color="blue">
                          {(macFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </Tag>
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => setMacFile(null)}
                        >
                          Eliminar
                        </Button>
                      </Space>
                      {macFile.uploadProgress !== undefined &&
                        macFile.uploadProgress > 0 && (
                          <Progress
                            percent={Math.round(macFile.uploadProgress)}
                          />
                        )}
                    </Space>
                  </div>
                )}
              </div>

              {/* Linux */}
              <div>
                <Title level={5}>Linux (.AppImage)</Title>
                {!linuxFile ? (
                  <Dragger
                    accept=".AppImage"
                    beforeUpload={(file) => handleFileUpload(file, "linux")}
                    showUploadList={false}
                    maxCount={1}
                  >
                    <p className="ant-upload-drag-icon">
                      <InboxOutlined />
                    </p>
                    <p className="ant-upload-text">
                      Arrastra el archivo .AppImage aquí o haz clic para
                      seleccionar
                    </p>
                    <p className="ant-upload-hint">Máximo 500 MB</p>
                  </Dragger>
                ) : (
                  <div className="border border-gray-300 rounded p-4">
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Space>
                        <CheckCircleOutlined style={{ color: "#52c41a" }} />
                        <Text strong>{linuxFile.file.name}</Text>
                        <Tag color="blue">
                          {(linuxFile.file.size / 1024 / 1024).toFixed(2)} MB
                        </Tag>
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => setLinuxFile(null)}
                        >
                          Eliminar
                        </Button>
                      </Space>
                      {linuxFile.uploadProgress !== undefined &&
                        linuxFile.uploadProgress > 0 && (
                          <Progress
                            percent={Math.round(linuxFile.uploadProgress)}
                          />
                        )}
                    </Space>
                  </div>
                )}
              </div>
            </Space>
          </div>
        );

      case 2:
        // Paso 3: Changelog
        return (
          <div>
            <Alert
              message="Notas de la Versión (Changelog)"
              description="Documenta los cambios incluidos en esta versión"
              type="info"
              icon={<FileTextOutlined />}
              showIcon
              className="mb-4"
            />

            <Space direction="vertical" style={{ width: "100%" }} size="large">
              {/* Nuevas Funciones */}
              <div>
                <Title level={5}>✨ Nuevas Funciones</Title>
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    placeholder="Ej: Sistema de actualización automática"
                    value={nuevaFuncionInput}
                    onChange={(e) => setNuevaFuncionInput(e.target.value)}
                    onPressEnter={agregarNuevaFuncion}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={agregarNuevaFuncion}
                  >
                    Agregar
                  </Button>
                </Space.Compact>
                {nuevasFunciones.length > 0 && (
                  <List
                    size="small"
                    className="mt-2"
                    dataSource={nuevasFunciones}
                    renderItem={(item, index) => (
                      <List.Item
                        actions={[
                          <Button
                            type="link"
                            danger
                            size="small"
                            onClick={() =>
                              setNuevasFunciones(
                                nuevasFunciones.filter((_, i) => i !== index),
                              )
                            }
                          >
                            Eliminar
                          </Button>,
                        ]}
                      >
                        {item}
                      </List.Item>
                    )}
                  />
                )}
              </div>

              {/* Mejoras */}
              <div>
                <Title level={5}>⚡ Mejoras</Title>
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    placeholder="Ej: Optimización de carga de imágenes"
                    value={mejoraInput}
                    onChange={(e) => setMejoraInput(e.target.value)}
                    onPressEnter={agregarMejora}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={agregarMejora}
                  >
                    Agregar
                  </Button>
                </Space.Compact>
                {mejoras.length > 0 && (
                  <List
                    size="small"
                    className="mt-2"
                    dataSource={mejoras}
                    renderItem={(item, index) => (
                      <List.Item
                        actions={[
                          <Button
                            type="link"
                            danger
                            size="small"
                            onClick={() =>
                              setMejoras(mejoras.filter((_, i) => i !== index))
                            }
                          >
                            Eliminar
                          </Button>,
                        ]}
                      >
                        {item}
                      </List.Item>
                    )}
                  />
                )}
              </div>

              {/* Correcciones */}
              <div>
                <Title level={5}>🐛 Correcciones</Title>
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    placeholder="Ej: Corregido bug en login"
                    value={correccionInput}
                    onChange={(e) => setCorreccionInput(e.target.value)}
                    onPressEnter={agregarCorreccion}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={agregarCorreccion}
                  >
                    Agregar
                  </Button>
                </Space.Compact>
                {correcciones.length > 0 && (
                  <List
                    size="small"
                    className="mt-2"
                    dataSource={correcciones}
                    renderItem={(item, index) => (
                      <List.Item
                        actions={[
                          <Button
                            type="link"
                            danger
                            size="small"
                            onClick={() =>
                              setCorrecciones(
                                correcciones.filter((_, i) => i !== index),
                              )
                            }
                          >
                            Eliminar
                          </Button>,
                        ]}
                      >
                        {item}
                      </List.Item>
                    )}
                  />
                )}
              </div>

              {/* Breaking Changes */}
              <div>
                <Title level={5}>⚠️ Cambios Importantes</Title>
                <Space.Compact style={{ width: "100%" }}>
                  <Input
                    placeholder="Ej: Cambio en estructura de base de datos"
                    value={breakingInput}
                    onChange={(e) => setBreakingInput(e.target.value)}
                    onPressEnter={agregarBreaking}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={agregarBreaking}
                  >
                    Agregar
                  </Button>
                </Space.Compact>
                {breakingChanges.length > 0 && (
                  <List
                    size="small"
                    className="mt-2"
                    dataSource={breakingChanges}
                    renderItem={(item, index) => (
                      <List.Item
                        actions={[
                          <Button
                            type="link"
                            danger
                            size="small"
                            onClick={() =>
                              setBreakingChanges(
                                breakingChanges.filter((_, i) => i !== index),
                              )
                            }
                          >
                            Eliminar
                          </Button>,
                        ]}
                      >
                        {item}
                      </List.Item>
                    )}
                  />
                )}
              </div>
            </Space>
          </div>
        );

      case 3:
        // Paso 4: Configuración
        return (
          <div>
            <Alert
              message="Configuración de la Versión"
              description="Define el tipo, prioridad y opciones de distribución"
              type="info"
              icon={<SettingOutlined />}
              showIcon
              className="mb-4"
            />

            <Form form={form} layout="vertical">
              <Form.Item
                label="Tipo de Versión"
                name="tipo"
                initialValue="minor"
                rules={[{ required: true }]}
              >
                <Select size="large">
                  <Option value="major">
                    <Space>
                      <Tag color="purple">MAJOR</Tag>
                      <Text>Cambios importantes (1.0.0 → 2.0.0)</Text>
                    </Space>
                  </Option>
                  <Option value="minor">
                    <Space>
                      <Tag color="blue">MINOR</Tag>
                      <Text>Nuevas funciones (1.0.0 → 1.1.0)</Text>
                    </Space>
                  </Option>
                  <Option value="patch">
                    <Space>
                      <Tag color="green">PATCH</Tag>
                      <Text>Correcciones (1.0.0 → 1.0.1)</Text>
                    </Space>
                  </Option>
                  <Option value="hotfix">
                    <Space>
                      <Tag color="red">HOTFIX</Tag>
                      <Text>Corrección urgente</Text>
                    </Space>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Prioridad"
                name="prioridad"
                initialValue="media"
                rules={[{ required: true }]}
              >
                <Select size="large">
                  <Option value="critica">
                    <Tag color="red">CRÍTICA</Tag>
                  </Option>
                  <Option value="alta">
                    <Tag color="orange">ALTA</Tag>
                  </Option>
                  <Option value="media">
                    <Tag color="blue">MEDIA</Tag>
                  </Option>
                  <Option value="baja">
                    <Tag color="green">BAJA</Tag>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Canal de Distribución"
                name="canal"
                initialValue="stable"
                rules={[{ required: true }]}
              >
                <Select size="large">
                  <Option value="stable">
                    <Space>
                      <Tag color="green">STABLE</Tag>
                      <Text>Producción</Text>
                    </Space>
                  </Option>
                  <Option value="beta">
                    <Space>
                      <Tag color="orange">BETA</Tag>
                      <Text>Pruebas públicas</Text>
                    </Space>
                  </Option>
                  <Option value="alpha">
                    <Space>
                      <Tag color="red">ALPHA</Tag>
                      <Text>Desarrollo</Text>
                    </Space>
                  </Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Actualización Obligatoria"
                name="obligatoria"
                valuePropName="checked"
                initialValue={false}
              >
                <Switch />
              </Form.Item>
              <Paragraph type="secondary" style={{ marginTop: -16 }}>
                Si está activado, los usuarios deberán actualizar
                obligatoriamente
              </Paragraph>
            </Form>
          </div>
        );

      case 4:
        // Paso 5: Revisión
        const formValues = form.getFieldsValue();
        return (
          <div>
            <Alert
              message="Revisión Final"
              description="Verifica que toda la información sea correcta antes de publicar"
              type="warning"
              icon={<CheckCircleOutlined />}
              showIcon
              className="mb-4"
            />

            <Space direction="vertical" style={{ width: "100%" }} size="large">
              <div>
                <Title level={5}>Información Básica</Title>
                <Paragraph>
                  <Text strong>Versión:</Text> v{formValues.version}
                </Paragraph>
                <Paragraph>
                  <Text strong>Nombre:</Text> {formValues.nombre}
                </Paragraph>
                <Paragraph>
                  <Text strong>Descripción:</Text> {formValues.descripcion}
                </Paragraph>
              </div>

              <Divider />

              <div>
                <Title level={5}>Binarios</Title>
                {windowsFile && (
                  <Paragraph>
                    ✅ Windows: {windowsFile.file.name} (
                    {(windowsFile.file.size / 1024 / 1024).toFixed(2)} MB)
                  </Paragraph>
                )}
                {macFile && (
                  <Paragraph>
                    ✅ macOS: {macFile.file.name} (
                    {(macFile.file.size / 1024 / 1024).toFixed(2)} MB)
                  </Paragraph>
                )}
                {linuxFile && (
                  <Paragraph>
                    ✅ Linux: {linuxFile.file.name} (
                    {(linuxFile.file.size / 1024 / 1024).toFixed(2)} MB)
                  </Paragraph>
                )}
              </div>

              <Divider />

              <div>
                <Title level={5}>Changelog</Title>
                {nuevasFunciones.length > 0 && (
                  <>
                    <Text strong>Nuevas Funciones:</Text>
                    <ul>
                      {nuevasFunciones.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
                {mejoras.length > 0 && (
                  <>
                    <Text strong>Mejoras:</Text>
                    <ul>
                      {mejoras.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
                {correcciones.length > 0 && (
                  <>
                    <Text strong>Correcciones:</Text>
                    <ul>
                      {correcciones.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
                {breakingChanges.length > 0 && (
                  <>
                    <Text strong>Cambios Importantes:</Text>
                    <ul>
                      {breakingChanges.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <Divider />

              <div>
                <Title level={5}>Configuración</Title>
                <Paragraph>
                  <Text strong>Tipo:</Text>{" "}
                  <Tag color={formValues.tipo === "major" ? "purple" : "blue"}>
                    {formValues.tipo?.toUpperCase()}
                  </Tag>
                </Paragraph>
                <Paragraph>
                  <Text strong>Prioridad:</Text>{" "}
                  <Tag
                    color={
                      formValues.prioridad === "critica"
                        ? "red"
                        : formValues.prioridad === "alta"
                          ? "orange"
                          : "blue"
                    }
                  >
                    {formValues.prioridad?.toUpperCase()}
                  </Tag>
                </Paragraph>
                <Paragraph>
                  <Text strong>Canal:</Text>{" "}
                  <Tag color="green">{formValues.canal?.toUpperCase()}</Tag>
                </Paragraph>
                <Paragraph>
                  <Text strong>Obligatoria:</Text>{" "}
                  {formValues.obligatoria ? (
                    <Tag color="red">SÍ</Tag>
                  ) : (
                    <Tag color="green">NO</Tag>
                  )}
                </Paragraph>
              </div>
            </Space>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      title="Publicar Nueva Versión - AIM Desktop"
      open={visible}
      onCancel={handleClose}
      width={800}
      footer={null}
      destroyOnClose
    >
      <Steps current={currentStep} className="mb-6">
        <Step title="Información" icon={<InfoCircleOutlined />} />
        <Step title="Binarios" icon={<InboxOutlined />} />
        <Step title="Changelog" icon={<FileTextOutlined />} />
        <Step title="Configuración" icon={<SettingOutlined />} />
        <Step title="Revisión" icon={<CheckCircleOutlined />} />
      </Steps>

      <div style={{ minHeight: 400 }}>{renderStepContent()}</div>

      <Divider />

      <div style={{ textAlign: "right" }}>
        <Space>
          {currentStep > 0 && (
            <Button onClick={handlePrev} disabled={loading}>
              Anterior
            </Button>
          )}
          {currentStep < 4 && (
            <Button type="primary" onClick={handleNext} disabled={loading}>
              Siguiente
            </Button>
          )}
          {currentStep === 4 && (
            <Button type="primary" onClick={handlePublish} loading={loading}>
              Publicar Versión
            </Button>
          )}
        </Space>
      </div>
    </Modal>
  );
};

export default ModalPublicarVersion;
