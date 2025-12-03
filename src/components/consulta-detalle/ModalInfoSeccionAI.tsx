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

        return (
          <div className="space-y-4">
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
          </div>
        );
      })()}
    </Modal>
  );
};

export default ModalInfoSeccionAI;
