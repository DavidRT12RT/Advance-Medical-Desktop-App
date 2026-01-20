import React, { useState, useMemo, useEffect } from "react";
import { Modal, Checkbox, Button, Divider, message, Spin, Input } from "antd";
import {
  FilePdfOutlined,
  DownloadOutlined,
  EditOutlined,
} from "@ant-design/icons";
import { pdf } from "@react-pdf/renderer";
import ReportePDFDocument, {
  ReportConfig,
  ImagenSeleccionada,
} from "./ReportePDFDocument";
import FirebaseConfiguraciones from "../../features/FirebaseConfiguraciones";
import { useElectronStore } from "../../hooks/useElectronStore";

interface ModalGenerarReporteProps {
  isOpen: boolean;
  onClose: () => void;
  estudio: any;
  paciente: any;
}

const ModalGenerarReporte: React.FC<ModalGenerarReporteProps> = ({
  isOpen,
  onClose,
  estudio,
  paciente,
}) => {
  const { user } = useElectronStore();

  const empresaId = user?.empresa?.id;
  const idOrganizacion = user?.usuarioDetail?.idOrganizacion;
  const idUsuario = user?.usuarioDetail?.id;

  const configuracionReporte =
    user?.usuarioDetail?.configuraciones?.configuracionReporte;
  const configuracionDatosMedicos =
    user?.usuarioDetail?.configuraciones?.configuracionDatosMedicos;
  const organizacion = user?.organizacion;

  const [generando, setGenerando] = useState(false);
  const [cargandoConfig, setCargandoConfig] = useState(false);

  // Config state con valores por defecto
  const [config, setConfig] = useState<ReportConfig>({
    incluirDatosClinica: true,
    incluirDatosMedico: true,
    incluirDatosAnestesiologo: false,
    incluirDatosAsistente: false,
    incluirDatosPaciente: true, // Obligatorio
    incluirResultado: true,
    incluirHallazgos: true,
    incluirPolipos: true,
    incluirMedicamentos: true,
    incluirComplicaciones: false,
    incluirSeguimiento: true,
    incluirSedacion: true, // Obligatorio
    incluirEquipo: true,
    incluirAnalisisIA: true,
    imagenesSeleccionadas: [],
  });

  // Cargar configuración del usuario al abrir el modal o cuando cambie la configuración
  useEffect(() => {
    if (isOpen) {
      cargarConfiguracionUsuario();
    }
  }, [isOpen, configuracionReporte]);

  const cargarConfiguracionUsuario = () => {
    try {
      setCargandoConfig(true);

      // Siempre resetear con la configuración actual del usuario
      if (configuracionReporte) {
        setConfig({
          ...configuracionReporte,
          // Asegurar que los obligatorios siempre estén activos
          incluirDatosPaciente: true,
          incluirSedacion: true,
          // Resetear imágenes seleccionadas al abrir el modal
          imagenesSeleccionadas: [],
        });
      } else {
        // Si no hay configuración, usar valores por defecto
        setConfig({
          incluirDatosClinica: true,
          incluirDatosMedico: true,
          incluirDatosAnestesiologo: false,
          incluirDatosAsistente: false,
          incluirDatosPaciente: true,
          incluirResultado: true,
          incluirHallazgos: true,
          incluirPolipos: true,
          incluirMedicamentos: true,
          incluirComplicaciones: false,
          incluirSeguimiento: true,
          incluirSedacion: true,
          incluirEquipo: true,
          incluirAnalisisIA: true,
          imagenesSeleccionadas: [],
        });
      }
    } catch (error) {
      console.error("Error cargando configuración del usuario:", error);
    } finally {
      setCargandoConfig(false);
    }
  };

  // Obtener imágenes de todas las sesiones AI
  const todasLasImagenes = useMemo(() => {
    const aiSessions = Array.isArray(estudio?.secciones_ai)
      ? estudio.secciones_ai
      : [];
    const images: string[] = [];
    aiSessions.forEach((session: any) => {
      if (Array.isArray(session?.polypImages)) {
        images.push(...session.polypImages);
      }
    });
    return images;
  }, [estudio]);

  const handleConfigChange = async (
    key: keyof ReportConfig,
    value: boolean
  ) => {
    // Actualizar estado local
    setConfig((prev) => ({ ...prev, [key]: value }));

    // Guardar automáticamente en la configuración del usuario
    if (
      empresaId &&
      idOrganizacion &&
      idUsuario &&
      key !== "imagenesSeleccionadas" &&
      configuracionReporte
    ) {
      try {
        const nuevaConfig = { ...config, [key]: value };
        // Remover imagenesSeleccionadas antes de guardar
        const { imagenesSeleccionadas, ...configParaGuardar } = nuevaConfig;

        await FirebaseConfiguraciones.actualizarConfiguracionReporte(
          empresaId,
          idOrganizacion,
          idUsuario,
          configParaGuardar
        );
      } catch (error) {
        console.error("Error guardando configuración:", error);
      }
    }
  };

  const MAX_IMAGES = 10;

  const handleImageToggle = (url: string) => {
    setConfig((prev) => {
      const existingImage = prev.imagenesSeleccionadas.find(
        (img) => img.url === url
      );
      // If trying to add and already at max, show warning
      if (!existingImage && prev.imagenesSeleccionadas.length >= MAX_IMAGES) {
        message.warning(
          `Máximo ${MAX_IMAGES} imágenes permitidas en el reporte`
        );
        return prev;
      }
      return {
        ...prev,
        imagenesSeleccionadas: existingImage
          ? prev.imagenesSeleccionadas.filter((img) => img.url !== url)
          : [...prev.imagenesSeleccionadas, { url, titulo: "" }],
      };
    });
  };

  const handleImageTitleChange = (url: string, titulo: string) => {
    setConfig((prev) => ({
      ...prev,
      imagenesSeleccionadas: prev.imagenesSeleccionadas.map((img) =>
        img.url === url ? { ...img, titulo } : img
      ),
    }));
  };

  const handleSelectAllImages = () => {
    // Only select up to MAX_IMAGES
    const imagesToSelect: ImagenSeleccionada[] = todasLasImagenes
      .slice(0, MAX_IMAGES)
      .map((url) => ({ url, titulo: "" }));
    if (todasLasImagenes.length > MAX_IMAGES) {
      message.info(
        `Se seleccionaron las primeras ${MAX_IMAGES} imágenes (máximo permitido)`
      );
    }
    setConfig((prev) => ({
      ...prev,
      imagenesSeleccionadas: imagesToSelect,
    }));
  };

  const handleDeselectAllImages = () => {
    setConfig((prev) => ({
      ...prev,
      imagenesSeleccionadas: [],
    }));
  };

  const handleGenerarPDF = async () => {
    try {
      setGenerando(true);

      const doc = (
        <ReportePDFDocument
          estudio={estudio}
          paciente={paciente}
          config={config}
          organizacion={organizacion}
          configuracionMedica={configuracionDatosMedicos}
          nombreDoctor={user?.usuarioDetail?.nombre}
        />
      );
      const blob = await pdf(doc).toBlob();

      // Crear nombre del archivo
      const nombrePaciente = paciente
        ? [paciente.nombres, paciente.apellidoPaterno]
            .filter(Boolean)
            .join("_")
            .replace(/\s+/g, "_")
        : "paciente";
      const fecha = estudio?.fecha || new Date().toISOString().split("T")[0];
      const tipo = estudio?.tipo || "estudio";
      const fileName = `Reporte_${tipo}_${nombrePaciente}_${fecha}.pdf`;

      // Descargar archivo
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success("Reporte PDF generado exitosamente");
      onClose();
    } catch (error) {
      console.error("Error generando PDF:", error);
      message.error("Error al generar el reporte PDF");
    } finally {
      setGenerando(false);
    }
  };

  const sectionCheckboxStyle = "flex items-center gap-2 py-1";

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      centered
      width={800}
      title={
        <div className="flex items-center gap-2">
          <FilePdfOutlined className="text-red-500 text-xl" />
          <span className="text-lg font-semibold text-gray-800">
            Generar Reporte PDF
          </span>
        </div>
      }
    >
      <div className="space-y-6 py-4">
        {/* Sección: Datos Generales */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Datos Generales
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={true}
                disabled
                onChange={(e) =>
                  handleConfigChange("incluirDatosPaciente", e.target.checked)
                }
              >
                Datos del paciente
              </Checkbox>
              <span className="text-xs text-red-500">(Obligatorio)</span>
            </div>
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirDatosClinica}
                onChange={(e) =>
                  handleConfigChange("incluirDatosClinica", e.target.checked)
                }
              >
                Datos de la clínica
              </Checkbox>
            </div>
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirDatosMedico}
                onChange={(e) =>
                  handleConfigChange("incluirDatosMedico", e.target.checked)
                }
              >
                Médico tratante
              </Checkbox>
            </div>
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirDatosAnestesiologo}
                onChange={(e) =>
                  handleConfigChange(
                    "incluirDatosAnestesiologo",
                    e.target.checked
                  )
                }
              >
                Anestesiólogo
              </Checkbox>
            </div>
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirDatosAsistente}
                onChange={(e) =>
                  handleConfigChange("incluirDatosAsistente", e.target.checked)
                }
              >
                Asistente
              </Checkbox>
            </div>
          </div>
        </div>

        <Divider className="my-4" />

        {/* Sección: Información Clínica */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Información Clínica
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirResultado}
                onChange={(e) =>
                  handleConfigChange("incluirResultado", e.target.checked)
                }
              >
                Resultado general
              </Checkbox>
            </div>
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirHallazgos}
                onChange={(e) =>
                  handleConfigChange("incluirHallazgos", e.target.checked)
                }
              >
                Hallazgos
              </Checkbox>
            </div>
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirPolipos}
                onChange={(e) =>
                  handleConfigChange("incluirPolipos", e.target.checked)
                }
              >
                Detalle de pólipos
              </Checkbox>
            </div>
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirMedicamentos}
                onChange={(e) =>
                  handleConfigChange("incluirMedicamentos", e.target.checked)
                }
              >
                Medicamentos
              </Checkbox>
            </div>
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirComplicaciones}
                onChange={(e) =>
                  handleConfigChange("incluirComplicaciones", e.target.checked)
                }
              >
                Complicaciones
              </Checkbox>
            </div>
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirSeguimiento}
                onChange={(e) =>
                  handleConfigChange("incluirSeguimiento", e.target.checked)
                }
              >
                Plan de seguimiento
              </Checkbox>
            </div>
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={true}
                disabled
                onChange={(e) =>
                  handleConfigChange("incluirSedacion", e.target.checked)
                }
              >
                Método de sedación
              </Checkbox>
              <span className="text-xs text-red-500">(Obligatorio)</span>
            </div>
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirEquipo}
                onChange={(e) =>
                  handleConfigChange("incluirEquipo", e.target.checked)
                }
              >
                Equipo utilizado
              </Checkbox>
            </div>
          </div>
        </div>

        <Divider className="my-4" />

        {/* Sección: Análisis de IA */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Análisis de IA
          </h3>
          <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
            <div className={sectionCheckboxStyle}>
              <Checkbox
                checked={config.incluirAnalisisIA}
                onChange={(e) =>
                  handleConfigChange("incluirAnalisisIA", e.target.checked)
                }
              >
                Incluir resultados del análisis de IA (CNN y LLM)
              </Checkbox>
            </div>
          </div>
        </div>

        <Divider className="my-4" />

        {/* Sección: Imágenes */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Imágenes del Estudio
            </h3>
            {todasLasImagenes.length > 0 && (
              <div className="flex gap-2">
                <Button size="small" onClick={handleSelectAllImages}>
                  Seleccionar todas
                </Button>
                <Button size="small" onClick={handleDeselectAllImages}>
                  Deseleccionar todas
                </Button>
              </div>
            )}
          </div>

          {todasLasImagenes.length === 0 ? (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 text-center">
              <p className="text-sm text-gray-500">
                No hay imágenes disponibles para este estudio
              </p>
            </div>
          ) : (
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-gray-400">
                  {config.imagenesSeleccionadas.length} de{" "}
                  {Math.min(todasLasImagenes.length, MAX_IMAGES)} imágenes
                  seleccionadas
                  <span className="text-yellow-400 ml-2">
                    (máx. {MAX_IMAGES})
                  </span>
                </span>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-48 overflow-auto pr-1">
                {todasLasImagenes.map((url, idx) => {
                  const isSelected = config.imagenesSeleccionadas.some(
                    (img) => img.url === url
                  );
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleImageToggle(url)}
                      className={`relative group rounded-md overflow-hidden border-2 transition focus:outline-none ${
                        isSelected
                          ? "border-indigo-500 ring-2 ring-indigo-400"
                          : "border-gray-700 hover:border-gray-500"
                      }`}
                    >
                      <img
                        src={url}
                        alt={`Imagen ${idx + 1}`}
                        className={`w-full h-16 object-cover transition ${
                          isSelected
                            ? "opacity-100"
                            : "opacity-60 group-hover:opacity-100"
                        }`}
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-indigo-500/20 flex items-center justify-center">
                          <span className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center">
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </span>
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-0.5 px-1 py-0.5 rounded bg-black/70 text-[9px] text-gray-100">
                        #{idx + 1}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Títulos para imágenes seleccionadas */}
              {config.imagenesSeleccionadas.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <EditOutlined /> Agregar títulos a las imágenes
                    seleccionadas:
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-auto">
                    {config.imagenesSeleccionadas.map((img, idx) => (
                      <div
                        key={img.url}
                        className="flex items-center gap-2 bg-gray-800 p-2 rounded"
                      >
                        <img
                          src={img.url}
                          alt={`Imagen ${idx + 1}`}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <Input
                          size="small"
                          placeholder={`Título imagen ${idx + 1}`}
                          value={img.titulo}
                          onChange={(e) =>
                            handleImageTitleChange(img.url, e.target.value)
                          }
                          className="flex-1 bg-gray-700 border-gray-600 text-white text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <Divider className="my-4" />

        {/* Botones de acción */}
        <div className="flex justify-end gap-3">
          <Button onClick={onClose} disabled={generando}>
            Cancelar
          </Button>
          <Button
            type="primary"
            icon={generando ? <Spin size="small" /> : <DownloadOutlined />}
            onClick={handleGenerarPDF}
            loading={generando}
            className="bg-red-500 hover:bg-red-600 border-red-500"
          >
            {generando ? "Generando..." : "Generar y Descargar PDF"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModalGenerarReporte;
