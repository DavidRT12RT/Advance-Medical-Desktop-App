import React, { useState } from "react";
import { Modal } from "antd";
import dayjs from "dayjs";

interface ModalInfoSeccionAIProps {
  isSessionModalOpen: boolean;
  setIsSessionModalOpen: (open: boolean) => void;
  selectedSessionIndex: number;
  aiSessions: any[];
}

const ModalInfoSeccionAI = ({
  isSessionModalOpen,
  setIsSessionModalOpen,
  selectedSessionIndex,
  aiSessions,
}: ModalInfoSeccionAIProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

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
                  "DD/MM/YYYY HH:mm:ss"
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
        const videoUrl: string | undefined = session?.videoUrl;

        return (
          <div className="space-y-5">
            {(videoUrl || polypImages.length > 0) && (
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-4">
                {videoUrl && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      Video de la sesión
                    </p>
                    <div className="aspect-video w-full rounded-md overflow-hidden bg-black">
                      <video
                        src={videoUrl}
                        controls
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>
                )}

                {polypImages.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                        Imágenes capturadas
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
                          className="relative group rounded-md overflow-hidden border border-gray-700 hover:border-indigo-400 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                        >
                          <img
                            src={url}
                            alt={`Polipo ${idx + 1}`}
                            className="w-full h-20 object-cover transform group-hover:scale-105 transition"
                          />
                          <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-full bg-black/70 text-[10px] text-gray-100">
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
                              )
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
