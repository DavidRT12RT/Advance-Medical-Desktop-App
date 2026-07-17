import React, { useRef, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, message, Modal, Progress, Spin } from "antd";
import { ArrowLeftOutlined, VideoCameraOutlined } from "@ant-design/icons";
import Webcam from "react-webcam";
import io, { Socket } from "socket.io-client";
import FirebaseEstudios from "../features/FirebaseEstudios";
import FirebasePacientes from "../features/FirebasePacientes";
import FirebaseMedia from "../features/FirebaseMedia";
import SectionTitle from "../components/common/SectionTitle";
import { useElectronStore } from "../hooks/useElectronStore";

// URL del servidor de IA (API Python con YOLO/Ollama).
// Se define en build con VITE_API_SERVER_URL (archivo .env en la raíz del
// proyecto o variable de entorno en CI); sin ella usa la API local.
const SERVER_URL =
  import.meta.env.VITE_API_SERVER_URL || "http://localhost:8000";
const FRAME_WIDTH = Number(process.env.NEXT_PUBLIC_API_WIDTH) || 640;
const FRAME_HEIGHT = Number(process.env.NEXT_PUBLIC_API_HEIGHT) || 480;
const TARGET_FPS = Number(process.env.NEXT_PUBLIC_API_FPS) || 60;

