import React, { useState, useMemo, useEffect, useRef } from "react";
import { Modal, Checkbox, Button, Divider, message, Spin, Input } from "antd";
import {
  FilePdfOutlined,
  DownloadOutlined,
  EditOutlined,
  BgColorsOutlined,
  EyeOutlined,
  PrinterOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { pdf } from "@react-pdf/renderer";
import ReportePDFDocument, {
  ReportConfig,
  ImagenSeleccionada,
} from "./ReportePDFDocument";
import FirebaseConfiguraciones from "../../features/FirebaseConfiguraciones";
import { useElectronStore } from "../../hooks/useElectronStore";
import ImageEditorModal from "./ImageEditorModal";

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
  const [exportando, setExportando] = useState(false);
  const [cargandoConfig, setCargandoConfig] = useState(false);
  // Vista previa del PDF (blob URL renderizado en el visor de Chromium)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  // La impresión usa el iframe de la vista previa: solo se permite cuando el
  // PDF vigente ya terminó de regenerarse Y de cargarse en el iframe
  const [previewLista, setPreviewLista] = useState(false);
  const previewIframeRef = useRef<HTMLIFrameElement | null>(null);
  const [editingImageUrl, setEditingImageUrl] = useState<string | null>(null);
  const [editedImages, setEditedImages] = useState<Map<string, string>>(
    new Map(),
  );

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

  // Obtener capturas manuales de todas las sesiones
  const capturasManualesTodas = useMemo(() => {
    const aiSessions = Array.isArray(estudio?.secciones_ai)
      ? estudio.secciones_ai
      : [];
    const images: string[] = [];
    aiSessions.forEach((session: any) => {
      if (Array.isArray(session?.manualScreenshots)) {
        images.push(...session.manualScreenshots);
      }
    });
    return images;
  }, [estudio]);

  // Obtener imágenes automáticas de pólipos detectados por IA
  const imagenesAutomaticasIA = useMemo(() => {
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

  // Todas las imágenes combinadas para el contador total
  const todasLasImagenes = useMemo(() => {
    return [...capturasManualesTodas, ...imagenesAutomaticasIA];
  }, [capturasManualesTodas, imagenesAutomaticasIA]);

  const handleConfigChange = async (
    key: keyof ReportConfig,
    value: boolean,
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
          configParaGuardar,
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
        (img) => img.url === url,
      );
      // If trying to add and already at max, show warning
      if (!existingImage && prev.imagenesSeleccionadas.length >= MAX_IMAGES) {
        message.warning(
          `Máximo ${MAX_IMAGES} imágenes permitidas en el reporte`,
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
        img.url === url ? { ...img, titulo } : img,
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
        `Se seleccionaron las primeras ${MAX_IMAGES} imágenes (máximo permitido)`,
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

  const handleEditImage = (url: string) => {
    setEditingImageUrl(url);
  };

  const handleSaveEditedImage = (originalUrl: string, editedUrl: string) => {
    setEditedImages((prev) => {
      const newMap = new Map(prev);
      newMap.set(originalUrl, editedUrl);
      return newMap;
    });
    setEditingImageUrl(null);
    message.success("Imagen editada correctamente");
  };

  const getDisplayUrl = (originalUrl: string) => {
    return editedImages.get(originalUrl) || originalUrl;
  };

  // Construye el documento PDF con la configuración actual (compartido por
  // la vista previa y la descarga)
  const construirDocumento = () => {
    const configConImagenesEditadas = {
      ...config,
      imagenesSeleccionadas: config.imagenesSeleccionadas.map((img) => ({
        ...img,
        url: getDisplayUrl(img.url), // Usar imagen editada si existe
      })),
    };
    return (
      <ReportePDFDocument
        estudio={estudio}
        paciente={paciente}
        config={configConImagenesEditadas}
        organizacion={organizacion}
        configuracionMedica={configuracionDatosMedicos}
        nombreDoctor={user?.usuarioDetail?.nombre}
      />
    );
  };

  // Vista previa en vivo: se regenera con debounce cada vez que cambia la
  // configuración o las imágenes seleccionadas/editadas
  useEffect(() => {
    if (!isOpen) return;
    let cancelado = false;
    setPreviewLoading(true);
    const timer = setTimeout(async () => {
      try {
        const blob = await pdf(construirDocumento()).toBlob();
        if (cancelado) return;
        setPreviewLista(false);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return URL.createObjectURL(blob);
        });
      } catch (error) {
        console.error("Error generando vista previa:", error);
      } finally {
        if (!cancelado) setPreviewLoading(false);
      }
    }, 600);
    return () => {
      cancelado = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, config, editedImages]);

  // Limpiar la URL del blob al cerrar el modal
  useEffect(() => {
    if (!isOpen && previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleGenerarPDF = async () => {
    try {
      setGenerando(true);

      const blob = await pdf(construirDocumento()).toBlob();

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

  // Exportar la carpeta del estudio (reporte PDF + fotografías + video) a la
  // ubicación que elija el usuario (USB, disco externo...). Los archivos van
  // nombrados con los datos del paciente para identificarlos fácilmente.
  const handleExportarCarpeta = async () => {
    const api = (window as any).estudioExport;
    if (!api?.exportarCarpeta) {
      message.error(
        "La exportación no está disponible. Cierra y vuelve a abrir la aplicación e inténtalo de nuevo.",
      );
      return;
    }

    try {
      setExportando(true);

      const nombreCompleto =
        [paciente?.nombres, paciente?.apellidoPaterno, paciente?.apellidoMaterno]
          .filter(Boolean)
          .join(" ") || "Paciente";
      const tipo = estudio?.tipo || "Estudio";
      const fecha = estudio?.fecha || new Date().toISOString().split("T")[0];
      // Nombre base con los datos del paciente, sin caracteres inválidos
      const base = `${nombreCompleto} - ${tipo} - ${fecha}`.replace(
        /[\\/:*?"<>|]/g,
        "-",
      );

      const archivos: { nombre: string; dataBase64?: string; url?: string }[] =
        [];

      // 1) Reporte PDF con la configuración actual del modal
      const blob = await pdf(construirDocumento()).toBlob();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () =>
          resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      archivos.push({ nombre: `${base} - Reporte.pdf`, dataBase64: pdfBase64 });

      // 2) Todas las fotografías del estudio (con edición aplicada si existe).
      // Las editadas viven como blob:/data: URLs del renderer — el main
      // process no puede descargarlas, así que se convierten a base64 aquí.
      for (let idx = 0; idx < todasLasImagenes.length; idx++) {
        const displayUrl = getDisplayUrl(todasLasImagenes[idx]);
        const num = String(idx + 1).padStart(2, "0");
        const ext =
          displayUrl.match(/\.(png|jpe?g|webp)(\?|$)/i)?.[1] || "jpg";
        const nombre = `${base} - Foto ${num}.${ext}`;
        try {
          if (
            displayUrl.startsWith("data:") ||
            displayUrl.startsWith("blob:")
          ) {
            const fotoBlob = await fetch(displayUrl).then((r) => r.blob());
            const fotoBase64 = await new Promise<string>(
              (resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () =>
                  resolve(String(reader.result).split(",")[1] || "");
                reader.onerror = reject;
                reader.readAsDataURL(fotoBlob);
              },
            );
            archivos.push({ nombre, dataBase64: fotoBase64 });
          } else {
            archivos.push({ nombre, url: displayUrl });
          }
        } catch (error) {
          console.error(`Error preparando ${nombre}:`, error);
        }
      }

      // 3) Videos de las sesiones del estudio
      const videos = (
        Array.isArray(estudio?.secciones_ai) ? estudio.secciones_ai : []
      )
        .map((sesion: any) => sesion?.videoUrl)
        .filter(Boolean);
      videos.forEach((url: string, idx: number) => {
        const num = String(idx + 1).padStart(2, "0");
        archivos.push({ nombre: `${base} - Video ${num}.webm`, url });
      });

      const resultado = await api.exportarCarpeta({
        nombreCarpeta: base,
        archivos,
      });

      if (resultado?.canceled) return;
      if (!resultado?.success) {
        message.error(resultado?.error || "Error al exportar la carpeta");
        return;
      }
      if (resultado.errores?.length) {
        message.warning(
          `Carpeta guardada en ${resultado.destino}, pero ${resultado.errores.length} archivo(s) no se pudieron descargar`,
        );
      } else {
        message.success(
          `Carpeta del estudio guardada (${resultado.guardados} archivos) en: ${resultado.destino}`,
        );
      }
    } catch (error) {
      console.error("Error exportando carpeta del estudio:", error);
      message.error("Error al exportar la carpeta del estudio");
    } finally {
      setExportando(false);
    }
  };

  // Imprimir el reporte directamente desde la ventana, usando el PDF de la
  // vista previa ya renderizado en el iframe
  const handleImprimir = () => {
    const iframe = previewIframeRef.current;
    if (!iframe?.contentWindow || !previewUrl || previewLoading || !previewLista) {
      message.warning("Espera a que la vista previa termine de actualizarse");
      return;
    }
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
  };

  const sectionCheckboxStyle = "flex items-center gap-2 py-1";

  return (
    <Modal
      open={isOpen}
      onCancel={() => {
        if (!generando && !exportando) onClose();
      }}
      closable={!generando && !exportando}
      maskClosable={!generando && !exportando}
      keyboard={!generando && !exportando}
      footer={null}
      centered
      width="94vw"
      style={{ top: 16, maxWidth: 1500 }}
      title={
        <div className="flex items-center gap-2">
          <FilePdfOutlined className="text-red-500 text-xl" />
          <span className="text-lg font-semibold text-gray-800">
            Generar Reporte PDF
          </span>
        </div>
      }
    >
      <div className="flex gap-5 pt-2" style={{ height: "82vh" }}>
      {/* Columna izquierda: configuración (scroll propio) + acciones fijas */}
      <div className="w-[440px] shrink-0 flex flex-col min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto pr-3 space-y-5">
        {/* Sección: Datos Generales */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
            Datos Generales
          </h3>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 bg-gray-50 p-3.5 rounded-lg border border-gray-100">
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
                    e.target.checked,
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
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 bg-gray-50 p-3.5 rounded-lg border border-gray-100">
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
            <div className="space-y-4">
              {/* Capturas Manuales */}
              {capturasManualesTodas.length > 0 && (
                <div className="bg-blue-900/20 p-4 rounded-lg border-2 border-blue-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
                      Capturas Manuales
                    </h4>
                    <span className="text-xs text-blue-400">
                      {capturasManualesTodas.length}{" "}
                      {capturasManualesTodas.length === 1
                        ? "imagen"
                        : "imágenes"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-48 overflow-auto pr-1">
                    {capturasManualesTodas.map((url, idx) => {
                      const displayUrl = getDisplayUrl(url);
                      const isSelected = config.imagenesSeleccionadas.some(
                        (img) => img.url === url,
                      );
                      const isEdited = editedImages.has(url);
                      return (
                        <div key={idx} className="relative group">
                          <button
                            type="button"
                            onClick={() => handleImageToggle(url)}
                            className={`relative rounded-md overflow-hidden border-2 transition focus:outline-none w-full ${
                              isSelected
                                ? "border-blue-400 ring-2 ring-blue-300"
                                : "border-blue-700 hover:border-blue-500"
                            }`}
                          >
                            <img
                              src={displayUrl}
                              alt={`Captura manual ${idx + 1}`}
                              className={`w-full h-16 object-cover transition ${
                                isSelected
                                  ? "opacity-100"
                                  : "opacity-60 group-hover:opacity-100"
                              }`}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center pointer-events-none">
                                <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
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
                            <span className="absolute bottom-0.5 right-0.5 px-1 py-0.5 rounded bg-blue-600 text-[9px] text-white font-semibold pointer-events-none">
                              #{idx + 1}
                            </span>
                            {isEdited && (
                              <span className="absolute top-0.5 right-0.5 px-1 py-0.5 rounded bg-green-600 text-[8px] text-white font-semibold pointer-events-none">
                                Editada
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditImage(url);
                            }}
                            className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 hover:bg-white rounded-full p-2 shadow-xl z-20 border border-blue-300"
                            title="Editar imagen"
                          >
                            <BgColorsOutlined className="text-blue-600 text-base" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Detecciones Automáticas IA */}
              {imagenesAutomaticasIA.length > 0 && (
                <div className="bg-green-900/20 p-4 rounded-lg border-2 border-green-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-green-300 uppercase tracking-wide">
                      Detecciones Automáticas IA
                    </h4>
                    <span className="text-xs text-green-400">
                      {imagenesAutomaticasIA.length}{" "}
                      {imagenesAutomaticasIA.length === 1
                        ? "imagen"
                        : "imágenes"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-48 overflow-auto pr-1">
                    {imagenesAutomaticasIA.map((url, idx) => {
                      const displayUrl = getDisplayUrl(url);
                      const isSelected = config.imagenesSeleccionadas.some(
                        (img) => img.url === url,
                      );
                      const isEdited = editedImages.has(url);
                      return (
                        <div key={idx} className="relative group">
                          <button
                            type="button"
                            onClick={() => handleImageToggle(url)}
                            className={`relative rounded-md overflow-hidden border-2 transition focus:outline-none w-full ${
                              isSelected
                                ? "border-green-400 ring-2 ring-green-300"
                                : "border-green-700 hover:border-green-500"
                            }`}
                          >
                            <img
                              src={displayUrl}
                              alt={`Detección IA ${idx + 1}`}
                              className={`w-full h-16 object-cover transition ${
                                isSelected
                                  ? "opacity-100"
                                  : "opacity-60 group-hover:opacity-100"
                              }`}
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center pointer-events-none">
                                <span className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
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
                            <span className="absolute bottom-0.5 right-0.5 px-1 py-0.5 rounded bg-green-600 text-[9px] text-white font-semibold pointer-events-none">
                              IA #{idx + 1}
                            </span>
                            {isEdited && (
                              <span className="absolute top-0.5 right-0.5 px-1 py-0.5 rounded bg-green-600 text-[8px] text-white font-semibold pointer-events-none">
                                Editada
                              </span>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditImage(url);
                            }}
                            className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 hover:bg-white rounded-full p-2 shadow-xl z-20 border border-green-300"
                            title="Editar imagen"
                          >
                            <BgColorsOutlined className="text-green-600 text-base" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Contador total */}
              <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    {config.imagenesSeleccionadas.length} de{" "}
                    {Math.min(todasLasImagenes.length, MAX_IMAGES)} imágenes
                    seleccionadas
                  </span>
                  <span className="text-xs text-yellow-400">
                    (máx. {MAX_IMAGES})
                  </span>
                </div>
              </div>
            </div>
          )}

          {todasLasImagenes.length > 0 && (
            <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 mt-4">
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

      </div>

      {/* Botones de acción fijos al pie de la columna (fuera del scroll) */}
      <div className="flex items-center justify-between gap-3 pt-4 mt-1 border-t border-gray-200 bg-white flex-wrap">
        {/* Acciones secundarias a la izquierda */}
        <div className="flex items-center gap-2">
          <Button
            icon={<PrinterOutlined />}
            onClick={handleImprimir}
            disabled={
              generando || exportando || previewLoading || !previewLista
            }
          >
            Imprimir
          </Button>
          <Button
            icon={<FolderOpenOutlined />}
            onClick={handleExportarCarpeta}
            loading={exportando}
            disabled={generando}
            title="Guarda una carpeta con el reporte PDF, las fotografías y los videos del estudio (ideal para USB o disco externo)"
          >
            {exportando ? "Exportando..." : "Exportar carpeta"}
          </Button>
        </div>

        {/* Acciones principales a la derecha */}
        <div className="flex items-center gap-3">
          <Button onClick={onClose} disabled={generando || exportando}>
            Cancelar
          </Button>
          <Button
            type="primary"
            icon={generando ? <Spin size="small" /> : <DownloadOutlined />}
            onClick={handleGenerarPDF}
            loading={generando}
            disabled={exportando}
            className="bg-red-500 hover:bg-red-600 border-red-500"
          >
            {generando ? "Generando..." : "Descargar PDF"}
          </Button>
        </div>
      </div>
      </div>

      {/* Columna derecha: vista previa en vivo del reporte */}
      <div className="flex-1 min-w-0 flex flex-col rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
        <div className="px-3 py-2 border-b border-gray-200 bg-white flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
            <EyeOutlined /> Vista previa en vivo
          </span>
          {previewLoading && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <Spin size="small" /> actualizando…
            </span>
          )}
        </div>
        <div className="flex-1 relative">
          {previewUrl ? (
            <iframe
              ref={previewIframeRef}
              src={`${previewUrl}#zoom=100`}
              title="Vista previa del reporte"
              className="w-full h-full"
              style={{ border: 0 }}
              onLoad={() => setPreviewLista(true)}
            />
          ) : (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-400 text-sm">
              <Spin />
              Generando vista previa…
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Modal de edición de imagen */}
      {editingImageUrl && (
        <ImageEditorModal
          isOpen={!!editingImageUrl}
          imageUrl={editingImageUrl}
          onClose={() => setEditingImageUrl(null)}
          onSave={(editedUrl) =>
            handleSaveEditedImage(editingImageUrl, editedUrl)
          }
        />
      )}
    </Modal>
  );
};

export default ModalGenerarReporte;
