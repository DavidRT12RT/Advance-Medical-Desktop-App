import React, { useRef, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Button,
  Checkbox,
  InputNumber,
  message,
  Modal,
  Popover,
  Progress,
  Select,
  Slider,
  Spin,
} from "antd";
import {
  ArrowLeftOutlined,
  CameraOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  SlidersOutlined,
  UndoOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import Webcam from "react-webcam";
import io, { Socket } from "socket.io-client";
import FirebaseEstudios from "../features/FirebaseEstudios";
import FirebasePacientes from "../features/FirebasePacientes";
import FirebaseMedia from "../features/FirebaseMedia";
import SectionTitle from "../components/common/SectionTitle";
import FiltrosVideoSVG from "../components/common/FiltrosVideoSVG";
import { useElectronStore } from "../hooks/useElectronStore";
import { useVideoAjustes } from "../hooks/useVideoAjustes";
import {
  AJUSTES_NEUTROS,
  BITRATES_CAPTURA,
  bitrateEfectivo,
  construirFiltro,
  dimensionesCaptura,
  esNeutro,
  resolucionesDisponibles,
} from "../utils/videoAjustes";

// URL del servidor de IA (API Python con YOLO/Ollama).
// Se define en build con VITE_API_SERVER_URL (archivo .env en la raíz del
// proyecto o variable de entorno en CI); sin ella usa la API local.
const SERVER_URL =
  import.meta.env.VITE_API_SERVER_URL || "http://localhost:8000";
const FRAME_WIDTH = Number(process.env.NEXT_PUBLIC_API_WIDTH) || 640;
const FRAME_HEIGHT = Number(process.env.NEXT_PUBLIC_API_HEIGHT) || 480;
const TARGET_FPS = Number(process.env.NEXT_PUBLIC_API_FPS) || 60;

const getVideoConstraints = (deviceId?: string, resolucion?: string) => {
  // SIN forzar tamaño exacto: forzar 640×480 hacía que la cámara/capturadora
  // recortara la imagen si su aspecto nativo no era 4:3. La resolución la
  // elige el usuario (Configuración > Cámara o el popover de ajustes) y se
  // pide como "ideal": el dispositivo negocia su modo real más cercano y
  // entrega el cuadro completo original; el ajuste al espacio 640×480 de la
  // IA se hace con letterbox (rectContain).
  const dims = dimensionesCaptura(resolucion);
  return {
    deviceId: deviceId ? { exact: deviceId } : undefined,
    width: { ideal: dims.ancho },
    height: { ideal: dims.alto },
  };
};

// Formato de grabación: MP4 (H.264) cuando Chromium lo soporte — se abre en
// cualquier reproductor sin convertir; si no, WebM como fallback. La elección
// se congela al iniciar cada grabación (formatoGrabacionRef).
const FORMATOS_GRABACION = [
  {
    mimeType: 'video/mp4;codecs="avc1.640028"',
    extension: "mp4",
    contentType: "video/mp4",
  },
  { mimeType: "video/mp4", extension: "mp4", contentType: "video/mp4" },
  {
    mimeType: "video/webm;codecs=vp9",
    extension: "webm",
    contentType: "video/webm",
  },
  { mimeType: "video/webm", extension: "webm", contentType: "video/webm" },
];

const elegirFormatoGrabacion = () =>
  FORMATOS_GRABACION.find(
    (f) =>
      typeof MediaRecorder !== "undefined" &&
      MediaRecorder.isTypeSupported(f.mimeType),
  ) ?? FORMATOS_GRABACION[FORMATOS_GRABACION.length - 1];

// Rectángulo destino para dibujar una imagen de sw×sh dentro de dw×dh sin
// deformarla ni recortarla (letterbox centrado, estilo object-contain)
const rectContain = (sw: number, sh: number, dw: number, dh: number) => {
  const escala = Math.min(dw / sw, dh / sh);
  const w = Math.round(sw * escala);
  const h = Math.round(sh * escala);
  return { x: Math.round((dw - w) / 2), y: Math.round((dh - h) / 2), w, h };
};

// Dibuja las cajas de detección sobre un canvas a la resolución NATIVA del
// frame. Las coordenadas del servidor viven en el espacio 640×480
// letterboxeado (rectContain); aquí se mapean de vuelta al tamaño original
// y los trazos/textos se escalan proporcionalmente.
const dibujarDeteccionesNativas = (
  ctx: CanvasRenderingContext2D,
  detections: any[],
  nativeW: number,
  nativeH: number,
) => {
  if (!detections?.length) return;
  const rImg = rectContain(nativeW, nativeH, FRAME_WIDTH, FRAME_HEIGHT);
  const s = nativeW / rImg.w; // escala uniforme: espacio IA → nativo
  ctx.strokeStyle = "#00FF00";
  ctx.lineWidth = Math.max(2, Math.round(2 * s));
  ctx.font = `${Math.max(14, Math.round(14 * s))}px Arial`;
  detections.forEach((d: any) => {
    const bbox = d.bbox;
    if (!bbox) return;
    const x1 = (bbox.x1 - rImg.x) * s;
    const y1 = (bbox.y1 - rImg.y) * s;
    const x2 = (bbox.x2 - rImg.x) * s;
    const y2 = (bbox.y2 - rImg.y) * s;
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

    const className = d.class ?? d.className ?? "polyp";
    const confidence = d.confidence ?? 0;
    const label = `${className} (${(confidence * 100).toFixed(1)}%)`;

    const textMetrics = ctx.measureText(label);
    const textHeight = Math.round(18 * s);

    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(x1, y2 + 2 * s, textMetrics.width + 4 * s, textHeight);

    ctx.fillStyle = "#00FF00";
    ctx.fillText(label, x1 + 2 * s, y2 + 16 * s);
  });
};

interface DetectionResult {
  frame_index: number;
  polyp_detected: boolean;
  num_polyps: number;
  processing_time_ms: number;
  detections: any[];
  timestamp: string;
}

interface LLMAnalysisFromBackend {
  llm_analysis: LLMAnalysis;
  timestamp: string;
}

interface CnnPolypEvent {
  frame_index: number;
  num_polyps: number;
  processing_time_ms: number;
  timestamp: string;
  detections: {
    bbox: any;
    className: string;
    confidence: number;
  }[];
}

interface CnnPolypSegment {
  startFrame: number;
  endFrame: number;
  startTimestamp: string;
  endTimestamp: string;
  maxConfidence: number;
  className: string;
  bboxSample: any;
}

interface LLMAnalysis {
  has_polyp: boolean;
  confidence_level: string;
  description: string;
  recommendations: string[];
  severity: string;
  timestamp: string;
}

const MAX_SEGMENTS_SAVED = 10;
const MIN_SEGMENT_CONFIDENCE = 0.8;

// Frames que mantenemos encendido el indicador de pólipos en la UI
// después de la última detección > 0, para evitar parpadeos rápidos.
const POLYP_UI_HOLD_FRAMES = TARGET_FPS / 10; // ~250ms

// Imágenes representativas por sesión para no saturar Storage
const MAX_POLYP_IMAGES_PER_SESSION = 20; // Máximo 20 capturas por TODA la sesión
// Intervalo mínimo entre capturas automáticas (30 segundos)
const MIN_SECONDS_BETWEEN_AUTO_CAPTURES = 30;
const MIN_FRAMES_BETWEEN_AUTO_CAPTURES =
  TARGET_FPS * MIN_SECONDS_BETWEEN_AUTO_CAPTURES;

const dataUrlToBlob = (dataUrl: string): Blob => {
  const parts = dataUrl.split(",");
  const base64Data = parts[1];
  const contentTypeMatch = parts[0].match(/data:(.*);base64/);
  const contentType = contentTypeMatch ? contentTypeMatch[1] : "image/jpeg";
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
};

const drawDetectionsOnImage = (
  base64Image: string,
  detections: any[],
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Canvas al tamaño NATIVO del frame: la captura conserva la resolución
      // original de la fuente (las cajas se mapean desde el espacio de la IA)
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo obtener el contexto del canvas"));
        return;
      }

      ctx.drawImage(img, 0, 0);
      dibujarDeteccionesNativas(ctx, detections || [], img.width, img.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("No se pudo generar el blob de la imagen"));
          } else {
            resolve(blob);
          }
        },
        "image/jpeg",
        0.9,
      );
    };
    img.onerror = (err) => reject(err);
    img.src = base64Image;
  });
};

const buildPolypSegments = (events: CnnPolypEvent[]): CnnPolypSegment[] => {
  if (!events || events.length === 0) return [];

  const segments: CnnPolypSegment[] = [];
  let current: CnnPolypSegment | null = null;

  // Permitimos pequeños huecos entre frames para no cortar un mismo pólipo por micro fallos
  const MAX_FRAME_GAP = TARGET_FPS; // ~1 segundo a 60 FPS

  for (const ev of events) {
    const mainDet = ev.detections && ev.detections[0];
    const conf = mainDet?.confidence ?? 0;
    const className = mainDet?.className ?? "polyp";

    if (!current) {
      current = {
        startFrame: ev.frame_index,
        endFrame: ev.frame_index,
        startTimestamp: ev.timestamp,
        endTimestamp: ev.timestamp,
        maxConfidence: conf,
        className,
        bboxSample: mainDet?.bbox ?? null,
      };
      continue;
    }

    const frameGap = ev.frame_index - current.endFrame;
    const sameClass =
      !className || !current.className || className === current.className;

    const isContinuous =
      frameGap >= 0 && frameGap <= MAX_FRAME_GAP && sameClass;

    if (!isContinuous) {
      segments.push(current);
      current = {
        startFrame: ev.frame_index,
        endFrame: ev.frame_index,
        startTimestamp: ev.timestamp,
        endTimestamp: ev.timestamp,
        maxConfidence: conf,
        className,
        bboxSample: mainDet?.bbox ?? null,
      };
      continue;
    }

    // Mismo segmento: extendemos rango y actualizamos máxima confianza
    current.endFrame = ev.frame_index;
    current.endTimestamp = ev.timestamp;
    if (conf > current.maxConfidence && mainDet?.bbox) {
      current.maxConfidence = conf;
      current.bboxSample = mainDet.bbox;
    }
  }

  if (current) segments.push(current);
  return segments;
};

