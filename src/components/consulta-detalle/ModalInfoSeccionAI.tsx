import React, { useRef, useState } from "react";
import { Modal, Button, message } from "antd";
import { CameraOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import FirebaseMedia from "../../features/FirebaseMedia";
import FirebaseEstudios from "../../features/FirebaseEstudios";

interface ModalInfoSeccionAIProps {
  isSessionModalOpen: boolean;
  setIsSessionModalOpen: (open: boolean) => void;
  selectedSessionIndex: number;
  aiSessions: any[];
  // Contexto para poder capturar fotogramas del video y persistirlos
  empresaId?: string;
  pacienteId?: string;
  estudioId?: string;
  onSeccionesActualizadas?: (nuevasSecciones: any[]) => void;
}

const ModalInfoSeccionAI = ({
  isSessionModalOpen,
  setIsSessionModalOpen,
  selectedSessionIndex,
  aiSessions,
  empresaId,
  pacienteId,
  estudioId,
  onSeccionesActualizadas,
}: ModalInfoSeccionAIProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [capturando, setCapturando] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Captura el fotograma actual del video reproducido y lo agrega a las
  // capturas manuales de la sesión (queda disponible para el reporte)
  const capturarDelVideo = async () => {
    const video = videoRef.current;
    if (!video || !empresaId || !pacienteId || !estudioId) return;
    if (video.readyState < 2) {
      message.warning("El video aún no ha cargado");
      return;
    }
    try {
      setCapturando(true);
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas no disponible");
      ctx.drawImage(video, 0, 0);
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("No se pudo extraer el fotograma"))),
          "image/jpeg",
          0.95,
        ),
      );

      const url = await FirebaseMedia.subirFrameDeEstudio(
        empresaId,
        pacienteId,
        estudioId,
        "video_revision",
        Date.now(),
        blob,
      );

      const nuevasSecciones = aiSessions.map((s, i) =>
        i === selectedSessionIndex
          ? {
              ...s,
              manualScreenshots: [
                ...(Array.isArray(s.manualScreenshots)
                  ? s.manualScreenshots
                  : []),
                url,
              ],
            }
          : s,
      );
      await FirebaseEstudios.actualizarEstudio(empresaId, pacienteId, estudioId, {
        secciones_ai: nuevasSecciones,
      });
      onSeccionesActualizadas?.(nuevasSecciones);
      message.success("Fotograma capturado y agregado a las capturas manuales");
    } catch (error) {
      console.error("Error capturando fotograma del video:", error);
      message.error("No se pudo capturar el fotograma");
    } finally {
      setCapturando(false);
    }
  };

  return (
    <Modal
      open={isSessionModalOpen}
      onCancel={() => setIsSessionModalOpen(false)}
      footer={null}
      centered
      width={720}
      title={
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-gray-800">
            {`Sesión de IA ${selectedSessionIndex + 1}`}
          </span>
          <span className="text-xs text-gray-500">
            {aiSessions[selectedSessionIndex].timestamp
              ? dayjs(aiSessions[selectedSessionIndex].timestamp).format(
                  "DD/MM/YYYY HH:mm:ss",
                )
              : "Sin fecha registrada"}
          </span>
        </div>
      }
    >
      {(() => {
        const session = aiSessions[selectedSessionIndex];
        const cnn = session?.ia_cnn;
        const cnnSummary = cnn?.summary;
        const segments = cnn?.segments || [];
        const llm = session?.ia_llm;
        const polypImages: string[] = Array.isArray(session?.polypImages)
          ? session.polypImages
          : [];
        const manualScreenshots: string[] = Array.isArray(
          session?.manualScreenshots,
        )
          ? session.manualScreenshots
          : [];
        const videoUrl: string | undefined = session?.videoUrl;
        const sessionMode = session?.mode || "unknown";

        return (
          <div className="space-y-5">
            {(videoUrl ||
              polypImages.length > 0 ||
              manualScreenshots.length > 0) && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-4">
                {/* Indicador de modo de sesión */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded text-[10px] font-semibold ${
                      sessionMode === "with_ai"
                        ? "bg-green-600 text-white"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {sessionMode === "with_ai" ? "Con IA" : "Solo Video"}
                  </span>
                </div>

                {videoUrl && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                        Video de la sesión
                      </p>
                      {empresaId && pacienteId && estudioId && (
                        <Button
                          size="small"
                          icon={<CameraOutlined />}
                          loading={capturando}
                          onClick={capturarDelVideo}
                          title="Captura el fotograma actual del video y lo agrega a las capturas manuales"
                        >
                          Capturar fotograma
                        </Button>
                      )}
                    </div>
                    <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
                      <video
                        ref={videoRef}
                        src={videoUrl}
                        controls
                        crossOrigin="anonymous"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Pausa el video en el momento deseado y pulsa "Capturar
                      fotograma" para agregar esa imagen a las capturas del
                      estudio.
                    </p>
                  </div>
                )}

                {polypImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-green-300 uppercase tracking-wide">
                        Detecciones IA (Pólipos)
                      </p>
                      <span className="text-[11px] text-gray-400">
                        {polypImages.length === 1
                          ? "1 imagen"
                          : `${polypImages.length} imágenes`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-auto pr-1">
                      {polypImages.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewImage(url)}
                          className="relative group rounded-md overflow-hidden border-2 border-green-700 hover:border-green-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                        >
                          <img
                            src={url}
                            alt={`Pólipo detectado ${idx + 1}`}
                            className="w-full h-20 object-cover transform group-hover:scale-105 transition"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-green-600 text-[10px] text-white font-semibold">
                            IA #{idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {manualScreenshots.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">
                        Capturas Manuales
                      </p>
                      <span className="text-[11px] text-gray-400">
                        {manualScreenshots.length === 1
                          ? "1 captura"
                          : `${manualScreenshots.length} capturas`}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-auto pr-1">
                      {manualScreenshots.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setPreviewImage(url)}
                          className="relative group rounded-md overflow-hidden border-2 border-blue-700 hover:border-blue-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        >
                          <img
                            src={url}
                            alt={`Captura manual ${idx + 1}`}
                            className="w-full h-20 object-cover transform group-hover:scale-105 transition"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-blue-600 text-[10px] text-white font-semibold">
                            #{idx + 1}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Resumen CNN
                </p>
                {cnnSummary ? (
                  <ul className="text-xs text-gray-700 space-y-1">
                    <li>{`Último frame: ${cnnSummary.lastFrame ?? "-"}`}</li>
                    <li>{`Último conteo de pólipos: ${
                      cnnSummary.lastPolypCount ?? 0
                    }`}</li>
                    <li>{`Eventos de pólipos: ${
                      cnnSummary.totalPolypEvents ?? 0
                    }`}</li>
                    <li>{`Segmentos relevantes: ${
                      cnnSummary.totalSegments ?? segments.length
                    }`}</li>
                    <li>{`Tiempo promedio último frame: ${
                      cnnSummary.lastProcessingTimeMs?.toFixed
                        ? cnnSummary.lastProcessingTimeMs.toFixed(2)
                        : cnnSummary.lastProcessingTimeMs || "-"
                    } ms`}</li>
                  </ul>
                ) : (
                  <p className="text-xs text-gray-500">
                    Sin datos de resumen CNN para esta sesión.
                  </p>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  Resumen LLM
                </p>
                {llm ? (
                  <div className="space-y-1 text-xs text-gray-700">
                    <p>
                      {llm.has_polyp
                        ? "Pólipo detectado"
                        : "Sin pólipos detectados"}
                      {llm.severity && ` · Severidad: ${llm.severity}`}
                      {llm.confidence_level &&
                        ` · Confianza: ${llm.confidence_level}`}
                    </p>
                    {llm.description && (
                      <p className="text-gray-600 mt-1">{llm.description}</p>
                    )}
                    {llm.recommendations &&
                      Array.isArray(llm.recommendations) &&
                      llm.recommendations.length > 0 && (
                        <div className="mt-2">
                          <p className="font-semibold text-gray-600 mb-1">
                            Recomendaciones
                          </p>
                          <ul className="list-disc list-inside space-y-1">
                            {llm.recommendations.map(
                              (rec: string, idx: number) => (
                                <li key={idx}>{rec}</li>
                              ),
                            )}
                          </ul>
                        </div>
                      )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500">
                    Sin análisis LLM para esta sesión.
                  </p>
                )}
              </div>
            </div>

            {segments.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
                  Segmentos detectados
                </p>
                <div className="space-y-2 max-h-56 overflow-auto pr-1">
                  {segments.map((seg: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-700 flex flex-col md:flex-row md:items-center md:justify-between gap-2"
                    >
                      <div>
                        <p className="font-semibold text-gray-800">
                          {`Segmento ${idx + 1}`}
                          <span className="text-[11px] text-gray-500 ml-1">
                            {seg.className || "polyp"}
                          </span>
                        </p>
                        <p>{`Frames ${seg.startFrame ?? "-"} – ${
                          seg.endFrame ?? "-"
                        }`}</p>
                      </div>
                      <div className="md:text-right space-y-1">
                        <p>{`Confianza máx: ${
                          seg.maxConfidence
                            ? `${(seg.maxConfidence * 100).toFixed(1)}%`
                            : "-"
                        }`}</p>
                        {seg.startTimestamp && seg.endTimestamp && (
                          <p className="text-[11px] text-gray-500">
                            {dayjs(seg.startTimestamp).format("HH:mm:ss")}
                            {" – "}
                            {dayjs(seg.endTimestamp).format("HH:mm:ss")}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewImage && (
              <Modal
                open={!!previewImage}
                footer={null}
                onCancel={() => setPreviewImage(null)}
                centered
                width={900}
              >
                <div className="w-full flex items-center justify-center bg-black rounded-md overflow-hidden">
                  <img
                    src={previewImage}
                    alt="Detalle de pólipo"
                    className="max-h-[75vh] w-auto object-contain"
                  />
                </div>
              </Modal>
            )}
          </div>
        );
      })()}
    </Modal>
  );
};

export default ModalInfoSeccionAI;
