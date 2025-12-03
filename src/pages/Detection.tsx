import React, { useRef, useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, message } from "antd";
import { ArrowLeftOutlined, VideoCameraOutlined } from "@ant-design/icons";
import Webcam from "react-webcam";
import io, { Socket } from "socket.io-client";
import FirebaseConsultas from "../features/FirebaseConsultas";
import FirebasePacientes from "../features/FirebasePacientes";
import SectionTitle from "../components/common/SectionTitle";

const SERVER_URL =
  process.env.NEXT_PUBLIC_API_SERVER_URL || "http://localhost:8000";
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
  const { id: pacienteId, consultaId } = useParams<{
    id: string;
    consultaId: string;
  }>();
  const navigate = useNavigate();
  // TODO: Obtener empresaId y doctorId del contexto de autenticación
  const empresaId = "GoFayqIW9MR718FzNpyzGUgaK283";
  const doctorId = "doctor-demo";

  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const frameIndexRef = useRef(0);
  const isCapturingRef = useRef(false);
  const polypEventsRef = useRef<CnnPolypEvent[]>([]);

  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [stats, setStats] = useState({
    frame: 0,
    polyps: 0,
    time: 0,
  });
  const [llmAnalysis, setLlmAnalysis] = useState<LLMAnalysis | null>(null);
  const [isLlmExpanded, setIsLlmExpanded] = useState(false);
  const [paciente, setPaciente] = useState<any | null>(null);
  const [consulta, setConsulta] = useState<any | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  const subtitle = consulta
    ? [
        consulta.tipo,
        consulta.fecha,
        consulta.estado && `Estado: ${consulta.estado}`,
      ]
        .filter(Boolean)
        .join(" • ")
    : "";

  // Obtener lista de dispositivos de video disponibles
  useEffect(() => {
    const getVideoDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(
          (device) => device.kind === "videoinput"
        );
        setDevices(videoDevices);

        // Seleccionar el primer dispositivo por defecto
        if (videoDevices.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(videoDevices[0].deviceId);
        }
      } catch (error) {
        console.error("Error obteniendo dispositivos de video:", error);
      }
    };

    getVideoDevices();

    // Escuchar cambios en dispositivos (cuando se conecta/desconecta una cámara)
    navigator.mediaDevices.addEventListener("devicechange", getVideoDevices);
    return () => {
      navigator.mediaDevices.removeEventListener(
        "devicechange",
        getVideoDevices
      );
    };
  }, []);

  // Cargar información de consulta y paciente para el header
  useEffect(() => {
    const fetchInfo = async () => {
      if (!pacienteId || !consultaId) return;
      try {
        const consultaData: any = await FirebaseConsultas.obtenerConsultaPorId(
          empresaId,
          pacienteId,
          consultaId
        );
        setConsulta(consultaData);
        if (consultaData?.estado === "finalizada") {
          message.info(
            "Esta consulta ya está finalizada. El módulo de detección solo está disponible para consultas en progreso."
          );
          navigate(`/paciente-detalle/${pacienteId}/consultas/${consultaId}`);
          return;
        }
        if (consultaData?.paciente_id) {
          const pacienteData = await FirebasePacientes.obtenerPacientePorId(
            empresaId,
            consultaData.paciente_id
          );
          setPaciente(pacienteData);
        }
      } catch (error) {
        console.error(
          "Error cargando información de consulta/paciente:",
          error
        );
      }
    };

    fetchInfo();
  }, [empresaId, pacienteId, consultaId]);

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
      canvas.height / FRAME_HEIGHT
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
        height * scale
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
        textHeight
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

  // Inicializar Socket.IO
  useEffect(() => {
    const socket = io(SERVER_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ["websocket", "polling"],
    });

    // Eventos de conexión
    socket.on("connect", () => {
      console.log("Conectado al servidor");
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      console.log("Desconectado del servidor");
      setIsConnected(false);
      setIsCapturing(false);
    });

    // Sesión iniciada
    socket.on(
      "session_started",
      (data: { session_id: string; timestamp: string }) => {
        console.log("Sesión iniciada:", data.session_id);
        setSessionId(data.session_id);
      }
    );

    // Detección
    socket.on("detection", (data: DetectionResult) => {
      console.log("Detection que nos envia:", data);
      setStats({
        frame: data.frame_index,
        polyps: data.num_polyps,
        time: data.processing_time_ms,
      });

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

    return () => {
      socket.disconnect();
    };
  }, []);

  // Iniciar sesión
  const startSession = useCallback(async () => {
    if (!socketRef.current || !isConnected) {
      message.error("No conectado al servidor de IA");
      return;
    }

    if (!pacienteId || !consultaId) {
      message.error("Falta el contexto de paciente/consulta");
      return;
    }

    socketRef.current.emit("start_session", {
      empresa_id: empresaId,
      doctor_id: doctorId,
      paciente_id: pacienteId,
      consulta_id: consultaId,
    });

    // Marcar consulta como en progreso
    try {
      await FirebaseConsultas.actualizarConsulta(
        empresaId,
        pacienteId,
        consultaId,
        { estado: "en_progreso" }
      );
    } catch (error) {
      console.error("Error actualizando estado de consulta:", error);
    }

    setIsCapturing(true);
    frameIndexRef.current = 0;
    polypEventsRef.current = [];
  }, [isConnected, empresaId, pacienteId, consultaId, doctorId]);

  // Capturar y enviar frames
  useEffect(() => {
    if (!isCapturing || !webcamRef.current) return;

    const captureFrames = async () => {
      isCapturingRef.current = true;

      while (isCapturingRef.current && socketRef.current?.connected) {
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
            const imageData = ctx.getImageData(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
            const data = imageData.data;

            // RGBA → RGB
            const rgbBuffer = new Uint8Array(FRAME_WIDTH * FRAME_HEIGHT * 3);
            for (let i = 0, j = 0; i < data.length; i += 4, j += 3) {
              rgbBuffer[j] = data[i];
              rgbBuffer[j + 1] = data[i + 1];
              rgbBuffer[j + 2] = data[i + 2];
            }

            // Enviar frame
            socketRef.current?.emit("frame", {
              frame_index: frameIndexRef.current++,
              data: rgbBuffer,
            });
          };
          img.src = imageSrc;

          // Esperar para 60 FPS
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 / TARGET_FPS)
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

  // Controles
  const handlePause = () => {
    socketRef.current?.emit("pause");
  };

  const handleResume = () => {
    socketRef.current?.emit("resume");
  };

  const handleFinish = async () => {
    isCapturingRef.current = false;
    socketRef.current?.emit("finish");
    setIsCapturing(false);

    if (pacienteId && consultaId) {
      const allEvents = polypEventsRef.current;
      const allSegments = buildPolypSegments(allEvents);

      // Filtrar solo segmentos clínicamente relevantes (confianza mínima)
      const importantSegments = allSegments.filter(
        (seg) => (seg.maxConfidence || 0) >= MIN_SEGMENT_CONFIDENCE
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

      const cnnData = {
        summary: {
          lastFrame: stats.frame,
          lastPolypCount: stats.polyps,
          lastProcessingTimeMs: stats.time,
          totalPolypEvents: allEvents.length,
          totalSegments: importantSegments.length,
        },
        segments: topSegments,
      };

      //Obtener las sesiones actuales
      const newSecciones = consulta?.secciones_ai || [];
      newSecciones.push({
        ia_cnn: cnnData,
        ia_llm: llmAnalysis,
        timestamp: new Date().toISOString(),
      });

      try {
        await FirebaseConsultas.actualizarConsulta(
          empresaId,
          pacienteId,
          consultaId,
          { secciones_ai: newSecciones }
        );
        message.success("Resultados de IA guardados en la consulta");
      } catch (error) {
        message.error("No se pudieron guardar los resultados de IA");
      }

      navigate(`/paciente-detalle/${pacienteId}/consultas/${consultaId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white w-full">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          onClick={() =>
            pacienteId && consultaId
              ? navigate(
                  `/paciente-detalle/${pacienteId}/consultas/${consultaId}`
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
              {consulta?.tipo && (
                <span className="px-2 py-0.5 rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-[11px] font-medium">
                  {consulta.tipo}
                </span>
              )}
              {consulta?.estado && (
                <span
                  className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                    consulta.estado === "pendiente"
                      ? "bg-orange-50 text-orange-700 border-orange-100"
                      : consulta.estado === "finalizada"
                      ? "bg-green-50 text-green-700 border-green-100"
                      : "bg-blue-50 text-blue-700 border-blue-100"
                  }`}
                >
                  {consulta.estado[0].toUpperCase() + consulta.estado.slice(1)}
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
        {(consulta?.ia_cnn || consulta?.ia_llm) && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-50 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                Última detección registrada
              </p>
              <p className="text-sm text-gray-700 mt-1">
                {`Pólipos detectados: ${consulta?.ia_cnn?.lastPolypCount ?? 0}`}
                {consulta?.ia_llm?.severity &&
                  ` • Severidad: ${consulta.ia_llm.severity}`}
              </p>
            </div>
          </div>
        )}

        {/* Video */}
        <div className="bg-black rounded-xl overflow-hidden shadow-sm border border-gray-900 flex-1 min-h-[360px]">
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
                        stats.polyps > 0 ? "text-red-400" : "text-green-400"
                      }`}
                    >
                      {stats.polyps}
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
              disabled={!isConnected || isCapturing}
            >
              Iniciar
            </Button>
            <Button onClick={handlePause} disabled={!isCapturing}>
              Pausar
            </Button>
            <Button onClick={handleResume} disabled={!isCapturing}>
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