const Detection: React.FC = () => {
  const { id: pacienteId, estudioId } = useParams<{
    id: string;
    estudioId: string;
  }>();
  const navigate = useNavigate();
  const [messageApi, contextHolder] = message.useMessage();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;
  const doctorId = user?.id;

  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Rectángulo 4:3 centrado dentro del panel donde viven video y overlay
  const stageRef = useRef<HTMLDivElement>(null);
  // Canvas de grabación a la resolución NATIVA de la entrada de video: el
  // video guardado conserva la calidad original de la fuente (1080p/4K…);
  // canvasRef queda solo para el frame 640×480 que consume la IA
  const recordCanvasRef = useRef<HTMLCanvasElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const frameIndexRef = useRef(0);
  const isCapturingRef = useRef(false);
  const polypEventsRef = useRef<CnnPolypEvent[]>([]);
  const polypImageUrlsRef = useRef<string[]>([]);
  const manualScreenshotsRef = useRef<string[]>([]);
  const lastPolypFrameWithImageRef = useRef<number | null>(null);
  const lastDetectionsRef = useRef<any[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const polypHoldCounterRef = useRef(0);

  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stats, setStats] = useState({
    frame: 0,
    polyps: 0,
    time: 0,
  });
  const [displayPolyps, setDisplayPolyps] = useState(0);
  const [llmAnalysis, setLlmAnalysis] = useState<LLMAnalysis | null>(null);
  const [isLlmExpanded, setIsLlmExpanded] = useState(false);
  const [paciente, setPaciente] = useState<any | null>(null);
  const [estudio, setEstudio] = useState<any | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [screenshotFeedback, setScreenshotFeedback] = useState<string | null>(
    null,
  );
  const [showScreenshotAnimation, setShowScreenshotAnimation] = useState(false);
  // Miniaturas de las capturas manuales (dataURLs locales, para UI inmediata)
  const [manualScreenshots, setManualScreenshots] = useState<string[]>([]);
  // Modal bloqueante mientras se sube el video y se guardan los resultados
  const [isSaving, setIsSaving] = useState(false);
  // Ancho máximo real que soporta la cámara activa (para listar solo
  // resoluciones que el dispositivo puede dar)
  const [maxAnchoCamara, setMaxAnchoCamara] = useState<number | undefined>();
  // Velocidad de subida del video (se muestra en el modal de guardado para
  // que el usuario vea que la duración depende de su internet)
  const [velocidadSubida, setVelocidadSubida] = useState<{
    mbps: number | null;
    subidoMB: number;
    totalMB: number;
  } | null>(null);
  const muestrasSubidaRef = useRef<Array<{ t: number; bytes: number }>>([]);
  // Cancela la subida en curso ("Omitir subida": el video queda solo local)
  const cancelarSubidaRef = useRef<(() => void) | null>(null);
  // Formato elegido para la grabación actual (MP4 si está soportado)
  const formatoGrabacionRef = useRef(elegirFormatoGrabacion());
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStage, setSaveStage] = useState("Preparando…");
  // Cronómetro de grabación (segundos). El ref refleja el estado para que el
  // loop de dibujo del canvas (closure de larga vida) lea el valor actual.
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingSecondsRef = useRef(0);
  // Reloj en vivo para el overlay de fecha/hora
  const [ahora, setAhora] = useState(() => new Date());
  // Video expandido (pantalla completa dentro de la ventana)
  const [isExpanded, setIsExpanded] = useState(false);
  // Ajustes de imagen (brillo/contraste/tono/balance de color…), persistidos
  // en el perfil del usuario — misma fuente que Configuración > Cámara y Video
  const { ajustes, actualizarAjustes } = useVideoAjustes();
  const ajustesRef = useRef(ajustes);
  // Datos para el overlay quemado en el video (el loop de frames es un closure
  // de larga vida: lee estos refs, no el estado)
  const overlayInfoRef = useRef<{ paciente: string; estudio: string }>({
    paciente: "",
    estudio: "",
  });
  // Guard: un clic que cierra el popover de ajustes no debe capturar imagen
  const ajustesOpenRef = useRef(false);
  const popoverCierreRef = useRef(0);

  // Guardado local en tiempo real (userData/EstudiosAIM/<carpeta del estudio>):
  // cada foto se escribe al capturarse y el video por chunks mientras graba,
  // para no perder nada si se cae la conexión o la aplicación.
  const carpetaLocalRef = useRef<string>("");
  const carpetaVideoLocalRef = useRef<string>("");
  const rutasFotosLocalesRef = useRef<string[]>([]);
  const contadorFotoLocalRef = useRef(0);
  const rutaVideoLocalRef = useRef<string | null>(null);
  const nombreVideoLocalRef = useRef<string>("");
  const colaVideoLocalRef = useRef<Promise<void>>(Promise.resolve());
  const [exporteFinal, setExporteFinal] = useState<{
    rutasFotos: string[];
    rutaVideo: string | null;
  } | null>(null);
  const [exportandoFotos, setExportandoFotos] = useState(false);
  const [exportandoVideo, setExportandoVideo] = useState(false);

  const subtitle = estudio
    ? [
        estudio.tipo,
        estudio.fecha,
        estudio.estado && `Estado: ${estudio.estado}`,
      ]
        .filter(Boolean)
        .join(" • ")
    : "";

  // Obtener lista de dispositivos de video disponibles
  useEffect(() => {
    const getVideoDevices = async () => {
      try {
        // Primero intentamos pedir permisos explícitamente accediendo al stream
        // Esto es necesario en macOS para disparar el prompt de permisos del sistema
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          // Importante: detener los tracks inmediatamente para liberar la cámara
          // y permitir que el componente Webcam la use después
          stream.getTracks().forEach((track) => track.stop());
        } catch (err: any) {
          console.warn(
            "No se pudo obtener acceso inicial a la cámara (posible falta de permisos):",
            err,
          );
          if (
            err.name === "NotAllowedError" ||
            err.name === "PermissionDeniedError"
          ) {
            messageApi.error(
              "Acceso a cámara denegado. Por favor verifique los permisos del sistema.",
            );
            return;
          }
        }

        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(
          (device) => device.kind === "videoinput",
        );
        setDevices(videoDevices);

        // Seleccionar el primer dispositivo por defecto
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Error obteniendo dispositivos de video:", error);
        messageApi.error("Error al listar dispositivos de video");
      }
    };

    getVideoDevices();

    // Escuchar cambios en dispositivos (cuando se conecta/desconecta una cámara)
    navigator.mediaDevices.addEventListener("devicechange", getVideoDevices);
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        getVideoDevices,
      );
    };
  }, []);

  // Cargar información de estudio y paciente para el header
  useEffect(() => {
    const fetchInfo = async () => {
      if (!pacienteId || !estudioId) return;
      try {
        const estudioData: any = await FirebaseEstudios.obtenerEstudioPorId(
          empresaId,
          pacienteId,
          estudioId,
        );
        setEstudio(estudioData);
        if (estudioData?.estado === "finalizado") {
          messageApi.info(
            "Este estudio ya está finalizado. La captura de imagen solo está disponible para estudios en progreso.",
          );
          navigate(`/paciente-detalle/${pacienteId}/estudios/${estudioId}`);
          return;
        }
        if (estudioData?.paciente_id) {
          const pacienteData = await FirebasePacientes.obtenerPacientePorId(
            empresaId,
            estudioData.paciente_id,
          );
          setPaciente(pacienteData);
        }
      } catch (error) {
        console.error("Error cargando información de estudio/paciente:", error);
      }
    };

    fetchInfo();
  }, [empresaId, pacienteId, estudioId]);

  // Captura manual con tecla Espacio
  // Cronómetro: avanza mientras se graba y no está en pausa
  useEffect(() => {
    if (!isCapturing || isPaused) return;
    const id = setInterval(() => {
      setRecordingSeconds((s) => {
        recordingSecondsRef.current = s + 1;
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isCapturing, isPaused]);

  // Reloj en vivo (overlay de fecha/hora sobre el video)
  useEffect(() => {
    const id = setInterval(() => setAhora(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    ajustesRef.current = ajustes;
  }, [ajustes]);

  useEffect(() => {
    const nombrePaciente = paciente
      ? [paciente.nombres, paciente.apellidoPaterno, paciente.apellidoMaterno]
          .filter(Boolean)
          .join(" ")
      : "";
    overlayInfoRef.current = {
      paciente: nombrePaciente,
      estudio: estudio?.tipo || "",
    };
    carpetaLocalRef.current = `${nombrePaciente || "Paciente"} - ${
      estudio?.tipo || "Estudio"
    } - ${estudio?.fecha || new Date().toISOString().split("T")[0]}`.replace(
      /[\\/:*?"<>|]/g,
      "-",
    );
  }, [paciente, estudio]);

  // Salir del modo expandido con Esc
  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isExpanded]);

  const formatTiempo = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const obtenerCarpetaLocal = useCallback(
    () => carpetaLocalRef.current || `estudio-${estudioId || "sin-id"}`,
    [estudioId],
  );

  const blobABase64 = (blob: Blob) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  // Foto → disco local inmediatamente (independiente de la subida a la nube)
  const guardarFotoLocalmente = useCallback(
    async (dataUrl: string) => {
      const api = (window as any).estudioExport;
      if (!api?.guardarArchivoLocal) return;
      const numero = ++contadorFotoLocalRef.current;
      try {
        const res = await api.guardarArchivoLocal({
          carpeta: obtenerCarpetaLocal(),
          nombre: `Foto ${String(numero).padStart(2, "0")}.jpg`,
          dataBase64: dataUrl.split(",")[1] || "",
        });
        if (res?.success && res.ruta) {
          rutasFotosLocalesRef.current.push(res.ruta);
        }
      } catch (error) {
        console.error("Error guardando foto localmente:", error);
      }
    },
    [obtenerCarpetaLocal],
  );

  // Chunk de video → disco local (cola secuencial para conservar el orden)
  const persistirChunkLocal = useCallback(
    (chunk: Blob) => {
      const api = (window as any).estudioExport;
      if (!api?.guardarArchivoLocal) return;
      colaVideoLocalRef.current = colaVideoLocalRef.current.then(async () => {
        try {
          if (!nombreVideoLocalRef.current) {
            nombreVideoLocalRef.current = `Video ${new Date()
              .toISOString()
              .replace(/[:.]/g, "-")}.${formatoGrabacionRef.current.extension}`;
            // La carpeta se congela al primer chunk: los appends siguientes
            // deben ir siempre al mismo archivo
            carpetaVideoLocalRef.current = obtenerCarpetaLocal();
          }
          const dataBase64 = await blobABase64(chunk);
          const res = await api.guardarArchivoLocal({
            carpeta: carpetaVideoLocalRef.current,
            nombre: nombreVideoLocalRef.current,
            dataBase64,
            append: !!rutaVideoLocalRef.current,
          });
          if (res?.success && res.ruta) {
            rutaVideoLocalRef.current = res.ruta;
          }
        } catch (error) {
          console.error("Error guardando chunk de video local:", error);
        }
      });
    },
    [obtenerCarpetaLocal],
  );

  // Copiar archivos locales a memoria USB / disco elegido por el usuario
  const exportarLocalesAMemoria = useCallback(
    async (rutas: string[], setLoading: (v: boolean) => void) => {
      const api = (window as any).estudioExport;
      if (!api?.exportarArchivosLocales) {
        messageApi.error("La exportación no está disponible");
        return;
      }
      try {
        setLoading(true);
        const res = await api.exportarArchivosLocales({
          nombreCarpeta: obtenerCarpetaLocal(),
          rutas,
        });
        if (res?.canceled) return;
        if (res?.success) {
          messageApi.success(
            `${res.guardados} archivo(s) guardados en: ${res.destino}`,
          );
        } else {
          messageApi.error(res?.error || "No se pudo exportar");
        }
      } finally {
        setLoading(false);
      }
    },
    [messageApi, obtenerCarpetaLocal],
  );

  // Aplica los ajustes de imagen del médico a una captura (dataURL). Las
  // capturas deben coincidir con lo que se ve en pantalla y con la grabación;
  // getScreenshot() de react-webcam entrega el frame crudo del sensor (los
  // CSS filters del <video> no afectan a drawImage).
  const aplicarAjustesACaptura = useCallback((dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const a = ajustesRef.current;
      if (esNeutro(a)) return resolve(dataUrl);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas");
        c.width = img.width;
        c.height = img.height;
        const cx = c.getContext("2d");
        if (!cx) return resolve(dataUrl);
        cx.filter = construirFiltro(a);
        cx.drawImage(img, 0, 0);
        resolve(c.toDataURL("image/jpeg", 0.95));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }, []);

  // Captura manual de imagen: se dispara con clic izquierdo sobre el video
  // o con el botón de cámara (antes era la barra espaciadora)
  const capturarImagen = useCallback(async () => {
    if (!isCapturing || isPaused) return;
    // Ignorar el clic que está cerrando el popover de ajustes (rc-trigger
    // cierra en mousedown y el click posterior llegaría hasta el canvas)
    if (ajustesOpenRef.current || Date.now() - popoverCierreRef.current < 350) {
      return;
    }

    const rawScreenshot = webcamRef.current?.getScreenshot();
    if (!rawScreenshot || !pacienteId || !estudioId) return;
    const screenshot = await aplicarAjustesACaptura(rawScreenshot);

    // Guardado local inmediato, pase lo que pase con la nube
    guardarFotoLocalmente(screenshot);

    try {
      // Mostrar animación de feedback
      setShowScreenshotAnimation(true);
      setScreenshotFeedback(screenshot);

      // Ocultar animación después de 800ms
      setTimeout(() => {
        setShowScreenshotAnimation(false);
      }, 800);

      // Subir screenshot a Firebase
      const blob = dataUrlToBlob(screenshot);
      const sessionKey = sessionId || "manual";
      const timestamp = Date.now();

      const url = await FirebaseMedia.subirFrameDeEstudio(
        empresaId,
        pacienteId,
        estudioId,
        `${sessionKey}_manual`,
        timestamp,
        blob,
      );

      manualScreenshotsRef.current.push(url);
      // Miniatura local inmediata para la tira lateral
      setManualScreenshots((prev) => [...prev, screenshot]);
      messageApi.success(
        `Captura guardada (${manualScreenshotsRef.current.length})`,
      );
    } catch (error) {
      console.error("Error capturando screenshot manual:", error);
      messageApi.error("Error al guardar la captura");
    }
  }, [isCapturing, isPaused, pacienteId, estudioId, empresaId, sessionId, aplicarAjustesACaptura, guardarFotoLocalmente]);

  // Función para dibujar bboxes en el canvas overlay
  const drawDetections = (detections: any[]) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar cada detección
    if (!detections || detections.length === 0) {
      return;
    }

    const scale = Math.min(
      canvas.width / FRAME_WIDTH,
      canvas.height / FRAME_HEIGHT,
    );
    const offsetX = (canvas.width - FRAME_WIDTH * scale) / 2;
    const offsetY = (canvas.height - FRAME_HEIGHT * scale) / 2;

    detections.forEach((detection) => {
      const { bbox, class: className, confidence } = detection;
      if (!bbox) return;

      const { x1, y1, x2, y2 } = bbox;
      const width = x2 - x1;
      const height = y2 - y1;

      // Color del rectángulo (verde para polipios)
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        offsetX + x1 * scale,
        offsetY + y1 * scale,
        width * scale,
        height * scale,
      );

      // Fondo para el texto
      const label = `${className} (${(confidence * 100).toFixed(1)}%)`;
      ctx.font = "14px Arial";
      ctx.fillStyle = "#00FF00";
      const textMetrics = ctx.measureText(label);
      const textHeight = 18;

      // Dibujar fondo del texto
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(
        offsetX + x1 * scale,
        offsetY + y2 * scale + 2,
        textMetrics.width + 4,
        textHeight,
      );

      // Dibujar texto
      ctx.fillStyle = "#00FF00";
      ctx.fillText(label, offsetX + x1 * scale + 2, offsetY + y2 * scale + 16);
    });
  };

  useEffect(() => {
    const syncSize = () => {
      const canvas = overlayCanvasRef.current;
      const container = containerRef.current;
      const stage = stageRef.current;
      if (!canvas || !container || !stage) return;
      const rect = container.getBoundingClientRect();
      // El "stage" es el rectángulo 4:3 más grande que cabe en el panel:
      // misma geometría que el espacio 640×480 donde la IA reporta las
      // detecciones, así video, overlay y grabación quedan alineados
      const r = rectContain(FRAME_WIDTH, FRAME_HEIGHT, rect.width, rect.height);
      stage.style.width = `${r.w}px`;
      stage.style.height = `${r.h}px`;
      const dpr = window.devicePixelRatio || 1;
      const targetWidth = Math.floor(r.w * dpr);
      const targetHeight = Math.floor(r.h * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${r.w}px`;
        canvas.style.height = `${r.h}px`;
      }
    };

    syncSize();

    const ro = new ResizeObserver(() => syncSize());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", syncSize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncSize);
    };
  }, []);

  // Inicializar Socket.IO (opcional - permite funcionar sin servidor)
  useEffect(() => {
    let socket: Socket | null = null;

    try {
      socket = io(SERVER_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 3,
        timeout: 5000,
        transports: ["websocket", "polling"],
      });

      // Eventos de conexión
      socket.on("connect", () => {
        console.log("Conectado al servidor de IA");
        setIsConnected(true);
        messageApi.success("Servidor de IA conectado - Detección habilitada");
      });

      socket.on("disconnect", () => {
        console.log("Desconectado del servidor de IA");
        setIsConnected(false);
        // NO detenemos la captura - permitimos grabar sin IA
      });

      socket.on("connect_error", (error) => {
        console.log("Error de conexión al servidor de IA:", error.message);
        setIsConnected(false);
        // Mostrar mensaje solo una vez
        if (!socketRef.current) {
          messageApi.warning(
            "Servidor de IA no disponible - Grabación sin análisis IA",
          );
        }
      });

      // Sesión iniciada
      socket.on(
        "session_started",
        (data: { session_id: string; timestamp: string }) => {
          console.log("Sesión iniciada:", data.session_id);
          setSessionId(data.session_id);
        },
      );

      // Detección
      socket.on("detection", (data: DetectionResult) => {
        console.log("Detection que nos envia:", data);
        setStats({
          frame: data.frame_index,
          polyps: data.num_polyps,
          time: data.processing_time_ms,
        });

        // Suavizar indicador de pólipos en UI para evitar parpadeos 0 ↔ 1
        if (data.num_polyps > 0) {
          polypHoldCounterRef.current = POLYP_UI_HOLD_FRAMES;
          setDisplayPolyps(data.num_polyps);
        } else {
          if (polypHoldCounterRef.current > 0) {
            polypHoldCounterRef.current -= 1;
            // mantenemos el displayPolyps actual
          } else {
            setDisplayPolyps(0);
          }
        }

        // Guardar últimas detecciones para poder pintarlas en el canvas de video
        lastDetectionsRef.current = data.detections || [];

        // Registrar eventos de pólipos (solo cuando hay al menos un pólipo)
        if (data.num_polyps > 0) {
          polypEventsRef.current.push({
            frame_index: data.frame_index,
            num_polyps: data.num_polyps,
            processing_time_ms: data.processing_time_ms,
            timestamp: data.timestamp,
            detections: (data.detections || []).map((d: any) => ({
              bbox: d.bbox,
              className: d.class,
              confidence: d.confidence,
            })),
          });

          // Capturar imagen automática solo si:
          // 1. No hemos alcanzado el límite máximo de capturas por sesión (20)
          // 2. Han pasado al menos 30 segundos desde la última captura
          const lastFrame = lastPolypFrameWithImageRef.current;
          const hasWaitedEnough =
            lastFrame === null ||
            data.frame_index - lastFrame >= MIN_FRAMES_BETWEEN_AUTO_CAPTURES;

          const canCaptureMore =
            polypImageUrlsRef.current.length < MAX_POLYP_IMAGES_PER_SESSION;

          if (hasWaitedEnough && canCaptureMore) {
            const screenshot = webcamRef.current?.getScreenshot();
            if (screenshot && pacienteId && estudioId) {
              const sessionKey = sessionId || "default";

              // Marcar inmediatamente que estamos procesando esta captura
              lastPolypFrameWithImageRef.current = data.frame_index;

              aplicarAjustesACaptura(screenshot)
                .then((ajustado) =>
                  drawDetectionsOnImage(ajustado, data.detections || []),
                )
                .then((blob) =>
                  FirebaseMedia.subirFrameDeEstudio(
                    empresaId,
                    pacienteId,
                    estudioId,
                    sessionKey,
                    data.frame_index,
                    blob,
                  ),
                )
                .then((url) => {
                  // Verificar nuevamente el límite antes de agregar (por si acaso)
                  if (
                    polypImageUrlsRef.current.length <
                    MAX_POLYP_IMAGES_PER_SESSION
                  ) {
                    polypImageUrlsRef.current.push(url);
                    console.log(
                      `Captura automática ${polypImageUrlsRef.current.length}/${MAX_POLYP_IMAGES_PER_SESSION}`,
                    );
                  }
                })
                .catch((error) => {
                  console.error("Error subiendo imagen de pólipo:", error);
                  // Revertir el marcador si falló
                  lastPolypFrameWithImageRef.current = null;
                });
            }
          }
        }

        // Dibujar detecciones en el canvas overlay
        drawDetections(data.detections || []);
      });

      // Análisis LLM
      socket.on("llm_analysis", (data: LLMAnalysisFromBackend) => {
        const description = data?.llm_analysis?.description;
        const recommendations = data?.llm_analysis?.recommendations;
        const severity = data?.llm_analysis?.severity;
        const confidence_level = data?.llm_analysis?.confidence_level;
        const timestamp = data?.timestamp;
        const has_polyp = data?.llm_analysis?.has_polyp;

        setLlmAnalysis({
          has_polyp: has_polyp,
          confidence_level: confidence_level,
          description: description,
          recommendations: recommendations,
          severity: severity,
          timestamp: timestamp,
        });
        setIsLlmExpanded(false);
      });

      // Estados
      socket.on("paused", () => {
        console.log("Sesión pausada");
      });

      socket.on("resumed", () => {
        console.log("Sesión reanudada");
      });

      // Errores
      socket.on("error", (data: { message: string }) => {
        console.error("Error del servidor:", data.message);
      });

      socketRef.current = socket;
    } catch (error) {
      console.error("Error inicializando conexión al servidor de IA:", error);
      setIsConnected(false);
      messageApi.info("Modo sin servidor - Solo grabación de video");
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Iniciar sesión (funciona con o sin servidor)
  const startSession = useCallback(async () => {
    if (!pacienteId || !estudioId) {
      messageApi.error("Falta el contexto de paciente/estudio");
      return;
    }

    // Reiniciar cronómetro y miniaturas de la sesión anterior
    setRecordingSeconds(0);
    recordingSecondsRef.current = 0;
    setManualScreenshots([]);

    // Si hay servidor conectado, iniciar sesión de IA
    if (socketRef.current?.connected) {
      socketRef.current.emit("start_session", {
        empresa_id: empresaId,
        doctor_id: doctorId,
        paciente_id: pacienteId,
        estudio_id: estudioId,
      });
      messageApi.success("Sesión de IA iniciada");
    } else {
      messageApi.info("Iniciando grabación sin análisis de IA");
    }

    // Marcar estudio como en progreso
    try {
      await FirebaseEstudios.actualizarEstudio(
        empresaId,
        pacienteId,
        estudioId,
        { estado: "en_progreso" },
      );
    } catch (error) {
      console.error("Error actualizando estado de consulta:", error);
    }

    setIsCapturing(true);
    frameIndexRef.current = 0;
    polypEventsRef.current = [];
    polypImageUrlsRef.current = [];
    lastPolypFrameWithImageRef.current = null;
    recordedChunksRef.current = [];

    // Reiniciar detecciones para video
    lastDetectionsRef.current = [];

    // La grabación sale del canvas nativo, no del 640×480 de la IA: el video
    // guardado conserva la resolución que entrega la fuente (1080p, 4K, etc.)
    const videoEl = webcamRef.current?.video as HTMLVideoElement | null;
    const recW = videoEl?.videoWidth || FRAME_WIDTH;
    const recH = videoEl?.videoHeight || FRAME_HEIGHT;
    const recordCanvas = recordCanvasRef.current as HTMLCanvasElement | null;
    if (recordCanvas) {
      recordCanvas.width = recW;
      recordCanvas.height = recH;
      const rctx = recordCanvas.getContext("2d");
      if (rctx) {
        rctx.fillStyle = "#000";
        rctx.fillRect(0, 0, recW, recH);
      }
    }
    const mediaStream =
      recordCanvas && (recordCanvas as any).captureStream
        ? (recordCanvas as any).captureStream(TARGET_FPS)
        : undefined;
    if (mediaStream && typeof MediaRecorder !== "undefined") {
      try {
        formatoGrabacionRef.current = elegirFormatoGrabacion();
        const recorder = new MediaRecorder(mediaStream, {
          mimeType: formatoGrabacionRef.current.mimeType,
          // Bitrate configurado por el usuario, o automático según la
          // resolución negociada (sin esto MediaRecorder usa ~2.5 Mbps y un
          // video HD/4K sale pixelado)
          videoBitsPerSecond: bitrateEfectivo(
            ajustesRef.current?.bitrate,
            recW,
            recH,
          ),
        });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
            persistirChunkLocal(event.data);
          }
        };
        // Timeslice: entrega chunks cada segundo para poder escribir el
        // video a disco local en tiempo real
        recorder.start(1000);
      } catch (error) {
        console.error("No se pudo iniciar la grabación de video:", error);
      }
    }
  }, [isConnected, empresaId, pacienteId, estudioId, doctorId, persistirChunkLocal]);

  // Capturar y enviar frames (funciona con o sin servidor).
  // Depende también de isPaused: al pausar, el cleanup detiene el loop y al
  // reanudar el efecto lo vuelve a arrancar (antes Reanudar no reiniciaba
  // nada y la grabación quedaba congelada para siempre).
  useEffect(() => {
    if (!isCapturing || isPaused || !webcamRef.current) return;

    const captureFrames = async () => {
      isCapturingRef.current = true;

      while (isCapturingRef.current) {
        try {
          const imageSrc = webcamRef.current?.getScreenshot();
          if (!imageSrc) continue;

          // Convertir base64 a Uint8Array RGB
          const img = new Image();
          img.onload = () => {
            if (!canvasRef.current) return;

            canvasRef.current.width = FRAME_WIDTH;
            canvasRef.current.height = FRAME_HEIGHT;
            const ctx = canvasRef.current.getContext("2d");
            if (!ctx) return;

            // 1) Dibujar el frame CRUDO y extraerlo para la IA: el modelo debe
            // recibir la imagen sin ajustes de color ni overlays (los ajustes
            // son preferencia visual del médico, no deben alterar la detección).
            // Letterbox: el cuadro conserva su relación de aspecto original
            // dentro del espacio 640×480 (sin estirar ni recortar).
            const rFrame = rectContain(
              img.width,
              img.height,
              FRAME_WIDTH,
              FRAME_HEIGHT,
            );
            ctx.fillStyle = "#000";
            ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
            ctx.drawImage(img, rFrame.x, rFrame.y, rFrame.w, rFrame.h);
            const imageData = ctx.getImageData(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
            const data = imageData.data;

            // RGBA → RGB
            const rgbBuffer = new Uint8Array(FRAME_WIDTH * FRAME_HEIGHT * 3);
            for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
              rgbBuffer[j] = data[i];
              rgbBuffer[j + 1] = data[i + 1];
              rgbBuffer[j + 2] = data[i + 2];
            }

            // Enviar frame solo si hay servidor conectado
            if (socketRef.current?.connected) {
              socketRef.current.emit("frame", {
                frame_index: frameIndexRef.current++,
                data: rgbBuffer,
              });
            } else {
              // Sin servidor, solo incrementar frame index para grabación
              frameIndexRef.current++;
            }

            // 2) Canvas de grabación a la resolución NATIVA de la fuente,
            // con los ajustes de imagen del médico (refleja lo que él ve)
            const recordCanvas = recordCanvasRef.current;
            if (!recordCanvas) return;
            if (
              recordCanvas.width !== img.width ||
              recordCanvas.height !== img.height
            ) {
              // La fuente cambió de resolución a mitad de sesión
              recordCanvas.width = img.width;
              recordCanvas.height = img.height;
            }
            const rctx = recordCanvas.getContext("2d");
            if (!rctx) return;

            const ajustesActuales = ajustesRef.current;
            rctx.filter = esNeutro(ajustesActuales)
              ? "none"
              : construirFiltro(ajustesActuales);
            rctx.drawImage(img, 0, 0);
            rctx.filter = "none";

            // 3) Bounding boxes mapeados al tamaño nativo (quedan en la
            // grabación)
            dibujarDeteccionesNativas(
              rctx,
              lastDetectionsRef.current || [],
              recordCanvas.width,
              recordCanvas.height,
            );

            // Banner de contexto clínico quemado en la grabación: fecha/hora
            // y paciente/estudio, cada uno activable por el usuario en los
            // ajustes. Los datos de grabación (REC, tiempo, contador de
            // fotos) solo se muestran en pantalla — no deben quedar visibles
            // en el video guardado.
            const info = overlayInfoRef.current;
            const partes: string[] = [];
            if (ajustesActuales.overlayFechaHora !== false) {
              partes.push(
                new Date().toLocaleString("es-MX", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                }),
              );
            }
            if (ajustesActuales.overlayNombre !== false) {
              if (info.paciente) partes.push(info.paciente);
              if (info.estudio) partes.push(info.estudio);
            }

            if (partes.length > 0) {
              // Tamaños proporcionales a la resolución de grabación
              const esc = Math.max(1, recordCanvas.width / FRAME_WIDTH);
              const bannerH = Math.round(26 * esc);
              rctx.fillStyle = "rgba(0, 0, 0, 0.55)";
              rctx.fillRect(
                0,
                recordCanvas.height - bannerH,
                recordCanvas.width,
                bannerH,
              );

              rctx.font = `${Math.round(13 * esc)}px Arial`;
              rctx.textBaseline = "middle";

              // Truncar con elipsis en vez de comprimir el texto (maxWidth de
              // fillText deforma tipográficamente los nombres largos)
              let textoIzq = partes.join("  •  ");
              const maxAnchoIzq = recordCanvas.width - Math.round(16 * esc);
              if (rctx.measureText(textoIzq).width > maxAnchoIzq) {
                while (
                  textoIzq.length > 1 &&
                  rctx.measureText(textoIzq + "…").width > maxAnchoIzq
                ) {
                  textoIzq = textoIzq.slice(0, -1);
                }
                textoIzq += "…";
              }
              rctx.fillStyle = "#FFFFFF";
              rctx.fillText(
                textoIzq,
                Math.round(8 * esc),
                recordCanvas.height - bannerH / 2,
              );
              rctx.textBaseline = "alphabetic";
            }
          };
          img.src = imageSrc;

          // Esperar para 60 FPS
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 / TARGET_FPS),
          );
        } catch (error) {
          console.error("Error capturando frame:", error);
        }
      }
    };

    captureFrames();

    return () => {
      isCapturingRef.current = false;
    };
  }, [isCapturing, isPaused]);

  // Controles (funcionan con o sin servidor)
  const handlePause = () => {
    setIsPaused(true);

    // Pausar también el MediaRecorder: así el webm no graba el canvas
    // congelado y el tiempo REC queda sincronizado con la línea de tiempo real
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      try { recorder.pause(); } catch { /* no soportado */ }
    }

    // Si hay servidor, notificar
    if (socketRef.current?.connected) {
      socketRef.current.emit("pause");
    }

    messageApi.info("Captura pausada");
  };

  const handleResume = () => {
    setIsPaused(false);

    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") {
      try { recorder.resume(); } catch { /* no soportado */ }
    }

    // Si hay servidor, notificar
    if (socketRef.current?.connected) {
      socketRef.current.emit("resume");
    }

    messageApi.info("Captura reanudada");
  };

  const handleFinish = async () => {
    isCapturingRef.current = false;
    setIsCapturing(false);
    setIsPaused(false);
    // Modal bloqueante: nada de acciones del usuario mientras se guarda
    setSaveProgress(0);
    setSaveStage("Finalizando grabación…");
    setIsSaving(true);

    try {
    // Si hay servidor, notificar
    if (socketRef.current?.connected) {
      socketRef.current.emit("finish");
    }

    // Detener la grabación de video si está activa
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
    }

    // Esperar a que terminen las escrituras locales pendientes del video
    try {
      await colaVideoLocalRef.current;
    } catch {
      /* las escrituras locales fallidas ya quedaron logueadas */
    }

    if (pacienteId && estudioId) {
      const allEvents = polypEventsRef.current;
      const allSegments = buildPolypSegments(allEvents);

      // Filtrar solo segmentos clínicamente relevantes (confianza mínima)
      const importantSegments = allSegments.filter(
        (seg) => (seg.maxConfidence || 0) >= MIN_SEGMENT_CONFIDENCE,
      );

      // Ordenar segmentos importantes por duración (frames) * confianza máxima
      const scoredSegments = importantSegments
        .map((seg) => ({
          seg,
          score:
            (seg.endFrame - seg.startFrame + 1 || 1) * (seg.maxConfidence || 0),
        }))
        .sort((a, b) => b.score - a.score)
        .map((s) => s.seg);

      const topSegments = scoredSegments.slice(0, MAX_SEGMENTS_SAVED);

      // Solo crear datos CNN si hubo eventos de pólipos (servidor conectado)
      const cnnData =
        allEvents.length > 0
          ? {
              summary: {
                lastFrame: stats.frame,
                lastPolypCount: stats.polyps,
                lastProcessingTimeMs: stats.time,
                totalPolypEvents: allEvents.length,
                totalSegments: importantSegments.length,
              },
              segments: topSegments,
            }
          : null;

      //Obtener las sesiones actuales
      const newSecciones = estudio?.secciones_ai || [];

      // Subir video completo de la sesión si existe
      let videoUrl: string | null = null;
      if (recordedChunksRef.current.length > 0) {
        try {
          const formato = formatoGrabacionRef.current;
          const videoBlob = new Blob(recordedChunksRef.current, {
            type: formato.contentType,
          });
          const sessionKey = sessionId || "general";
          setSaveStage("Subiendo video de captura…");
          muestrasSubidaRef.current = [];
          // La subida del video es ~90% del trabajo; el resto es guardar resultados
          videoUrl = await FirebaseMedia.subirVideoDeEstudio(
            empresaId,
            pacienteId,
            estudioId,
            sessionKey,
            videoBlob,
            (percent, bytes, total) => {
              setSaveProgress(Math.round(percent * 0.9));
              if (bytes === undefined || !total) return;
              // Velocidad de subida sobre una ventana móvil de ~5 segundos
              const ahora = Date.now();
              const muestras = muestrasSubidaRef.current;
              muestras.push({ t: ahora, bytes });
              while (muestras.length > 1 && ahora - muestras[0].t > 5000) {
                muestras.shift();
              }
              const primera = muestras[0];
              const dt = (ahora - primera.t) / 1000;
              setVelocidadSubida({
                mbps:
                  dt > 0.5
                    ? ((bytes - primera.bytes) * 8) / dt / 1_000_000
                    : null,
                subidoMB: bytes / 1_000_000,
                totalMB: total / 1_000_000,
              });
            },
            {
              extension: formato.extension,
              contentType: formato.contentType,
              registrarCancelacion: (cancelar) => {
                cancelarSubidaRef.current = cancelar;
              },
            },
          );
        } catch (error: any) {
          if (error?.code === "storage/canceled") {
            messageApi.info(
              "Subida omitida. El video quedó guardado en esta computadora: puedes subirlo cuando quieras desde la sección del estudio.",
              8,
            );
          } else {
            console.error("Error subiendo video de consulta:", error);
            messageApi.warning(
              "No se pudo subir el video a la nube. Quedó respaldado en esta computadora: podrás subirlo desde la sección del estudio.",
              8,
            );
          }
        } finally {
          cancelarSubidaRef.current = null;
          setVelocidadSubida(null);
        }
      } else {
        setSaveProgress(80);
      }
      setSaveStage("Guardando resultados del estudio…");
      setSaveProgress((p) => Math.max(p, 90));

      // Solo agregar sección si hay datos de IA, video (subido o local) o
      // capturas manuales
      if (
        cnnData ||
        llmAnalysis ||
        videoUrl ||
        rutaVideoLocalRef.current ||
        manualScreenshotsRef.current.length > 0
      ) {
        newSecciones.push({
          ia_cnn: cnnData,
          ia_llm: llmAnalysis,
          timestamp: new Date().toISOString(),
          polypImages: polypImageUrlsRef.current,
          manualScreenshots: manualScreenshotsRef.current,
          videoUrl,
          // Respaldo local en esta computadora: permite volver a subir el
          // video (si falló por internet) o copiarlo a memoria después
          videoLocalPath: rutaVideoLocalRef.current || null,
          fotosLocales: rutasFotosLocalesRef.current,
          mode: socketRef.current?.connected ? "with_ai" : "video_only",
        });
      }

      try {
        await FirebaseEstudios.actualizarEstudio(
          empresaId,
          pacienteId,
          estudioId,
          { secciones_ai: newSecciones },
        );

        setSaveProgress(100);

        if (socketRef.current?.connected) {
          messageApi.success(
            "Resultados de IA y video guardados en el estudio",
          );
        } else {
          messageApi.success("Video guardado en el estudio");
        }
      } catch (error) {
        messageApi.error("No se pudieron guardar los resultados");
      }

      // Ofrecer copiar a memoria USB los archivos locales antes de salir
      const rutasFotos = rutasFotosLocalesRef.current;
      const rutaVideo = rutaVideoLocalRef.current;
      if (rutasFotos.length > 0 || rutaVideo) {
        setExporteFinal({ rutasFotos, rutaVideo });
      } else {
        navigate(`/paciente-detalle/${pacienteId}/estudios/${estudioId}`);
      }
    }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {contextHolder}
      {/* Filtros SVG (enfoque y balance de color): los referencian los
          CSS/canvas filters como url(#aim-nitidez) y url(#aim-canales) */}
      <FiltrosVideoSVG ajustes={ajustes} />

      {/* Modal bloqueante mientras se guarda el video y los resultados */}
      <Modal
        open={isSaving}
        closable={false}
        maskClosable={false}
        keyboard={false}
        footer={null}
        centered
        width={400}
      >
        <div className="flex flex-col items-center gap-3 py-6">
          <Spin size="large" />
          <p className="text-base font-semibold text-gray-800">
            Guardando video de captura…
          </p>
          <Progress
            percent={saveProgress}
            status="active"
            strokeColor="#009b9b"
            className="w-full px-2"
          />
          {velocidadSubida && (
            <>
              <p className="text-sm text-gray-600 text-center leading-relaxed mb-0">
                {velocidadSubida.mbps !== null
                  ? `Velocidad de subida: ${velocidadSubida.mbps.toFixed(1)} Mbps`
                  : "Midiendo velocidad de subida…"}
                <br />
                <span className="text-xs text-gray-400">
                  {velocidadSubida.subidoMB.toFixed(0)} de{" "}
                  {velocidadSubida.totalMB.toFixed(0)} MB — la duración
                  depende de la velocidad de internet de este equipo
                </span>
              </p>
              <Button
                size="small"
                onClick={() => cancelarSubidaRef.current?.()}
              >
                Omitir subida — guardar solo en esta computadora
              </Button>
              <p className="text-[12px] text-gray-400 text-center mb-0">
                Podrás subirlo después desde la sección del estudio
              </p>
            </>
          )}
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            {saveStage}
            <br />
            No cierres la aplicación.
          </p>
        </div>
      </Modal>

      {/* Modal final: copiar fotos/video a memoria USB o disco externo */}
      <Modal
        open={exporteFinal !== null}
        closable={false}
        maskClosable={false}
        keyboard={false}
        footer={null}
        centered
        width={460}
        title="Estudio guardado"
      >
        <div className="flex flex-col gap-3 pt-2">
          <p className="text-sm text-gray-600">
            Las fotografías y el video quedaron guardados en esta computadora.
            Si lo necesitas, cópialos ahora a una memoria USB o disco externo
            para entregarlos al paciente, médico u hospital.
          </p>
          <Button
            icon={<CameraOutlined />}
            disabled={!exporteFinal?.rutasFotos.length}
            loading={exportandoFotos}
            onClick={() =>
              exporteFinal &&
              exportarLocalesAMemoria(exporteFinal.rutasFotos, setExportandoFotos)
            }
          >
            Guardar fotografías en memoria (
            {exporteFinal?.rutasFotos.length ?? 0})
          </Button>
          <Button
            icon={<VideoCameraOutlined />}
            disabled={!exporteFinal?.rutaVideo}
            loading={exportandoVideo}
            onClick={() =>
              exporteFinal?.rutaVideo &&
              exportarLocalesAMemoria(
                [exporteFinal.rutaVideo],
                setExportandoVideo,
              )
            }
          >
            Guardar video en memoria
          </Button>
          {exporteFinal?.rutaVideo && (
            <Button
              icon={<FolderOpenOutlined />}
              onClick={() => {
                const api = (window as any).estudioExport;
                if (!api?.mostrarEnCarpeta) {
                  messageApi.warning(
                    "Cierra y vuelve a abrir la aplicación para habilitar esta función.",
                  );
                  return;
                }
                api.mostrarEnCarpeta({ ruta: exporteFinal.rutaVideo });
              }}
            >
              Abrir carpeta de los archivos locales
            </Button>
          )}
          <Button
            type="primary"
            icon={<FileTextOutlined />}
            disabled={exportandoFotos || exportandoVideo}
            onClick={() =>
              navigate(`/paciente-detalle/${pacienteId}/estudios/${estudioId}`)
            }
          >
            Generar reporte de hallazgos
          </Button>
        </div>
      </Modal>
      {/* Header */}
      <div className="bg-white w-full">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() =>
            pacienteId && estudioId
              ? navigate(
                  `/paciente-detalle/${pacienteId}/estudios/${estudioId}`,
                )
              : navigate(-1)
          }
        >
          Volver al detalle
        </Button>
        <div className="w-full px-6 py-4 flex flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <SectionTitle
              title={
                paciente
                  ? `Procedimiento endoscópico - ${[
                      paciente.nombres,
                      paciente.apellidoPaterno,
                      paciente.apellidoMaterno,
                    ]
                      .filter(Boolean)
                      .join(" ")}`
                  : "Procedimiento endoscópico"
              }
              icon={<VideoCameraOutlined className="text-indigo-600" />}
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {estudio?.tipo && (
                <span className="px-2 py-0.5 rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-[13px] font-medium">
                  {estudio.tipo}
                </span>
              )}
              {estudio?.estado && (
                <span
                  className={`px-2 py-0.5 rounded-full border text-[13px] font-medium ${
                    estudio.estado === "pendiente"
                      ? "bg-orange-50 text-orange-700 border-orange-100"
                      : estudio.estado === "finalizado"
                        ? "bg-green-50 text-green-700 border-green-100"
                        : "bg-blue-50 text-blue-700 border-blue-100"
                  }`}
                >
                  {estudio.estado[0].toUpperCase() + estudio.estado.slice(1)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 text-[13px]">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-red-500"
                }`}
              />
              <span>
                {isConnected ? "Servidor conectado" : "Servidor desconectado"}
              </span>
            </div>

            {sessionId && (
              <span className="hidden sm:inline text-[13px] text-gray-400">
                SID: {sessionId.slice(0, 8)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto w-full px-6 py-4 flex flex-col gap-4 flex-1">
        {/* Resumen de última detección */}
        {(estudio?.ia_cnn || estudio?.ia_llm) && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                Última detección registrada
              </p>
              <p className="text-sm text-gray-700 mt-1">
                {`Pólipos detectados: ${estudio?.ia_cnn?.lastPolypCount ?? 0}`}
                {estudio?.ia_llm?.severity &&
                  ` • Severidad: ${estudio.ia_llm.severity}`}
              </p>
            </div>
          </div>
        )}

        {/* Video + panel lateral de capturas.
            La fila tiene altura fija (viewport - header/controles): el panel
            y el video miden siempre lo mismo, y las capturas scrollean
            dentro del panel sin estirar la página. */}
        <div className="flex gap-4 min-h-[360px] h-[calc(100vh-300px)]">
          {/* Panel izquierdo: capturas manuales */}
          {(isCapturing || manualScreenshots.length > 0) && (
            <div className="w-56 shrink-0 h-full bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Capturas
                </span>
                <span className="text-[13px] font-bold bg-gray-900 text-white rounded-full min-w-[22px] text-center px-1.5 py-0.5">
                  {manualScreenshots.length}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
                {manualScreenshots.length === 0 ? (
                  <p className="text-[13px] text-gray-400 text-center mt-6 px-1 leading-relaxed">
                    Haz <span className="font-semibold">clic en el video</span>{" "}
                    o usa el botón <CameraOutlined /> durante la grabación para
                    capturar
                  </p>
                ) : (
                  [...manualScreenshots]
                    .map((src, i) => ({ src, num: i + 1 }))
                    .reverse()
                    .map(({ src, num }) => (
                      <div
                        key={num}
                        className="relative rounded-lg overflow-hidden border border-gray-200 shadow-sm shrink-0 group"
                      >
                        <img
                          src={src}
                          alt={`Captura ${num}`}
                          className="w-full aspect-video object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                          #{num}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* Video (expandible a pantalla completa dentro de la ventana) */}
          <div
            className={
              isExpanded
                ? "fixed inset-0 z-40 bg-black"
                : `bg-black rounded-xl overflow-hidden shadow-sm border border-gray-900 flex-1 h-full min-w-0 ${
                    isCapturing
                      ? isPaused
                        ? "ring-2 ring-yellow-400/80"
                        : "ring-2 ring-red-500/80"
                      : ""
                  }`
            }
          >
          <div
            ref={containerRef}
            className="relative w-full h-full flex items-center justify-center"
          >
            {/* Stage 4:3: el video se letterboxea aquí igual que en el canvas
                de proceso, así el overlay de detecciones queda alineado */}
            <div ref={stageRef} className="relative">
              <Webcam
                audio={false}
                ref={webcamRef}
                videoConstraints={getVideoConstraints(
                  selectedDeviceId,
                  ajustes.resolucion,
                )}
                onUserMedia={(stream) => {
                  // Capacidades reales del dispositivo: limitan qué
                  // resoluciones se listan en el selector
                  try {
                    const track = stream?.getVideoTracks?.()[0];
                    const caps = track?.getCapabilities?.();
                    setMaxAnchoCamara(caps?.width?.max ?? undefined);
                  } catch {
                    setMaxAnchoCamara(undefined);
                  }
                }}
                style={{ filter: esNeutro(ajustes) ? undefined : construirFiltro(ajustes) }}
                className="w-full h-full object-contain relative z-0"
                disablePictureInPicture={true}
                forceScreenshotSourceSize={true}
                imageSmoothing={true}
                mirrored={false}
                screenshotFormat="image/jpeg"
                screenshotQuality={0.95}
              />

              {/* Canvas ocultos: frame 640×480 para la IA y grabación nativa */}
              <canvas ref={canvasRef} className="hidden" />
              <canvas ref={recordCanvasRef} className="hidden" />

              {/* Canvas overlay para detecciones. Clic izquierdo = capturar imagen */}
              <canvas
                ref={overlayCanvasRef}
                width={FRAME_WIDTH}
                height={FRAME_HEIGHT}
                className="absolute top-0 left-0 w-full h-full z-10"
                style={{ cursor: isCapturing && !isPaused ? "crosshair" : "default" }}
                onClick={capturarImagen}
                title={isCapturing ? "Clic para capturar imagen" : undefined}
              />
            </div>

            {/* Controles de sesión en modo expandido (los de abajo quedan tapados) */}
            {isExpanded && (
              <div className="absolute bottom-5 right-5 z-20 flex gap-2">
                <Button
                  icon={<CameraOutlined />}
                  onClick={capturarImagen}
                  disabled={!isCapturing || isPaused}
                >
                  Capturar
                </Button>
                <Button
                  onClick={isPaused ? handleResume : handlePause}
                  disabled={!isCapturing}
                >
                  {isPaused ? "Reanudar" : "Pausar"}
                </Button>
                <Button danger onClick={handleFinish} disabled={!isCapturing}>
                  Finalizar y guardar
                </Button>
              </div>
            )}

            {/* Indicador de grabación: prominente, con punto pulsante y cronómetro */}
            {isCapturing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
                <div className="flex items-center gap-3 pl-4 pr-5 py-2 rounded-full bg-black/60 backdrop-blur-md border border-white/15 shadow-xl">
                  <span className="relative flex h-3.5 w-3.5">
                    {!isPaused && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-70" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                        isPaused ? "bg-yellow-400" : "bg-red-500"
                      }`}
                    />
                  </span>
                  <span
                    className={`text-sm font-bold tracking-[0.2em] ${
                      isPaused ? "text-yellow-300" : "text-red-400"
                    }`}
                  >
                    {isPaused ? "PAUSA" : "REC"}
                  </span>
                  <span className="font-mono text-lg font-semibold text-white tabular-nums leading-none">
                    {formatTiempo(recordingSeconds)}
                  </span>
                </div>
              </div>
            )}

            {/* Barra de herramientas del video: ajustes de color y expandir */}
            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <Popover
                trigger="click"
                placement="bottomRight"
                title="Ajustes de imagen"
                onOpenChange={(abierto) => {
                  ajustesOpenRef.current = abierto;
                  if (!abierto) popoverCierreRef.current = Date.now();
                }}
                content={
                  <div className="w-72 max-h-[65vh] overflow-y-auto pr-1 flex flex-col gap-1">
                    <div className="mb-1">
                      <div className="text-xs text-gray-600 mb-0.5">
                        Resolución de captura
                      </div>
                      <Select
                        size="small"
                        className="w-full"
                        value={ajustes.resolucion ?? "auto"}
                        disabled={isCapturing}
                        onChange={(v) => actualizarAjustes({ resolucion: v })}
                        options={resolucionesDisponibles(
                          maxAnchoCamara,
                          ajustes.resolucion,
                        ).map((o) => ({ value: o.value, label: o.label }))}
                      />
                      <div className="text-xs text-gray-600 mb-0.5 mt-1.5">
                        Calidad de grabación
                      </div>
                      <Select
                        size="small"
                        className="w-full"
                        value={ajustes.bitrate ?? "auto"}
                        disabled={isCapturing}
                        onChange={(v) => actualizarAjustes({ bitrate: v })}
                        options={BITRATES_CAPTURA.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                      />
                      {isCapturing && (
                        <p className="text-[12px] text-gray-400 mt-0.5 mb-0">
                          No se pueden cambiar durante la grabación
                        </p>
                      )}
                      <div className="text-xs text-gray-600 mb-0.5 mt-1.5">
                        Datos sobre el video grabado
                      </div>
                      <div className="flex flex-col">
                        <Checkbox
                          checked={ajustes.overlayFechaHora !== false}
                          onChange={(e) =>
                            actualizarAjustes({
                              overlayFechaHora: e.target.checked,
                            })
                          }
                        >
                          <span className="text-xs">Fecha y hora</span>
                        </Checkbox>
                        <Checkbox
                          checked={ajustes.overlayNombre !== false}
                          onChange={(e) =>
                            actualizarAjustes({
                              overlayNombre: e.target.checked,
                            })
                          }
                        >
                          <span className="text-xs">
                            Nombre del paciente y estudio
                          </span>
                        </Checkbox>
                      </div>
                    </div>
                    {([
                      ["brillo", "Brillo"],
                      ["contraste", "Contraste"],
                      ["saturacion", "Color (saturación)"],
                      ["gamma", "Gamma"],
                    ] as const).map(([clave, etiqueta]) => (
                      <div key={clave}>
                        <div className="flex justify-between items-center text-xs text-gray-600">
                          <span>{etiqueta}</span>
                          <span className="flex items-center gap-0.5">
                            <InputNumber
                              size="small"
                              className="w-16"
                              min={25}
                              max={200}
                              value={ajustes[clave]}
                              onChange={(v) => {
                                if (typeof v === "number")
                                  actualizarAjustes({ [clave]: Math.round(v) });
                              }}
                            />
                            <Button
                              size="small"
                              type="text"
                              icon={<UndoOutlined />}
                              disabled={ajustes[clave] === 100}
                              onClick={() => actualizarAjustes({ [clave]: 100 })}
                              title="Restablecer este ajuste"
                            />
                          </span>
                        </div>
                        <Slider
                          min={25}
                          max={200}
                          value={ajustes[clave]}
                          onChange={(v) => actualizarAjustes({ [clave]: v })}
                        />
                      </div>
                    ))}
                    <div>
                      <div className="flex justify-between items-center text-xs text-gray-600">
                        <span>Tono (coloración)</span>
                        <span className="flex items-center gap-0.5">
                          <InputNumber
                            size="small"
                            className="w-16"
                            min={-180}
                            max={180}
                            value={ajustes.tono ?? 0}
                            onChange={(v) => {
                              if (typeof v === "number")
                                actualizarAjustes({ tono: Math.round(v) });
                            }}
                          />
                          <Button
                            size="small"
                            type="text"
                            icon={<UndoOutlined />}
                            disabled={!ajustes.tono}
                            onClick={() => actualizarAjustes({ tono: 0 })}
                            title="Restablecer este ajuste"
                          />
                        </span>
                      </div>
                      <Slider
                        min={-180}
                        max={180}
                        value={ajustes.tono ?? 0}
                        onChange={(v) => actualizarAjustes({ tono: v })}
                        tooltip={{ formatter: (v) => `${v}°` }}
                      />
                    </div>
                    <p className="text-xs font-medium text-gray-500 mt-1 mb-0">
                      Balance de color
                    </p>
                    {([
                      ["rojo", "Rojo"],
                      ["verde", "Verde"],
                      ["azul", "Azul"],
                    ] as const).map(([clave, etiqueta]) => (
                      <div key={clave}>
                        <div className="flex justify-between items-center text-xs text-gray-600">
                          <span>{etiqueta}</span>
                          <span className="flex items-center gap-0.5">
                            <InputNumber
                              size="small"
                              className="w-16"
                              min={25}
                              max={200}
                              value={ajustes[clave] ?? 100}
                              onChange={(v) => {
                                if (typeof v === "number")
                                  actualizarAjustes({ [clave]: Math.round(v) });
                              }}
                            />
                            <Button
                              size="small"
                              type="text"
                              icon={<UndoOutlined />}
                              disabled={(ajustes[clave] ?? 100) === 100}
                              onClick={() => actualizarAjustes({ [clave]: 100 })}
                              title="Restablecer este ajuste"
                            />
                          </span>
                        </div>
                        <Slider
                          min={25}
                          max={200}
                          value={ajustes[clave] ?? 100}
                          onChange={(v) => actualizarAjustes({ [clave]: v })}
                        />
                      </div>
                    ))}
                    <div>
                      <div className="flex justify-between items-center text-xs text-gray-600">
                        <span>Nitidez</span>
                        <span className="flex items-center gap-0.5">
                          <InputNumber
                            size="small"
                            className="w-16"
                            min={0}
                            max={100}
                            value={ajustes.nitidez ?? 0}
                            onChange={(v) => {
                              if (typeof v === "number")
                                actualizarAjustes({ nitidez: Math.round(v) });
                            }}
                          />
                          <Button
                            size="small"
                            type="text"
                            icon={<UndoOutlined />}
                            disabled={!ajustes.nitidez}
                            onClick={() => actualizarAjustes({ nitidez: 0 })}
                            title="Restablecer este ajuste"
                          />
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        value={ajustes.nitidez ?? 0}
                        onChange={(v) => actualizarAjustes({ nitidez: v })}
                      />
                    </div>
                    <Button
                      size="small"
                      icon={<UndoOutlined />}
                      onClick={() =>
                        // Restablece los ajustes de imagen; las preferencias
                        // técnicas (resolución, bitrate, datos del video) se
                        // conservan
                        actualizarAjustes({
                          ...AJUSTES_NEUTROS,
                          resolucion: ajustes.resolucion,
                          bitrate: ajustes.bitrate,
                          overlayNombre: ajustes.overlayNombre,
                          overlayFechaHora: ajustes.overlayFechaHora,
                        })
                      }
                      disabled={esNeutro(ajustes)}
                    >
                      Restablecer
                    </Button>
                  </div>
                }
              >
                <button
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-lg backdrop-blur-md border border-white/15 transition-colors ${
                    esNeutro(ajustes)
                      ? "bg-black/50 hover:bg-black/70"
                      : "bg-[#009b9b]/80 hover:bg-[#009b9b]"
                  }`}
                  title="Ajustes de imagen (resolución, brillo, contraste, color, gamma, tono, balance rojo/verde/azul, nitidez)"
                >
                  <SlidersOutlined />
                </button>
              </Popover>
              <button
                onClick={() => setIsExpanded((v) => !v)}
                className="w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white shadow-lg backdrop-blur-md border border-white/15 transition-colors"
                title={isExpanded ? "Salir de pantalla completa (Esc)" : "Ampliar video"}
              >
                {isExpanded ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              </button>
            </div>

            {/* Hint de captura */}
            {isCapturing && !isPaused && (
              <div className="absolute top-16 right-4 z-20 pointer-events-none">
                <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-lg text-[13px] text-gray-200 flex items-center gap-1.5">
                  <CameraOutlined />
                  Clic en el video para capturar imagen
                </div>
              </div>
            )}

            {/* Botón flotante de captura (obturador) */}
            {isCapturing && !isPaused && (
              <button
                onClick={capturarImagen}
                className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-14 h-14 rounded-full bg-white/90 hover:bg-white active:scale-95 transition-all shadow-2xl border-4 border-white/40 flex items-center justify-center"
                title="Capturar imagen"
              >
                <CameraOutlined className="text-gray-800 text-xl" />
              </button>
            )}

            {/* Overlay de fecha/hora y datos (también queda grabado en el
                video). Cada línea obedece su checkbox en los ajustes. */}
            {(ajustes.overlayFechaHora !== false ||
              ajustes.overlayNombre !== false) && (
              <div className="absolute bottom-4 left-4 z-20 max-w-[36%] pointer-events-none">
                <div className="bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg text-white flex flex-col gap-0.5">
                  {ajustes.overlayFechaHora !== false && (
                    <span className="font-mono text-[15px] tabular-nums leading-tight whitespace-nowrap">
                      {ahora.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}{" "}
                      {ahora.toLocaleTimeString("es-MX", { hour12: false })}
                    </span>
                  )}
                  {ajustes.overlayNombre !== false &&
                    (overlayInfoRef.current.paciente ||
                      overlayInfoRef.current.estudio) && (
                      <span className="text-[13px] text-gray-300 leading-tight truncate">
                        {[overlayInfoRef.current.paciente, overlayInfoRef.current.estudio]
                          .filter(Boolean)
                          .join(" • ")}
                      </span>
                    )}
                </div>
              </div>
            )}

            {/* Panel flotante de capturas en modo expandido (la columna
                normal queda tapada por el video a pantalla completa) */}
            {isExpanded &&
              (isCapturing || manualScreenshots.length > 0) && (
                <div className="absolute left-4 top-20 bottom-28 w-48 z-20 bg-black/55 backdrop-blur-md border border-white/15 rounded-xl flex flex-col overflow-hidden">
                  <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-200 uppercase tracking-wide">
                      Capturas
                    </span>
                    <span className="text-[13px] font-bold bg-white/20 text-white rounded-full min-w-[22px] text-center px-1.5 py-0.5">
                      {manualScreenshots.length}
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
                    {manualScreenshots.length === 0 ? (
                      <p className="text-[13px] text-gray-300 text-center mt-6 px-1 leading-relaxed">
                        Haz clic en el video para capturar
                      </p>
                    ) : (
                      [...manualScreenshots]
                        .map((src, i) => ({ src, num: i + 1 }))
                        .reverse()
                        .map(({ src, num }) => (
                          <div
                            key={num}
                            className="relative rounded-lg overflow-hidden border border-white/20 shrink-0"
                          >
                            <img
                              src={src}
                              alt={`Captura ${num}`}
                              className="w-full aspect-video object-cover"
                            />
                            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                              #{num}
                            </span>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

            {/* Animación de feedback de screenshot (estilo iPhone) */}
            {showScreenshotAnimation && screenshotFeedback && (
              <div className="absolute top-4 left-4 z-30 animate-screenshot-feedback pointer-events-none">
                <div className="bg-white rounded-lg shadow-2xl overflow-hidden border-4 border-white">
                  <img
                    src={screenshotFeedback}
                    alt="Screenshot preview"
                    className="w-24 h-24 object-cover"
                  />
                </div>
              </div>
            )}

            {/* Estadísticas */}
            <div
              className={`absolute right-4 z-20 pointer-events-none ${
                isExpanded ? "bottom-20" : "bottom-4"
              }`}
            >
              <div className="bg-black/40 px-4 py-3 rounded-lg text-white text-xs space-y-2">
                <div className="font-semibold text-gray-200 tracking-wide uppercase">
                  Resumen en tiempo real
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`text-2xl font-bold ${
                        displayPolyps > 0 ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {displayPolyps}
                    </span>
                    <span className="text-[13px] text-gray-200">Pólipos</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm">Frame {stats.frame}</span>
                    <span className="text-[13px] text-gray-300">
                      {stats.time.toFixed(2)} ms / frame
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* LLM Analysis Overlay */}
            {llmAnalysis && (
              <div
                className={`absolute top-4 left-4 z-20 bg-black/40 px-4 py-3 rounded-lg text-white text-xs space-y-2 max-w-xs md:max-w-sm cursor-pointer hover:bg-black/60 transition ${
                  isLlmExpanded ? "max-h-64" : "max-h-16 overflow-hidden"
                }`}
                onClick={() => setIsLlmExpanded((prev) => !prev)}
              >
                {/* Encabezado */}
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-blue-300 tracking-wide uppercase">
                    Análisis LLM
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[12px] font-semibold ${
                      llmAnalysis.severity === "benign"
                        ? "bg-green-600"
                        : llmAnalysis.severity === "malignant"
                          ? "bg-red-600"
                          : "bg-yellow-600"
                    }`}
                  >
                    {llmAnalysis.severity || "N/A"}
                  </span>
                </div>

                {/* Contenido compacto / expandido */}
                {isLlmExpanded ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="font-semibold">Pólipo:</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[13px] font-semibold ${
                          llmAnalysis.has_polyp
                            ? "bg-red-500 text-white"
                            : "bg-green-500 text-white"
                        }`}
                      >
                        {llmAnalysis.has_polyp ? "Detectado" : "No detectado"}
                      </span>
                      {llmAnalysis.confidence_level && (
                        <span className="text-[13px] text-gray-200">
                          {llmAnalysis.confidence_level}
                        </span>
                      )}
                    </div>

                    {llmAnalysis.description && (
                      <p className="mt-1 text-[13px] text-gray-200 leading-snug">
                        {llmAnalysis.description}
                      </p>
                    )}

                    {llmAnalysis.recommendations &&
                      llmAnalysis.recommendations.length > 0 && (
                        <div className="border-t border-gray-600 pt-2 mt-1">
                          <p className="text-[13px] font-semibold text-green-300 mb-1">
                            Recomendaciones
                          </p>
                          <ul className="text-[13px] text-gray-200 space-y-1 max-h-24 overflow-auto pr-1">
                            {llmAnalysis.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex gap-2">
                                <span className="text-green-300">•</span>
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </>
                ) : (
                  <div className="mt-1 text-[13px] text-gray-200">
                    {llmAnalysis.description
                      ? llmAnalysis.description.length > 80
                        ? `${llmAnalysis.description.slice(0, 80)}...`
                        : llmAnalysis.description
                      : llmAnalysis.has_polyp
                        ? "Pólipo detectado, pulsa para ver detalles."
                        : "Sin hallazgos relevantes. Pulsa para ver más."}
                  </div>
                )}
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {/* Panel inferior: cámara + controles */}
      <div className="max-w-7xl mx-auto w-full px-6 pb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowDeviceSelector(!showDeviceSelector)}
              disabled={isCapturing}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded font-semibold flex items-center gap-2"
            >
              Cámara ({devices.length})
            </button>

            {showDeviceSelector && (
              <div className="flex gap-2 flex-wrap">
                {devices.length === 0 ? (
                  <p className="text-gray-400 text-sm">
                    No hay cámaras disponibles
                  </p>
                ) : (
                  devices.map((device) => (
                    <button
                      key={device.deviceId}
                      onClick={() => {
                        setSelectedDeviceId(device.deviceId);
                        setShowDeviceSelector(false);
                      }}
                      className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                        selectedDeviceId === device.deviceId
                          ? "bg-green-600 text-white"
                          : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                      }`}
                    >
                      {device.label || `Cámara ${devices.indexOf(device) + 1}`}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <Button
              type="primary"
              onClick={startSession}
              disabled={isCapturing}
              title={
                !isConnected
                  ? "Modo sin IA - Solo grabación"
                  : "Iniciar con análisis IA"
              }
            >
              {isConnected ? "Iniciar con IA" : "Iniciar (sin IA)"}
            </Button>
            <Button
              icon={<CameraOutlined />}
              onClick={capturarImagen}
              disabled={!isCapturing || isPaused}
            >
              Capturar foto
            </Button>
            <Button onClick={handlePause} disabled={!isCapturing || isPaused}>
              Pausar
            </Button>
            <Button onClick={handleResume} disabled={!isCapturing || !isPaused}>
              Reanudar
            </Button>
            <Button danger onClick={handleFinish} disabled={!isCapturing}>
              Finalizar y guardar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Detection;