const getVideoConstraints = (deviceId?: string) => ({
  deviceId: deviceId ? { exact: deviceId } : undefined,
  width: { exact: FRAME_WIDTH },
  height: { exact: FRAME_HEIGHT },
});

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
      const canvas = document.createElement("canvas");
      canvas.width = FRAME_WIDTH;
      canvas.height = FRAME_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("No se pudo obtener el contexto del canvas"));
        return;
      }

      // Dibujar la imagen base
      ctx.drawImage(img, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

      // Dibujar detecciones en verde (mismo estilo que overlay)
      ctx.strokeStyle = "#00FF00";
      ctx.lineWidth = 2;
      ctx.font = "14px Arial";

      (detections || []).forEach((d: any) => {
        const bbox = d.bbox;
        if (!bbox) return;
        const { x1, y1, x2, y2 } = bbox;
        const width = x2 - x1;
        const height = y2 - y1;

        ctx.strokeRect(x1, y1, width, height);

        const className = d.class ?? d.className ?? "polyp";
        const confidence = d.confidence ?? 0;
        const label = `${className} (${(confidence * 100).toFixed(1)}%)`;

        const textMetrics = ctx.measureText(label);
        const textHeight = 18;

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(x1, y2 + 2, textMetrics.width + 4, textHeight);

        ctx.fillStyle = "#00FF00";
        ctx.fillText(label, x1 + 2, y2 + 16);
      });

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
  const [saveProgress, setSaveProgress] = useState(0);
  const [saveStage, setSaveStage] = useState("Preparando…");
  // Cronómetro de grabación (segundos)
  const [recordingSeconds, setRecordingSeconds] = useState(0);

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
            "Este estudio ya está finalizado. El módulo de detección solo está disponible para estudios en progreso.",
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
    const id = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [isCapturing, isPaused]);

  const formatTiempo = (total: number) => {
    const m = Math.floor(total / 60).toString().padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  useEffect(() => {
    const handleKeyPress = async (event: KeyboardEvent) => {
      // Solo capturar si es la tecla Espacio y estamos capturando
      if (event.code === "Space" && isCapturing && !isPaused) {
        event.preventDefault();

        const screenshot = webcamRef.current?.getScreenshot();
        if (!screenshot || !pacienteId || !estudioId) return;

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
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => {
      window.removeEventListener("keydown", handleKeyPress);
    };
  }, [isCapturing, isPaused, pacienteId, estudioId, empresaId, sessionId]);

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
      if (!canvas || !container) return;
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetWidth = Math.floor(rect.width * dpr);
      const targetHeight = Math.floor(rect.height * dpr);
      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
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

              drawDetectionsOnImage(screenshot, data.detections || [])
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

    const canvas = canvasRef.current as HTMLCanvasElement | null;
    const mediaStream =
      canvas && (canvas as any).captureStream
        ? (canvas as any).captureStream(TARGET_FPS)
        : undefined;
    if (mediaStream && typeof MediaRecorder !== "undefined") {
      try {
        const recorder = new MediaRecorder(mediaStream, {
          mimeType: "video/webm",
        });
        mediaRecorderRef.current = recorder;
        recorder.ondataavailable = (event: BlobEvent) => {
          if (event.data && event.data.size > 0) {
            recordedChunksRef.current.push(event.data);
          }
        };
        recorder.start();
      } catch (error) {
        console.error("No se pudo iniciar la grabación de video:", error);
      }
    }
  }, [isConnected, empresaId, pacienteId, estudioId, doctorId]);

  // Capturar y enviar frames (funciona con o sin servidor)
  useEffect(() => {
    if (!isCapturing || !webcamRef.current) return;

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

            ctx.drawImage(img, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);

            // Dibujar también los bounding boxes en el canvas de procesamiento
            const detections = lastDetectionsRef.current || [];
            ctx.strokeStyle = "#00FF00";
            ctx.lineWidth = 2;
            ctx.font = "14px Arial";

            (detections || []).forEach((d: any) => {
              const bbox = d.bbox;
              if (!bbox) return;
              const { x1, y1, x2, y2 } = bbox;
              const width = x2 - x1;
              const height = y2 - y1;

              ctx.strokeRect(x1, y1, width, height);

              const className = d.class ?? d.className ?? "polyp";
              const confidence = d.confidence ?? 0;
              const label = `${className} (${(confidence * 100).toFixed(1)}%)`;

              const textMetrics = ctx.measureText(label);
              const textHeight = 18;

              ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
              ctx.fillRect(x1, y2 + 2, textMetrics.width + 4, textHeight);

              ctx.fillStyle = "#00FF00";
              ctx.fillText(label, x1 + 2, y2 + 16);
            });

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
  }, [isCapturing]);

  // Controles (funcionan con o sin servidor)
  const handlePause = () => {
    setIsPaused(true);
    isCapturingRef.current = false;

    // Si hay servidor, notificar
    if (socketRef.current?.connected) {
      socketRef.current.emit("pause");
    }

    messageApi.info("Captura pausada");
  };

  const handleResume = () => {
    setIsPaused(false);
    setIsCapturing(true);

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
          const videoBlob = new Blob(recordedChunksRef.current, {
            type: "video/webm",
          });
          const sessionKey = sessionId || "general";
          setSaveStage("Subiendo video de captura…");
          // La subida del video es ~90% del trabajo; el resto es guardar resultados
          videoUrl = await FirebaseMedia.subirVideoDeEstudio(
            empresaId,
            pacienteId,
            estudioId,
            sessionKey,
            videoBlob,
            (percent) => setSaveProgress(Math.round(percent * 0.9)),
          );
        } catch (error) {
          console.error("Error subiendo video de consulta:", error);
        }
      } else {
        setSaveProgress(80);
      }
      setSaveStage("Guardando resultados del estudio…");
      setSaveProgress((p) => Math.max(p, 90));

      // Solo agregar sección si hay datos de IA, video o capturas manuales
      if (
        cnnData ||
        llmAnalysis ||
        videoUrl ||
        manualScreenshotsRef.current.length > 0
      ) {
        newSecciones.push({
          ia_cnn: cnnData,
          ia_llm: llmAnalysis,
          timestamp: new Date().toISOString(),
          polypImages: polypImageUrlsRef.current,
          manualScreenshots: manualScreenshotsRef.current,
          videoUrl,
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

      navigate(`/paciente-detalle/${pacienteId}/estudios/${estudioId}`);
    }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {contextHolder}

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
          <p className="text-xs text-gray-500 text-center leading-relaxed">
            {saveStage}
            <br />
            No cierres la aplicación.
          </p>
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
                  ? `Detección IA - ${[
                      paciente.nombres,
                      paciente.apellidoPaterno,
                      paciente.apellidoMaterno,
                    ]
                      .filter(Boolean)
                      .join(" ")}`
                  : "Detección asistida por IA"
              }
              icon={<VideoCameraOutlined className="text-indigo-600" />}
            />
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {estudio?.tipo && (
                <span className="px-2 py-0.5 rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-[11px] font-medium">
                  {estudio.tipo}
                </span>
              )}
              {estudio?.estado && (
                <span
                  className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${
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

            <div className="flex items-center gap-1 text-[11px]">
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
              <span className="hidden sm:inline text-[11px] text-gray-400">
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
            <div className="w-36 shrink-0 h-full bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
              <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  Capturas
                </span>
                <span className="text-[11px] font-bold bg-gray-900 text-white rounded-full min-w-[22px] text-center px-1.5 py-0.5">
                  {manualScreenshots.length}
                </span>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
                {manualScreenshots.length === 0 ? (
                  <p className="text-[11px] text-gray-400 text-center mt-6 px-1 leading-relaxed">
                    Presiona{" "}
                    <kbd className="px-1 py-0.5 bg-gray-100 border border-gray-300 rounded text-[9px] font-mono">
                      ESPACIO
                    </kbd>{" "}
                    durante la grabación para capturar
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
                        <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
                          #{num}
                        </span>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* Video */}
          <div className="bg-black rounded-xl overflow-hidden shadow-sm border border-gray-900 flex-1 h-full min-w-0">
          <div ref={containerRef} className="relative w-full h-full">
            <Webcam
              audio={false}
              ref={webcamRef}
              videoConstraints={getVideoConstraints(selectedDeviceId)}
              className="w-full h-full object-contain relative z-0"
              disablePictureInPicture={true}
              forceScreenshotSourceSize={true}
              imageSmoothing={true}
              mirrored={false}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.95}
            />

            {/* Canvas oculto (procesamiento interno) */}
            <canvas ref={canvasRef} className="hidden" />

            {/* Canvas overlay para detecciones */}
            <canvas
              ref={overlayCanvasRef}
              width={FRAME_WIDTH}
              height={FRAME_HEIGHT}
              className="absolute top-0 left-0 w-full h-full z-10"
              style={{ cursor: "crosshair" }}
            />

            {/* Indicador de grabación: estilo sutil tipo glass */}
            {isCapturing && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                <div className="flex items-center gap-2.5 pl-3 pr-4 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/10 shadow-lg">
                  <span className="relative flex h-2.5 w-2.5">
                    {!isPaused && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-60" />
                    )}
                    <span
                      className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                        isPaused ? "bg-yellow-400" : "bg-red-500"
                      }`}
                    />
                  </span>
                  <span
                    className={`text-[11px] font-semibold tracking-[0.18em] ${
                      isPaused ? "text-yellow-300" : "text-red-400"
                    }`}
                  >
                    {isPaused ? "PAUSA" : "REC"}
                  </span>
                  <span className="font-mono text-[13px] text-white/90 tabular-nums">
                    {formatTiempo(recordingSeconds)}
                  </span>
                </div>
              </div>
            )}

            {/* Mensaje informativo - Captura con Espacio */}
            {isCapturing && (
              <div className="absolute top-4 right-4 z-20">
                <div className="bg-black/40 px-4 py-2 rounded-lg text-white text-xs">
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 bg-white/20 rounded text-[10px] font-mono">
                      ESPACIO
                    </kbd>
                    <span className="text-[11px] text-gray-200">
                      para capturar imagen
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Animación de feedback de screenshot (estilo iPhone) */}
            {showScreenshotAnimation && screenshotFeedback && (
              <div className="absolute top-4 left-4 z-30 animate-screenshot-feedback">
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
            <div className="absolute bottom-4 right-4 z-20">
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
                    <span className="text-[11px] text-gray-200">Pólipos</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm">Frame {stats.frame}</span>
                    <span className="text-[11px] text-gray-300">
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
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
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
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          llmAnalysis.has_polyp
                            ? "bg-red-500 text-white"
                            : "bg-green-500 text-white"
                        }`}
                      >
                        {llmAnalysis.has_polyp ? "Detectado" : "No detectado"}
                      </span>
                      {llmAnalysis.confidence_level && (
                        <span className="text-[11px] text-gray-200">
                          {llmAnalysis.confidence_level}
                        </span>
                      )}
                    </div>

                    {llmAnalysis.description && (
                      <p className="mt-1 text-[11px] text-gray-200 leading-snug">
                        {llmAnalysis.description}
                      </p>
                    )}

                    {llmAnalysis.recommendations &&
                      llmAnalysis.recommendations.length > 0 && (
                        <div className="border-t border-gray-600 pt-2 mt-1">
                          <p className="text-[11px] font-semibold text-green-300 mb-1">
                            Recomendaciones
                          </p>
                          <ul className="text-[11px] text-gray-200 space-y-1 max-h-24 overflow-auto pr-1">
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
                  <div className="mt-1 text-[11px] text-gray-200">
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
