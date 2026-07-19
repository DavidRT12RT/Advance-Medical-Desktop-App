import React, { useEffect, useState } from "react";
import { Skeleton, Tag, Modal } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import FirebaseEstudios from "../../features/FirebaseEstudios";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useElectronStore } from "../../hooks/useElectronStore";

const RegistrosMedicosPacienteDetalle: React.FC = () => {
  const { id: pacienteId } = useParams<{ id: string }>();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;

  const [loading, setLoading] = useState(true);
  const [estudios, setEstudios] = useState<any[]>([]);
  const [selectedEstudio, setSelectedEstudio] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchEstudios = async () => {
      if (!pacienteId) {
        setLoading(false);
        return;
      }
      try {
        const data = await FirebaseEstudios.obtenerEstudiosDePaciente(
          empresaId,
          pacienteId
        );
        setEstudios((data as any[]) || []);
      } catch (error) {
        console.error("Error obteniendo registros médicos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstudios();
  }, [empresaId, pacienteId]);

  if (loading) {
    return (
      <section className="space-y-6">
        <Skeleton active paragraph={{ rows: 0 }} style={{ width: 260 }} />
        {[1, 2].map((item) => (
          <div key={item} className="space-y-4">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
                <div className="flex flex-col gap-2">
                  <Skeleton.Input active style={{ width: 160, height: 16 }} />
                  <Skeleton.Input active style={{ width: 120, height: 20 }} />
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <Skeleton.Input active style={{ width: 120, height: 16 }} />
                  <Skeleton.Input active style={{ width: 80, height: 20 }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {[1, 2, 3].map((col) => (
                  <div key={col} className="flex flex-col gap-2">
                    <Skeleton.Input
                      active
                      style={{ width: "70%", height: 14 }}
                    />
                    <Skeleton.Input
                      active
                      style={{ width: "100%", height: 18 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>
    );
  }

  if (!estudios || estudios.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
          Registros médicos
        </h2>
        <p className="text-sm text-gray-500">
          Aún no hay estudios registrados para este paciente.
        </p>
      </section>
    );
  }

  const totalEstudios = estudios.length;
  const estudiosConIA = estudios.filter((c) => {
    const secciones = Array.isArray(c.secciones_ai) ? c.secciones_ai : [];
    const tieneIASecciones = secciones.length > 0;
    const tieneIaLegacy = !!c.ia_cnn || !!c.ia_llm;
    return tieneIASecciones || tieneIaLegacy;
  }).length;

  const estudiosOrdenados = [...estudios].sort((a, b) => {
    const fechaA = a.fecha || a.fechaRegistro || "";
    const fechaB = b.fecha || b.fechaRegistro || "";
    return fechaA.localeCompare(fechaB);
  });

  const chartData = estudiosOrdenados.map((estudio: any) => {
    const fechaBase = estudio.fecha || estudio.fechaRegistro || null;
    const fechaLabel = fechaBase ? dayjs(fechaBase).format("DD/MM/YY") : "-";

    return {
      id: estudio.id,
      fechaLabel,
      indiceRiesgo: estudio.indiceRiesgo ?? 0,
      rawEstudio: estudio,
    };
  });

  const renderTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0].payload;
    const estudio = data.rawEstudio as any;

    const secciones = Array.isArray(estudio.secciones_ai)
      ? estudio.secciones_ai
      : [];
    const lastSession = secciones.length
      ? secciones[secciones.length - 1]
      : null;
    const cnnSummary = lastSession?.ia_cnn?.summary;
    const llm = lastSession?.ia_llm || estudio.ia_llm;

    const fechaBase = estudio.fecha || estudio.fechaRegistro || null;
    const fechaLabel = fechaBase
      ? dayjs(fechaBase).format("DD/MM/YYYY HH:mm")
      : "-";

    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm px-3 py-2 text-xs text-gray-700 max-w-xs">
        <p className="font-semibold text-gray-900 mb-1">
          {fechaLabel} · {estudio.tipo || "Sin tipo"}
        </p>
        <p className="mb-1">
          <span className="text-gray-500">Resultado: </span>
          <span className="font-semibold">
            {estudio.resultado || "Sin resultado"}
          </span>
        </p>
        <p className="mb-1">
          <span className="text-gray-500">Pólipo / lesión: </span>
          <span className="font-semibold">{estudio.polipo || "-"}</span>
        </p>
        {cnnSummary && (
          <p className="mb-1">
            <span className="text-gray-500">CNN · pólipos: </span>
            <span className="font-semibold">
              {cnnSummary.lastPolypCount ?? 0}
            </span>
            {" · "}
            <span className="text-gray-500">segmentos: </span>
            <span className="font-semibold">
              {cnnSummary.totalSegments ??
                ((lastSession?.ia_cnn?.segments || []).length || 0)}
            </span>
          </p>
        )}
        {llm && (
          <p className="mb-1">
            <span className="text-gray-500">LLM: </span>
            <span className="font-semibold">
              {llm.has_polyp ? "Pólipo detectado" : "Sin pólipos"}
            </span>
            {llm.severity && ` · ${llm.severity}`}
            {llm.confidence_level && ` · Conf: ${llm.confidence_level}`}
          </p>
        )}
        <p className="mt-1 text-[12px] text-gray-400">
          Índice de riesgo: {estudio.indiceRiesgo ?? 0}/100
        </p>
      </div>
    );
  };

  const estudiosConPoliposIA = estudios.filter((c: any) => {
    const secciones = Array.isArray(c.secciones_ai) ? c.secciones_ai : [];
    if (secciones.length > 0) {
      const last = secciones[secciones.length - 1];
      const cnnSummary = last?.ia_cnn?.summary;
      const llm = last?.ia_llm;
      if (cnnSummary?.lastPolypCount && cnnSummary.lastPolypCount > 0) {
        return true;
      }
      if (llm?.has_polyp) {
        return true;
      }
      return false;
    }
    const iaLlm = c.ia_llm;
    if (iaLlm && iaLlm.has_polyp) return true;
    return false;
  }).length;

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
          Registros médicos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:w-auto">
          <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
            <p className="text-xs text-gray-500">Total de estudios</p>
            <p className="text-xl font-semibold text-gray-900">
              {totalEstudios}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
            <p className="text-xs text-gray-500">Estudios con IA</p>
            <p className="text-xl font-semibold text-gray-900">
              {estudiosConIA}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
            <p className="text-xs text-gray-500">Pólipo detectado por IA</p>
            <p className="text-xl font-semibold text-gray-900">
              {estudiosConPoliposIA}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-lg p-4 shadow-sm">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">
          Evolución del índice de riesgo (0-100)
        </p>
        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="fechaLabel"
                tick={{ fontSize: 12 }}
                interval={0}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip content={renderTooltip} />
              <Line
                type="monotone"
                dataKey="indiceRiesgo"
                stroke="#4f46e5"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                onClick={(data: any) => {
                  const estudio = data?.payload?.rawEstudio;
                  if (!estudio) return;
                  setSelectedEstudio(estudio);
                  setIsModalOpen(true);
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="space-y-4">
        {estudiosOrdenados.map((estudio: any) => {
          const secciones = Array.isArray(estudio.secciones_ai)
            ? estudio.secciones_ai
            : [];
          const lastSession = secciones.length
            ? secciones[secciones.length - 1]
            : null;
          const cnnSummary = lastSession?.ia_cnn?.summary;
          const llm = lastSession?.ia_llm || estudio.ia_llm;

          const fechaLabel = estudio.fecha
            ? dayjs(estudio.fecha).format("DD/MM/YYYY")
            : estudio.fechaRegistro
            ? dayjs(estudio.fechaRegistro).format("DD/MM/YYYY HH:mm")
            : "-";

          const estado = estudio.estado || "-";

          let iaBadgeText = "Sin datos de IA";
          let iaBadgeColor: "default" | "success" | "error" | "warning" =
            "default";

          if (llm) {
            if (llm.has_polyp) {
              iaBadgeText = "Pólipo detectado";
              iaBadgeColor = "error";
            } else {
              iaBadgeText = "Sin pólipos por IA";
              iaBadgeColor = "success";
            }
          } else if (cnnSummary) {
            if (cnnSummary.lastPolypCount && cnnSummary.lastPolypCount > 0) {
              iaBadgeText = "Pólipos detectados (CNN)";
              iaBadgeColor = "error";
            } else {
              iaBadgeText = "Sin pólipos (CNN)";
              iaBadgeColor = "success";
            }
          }

          return (
            <div
              key={estudio.id}
              className="bg-gray-50 p-5 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setSelectedEstudio(estudio);
                setIsModalOpen(true);
              }}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4 border-b border-gray-200 pb-3">
                <div>
                  <p className="text-xs text-gray-500 font-medium">
                    Fecha de estudio
                  </p>
                  <p className="text-lg font-semibold text-gray-900">
                    {fechaLabel}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {estudio.tipo || "Tipo no especificado"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Estado</span>
                    <Tag
                      color={
                        estado === "finalizado"
                          ? "green"
                          : estado === "en_progreso"
                          ? "blue"
                          : estado === "pendiente"
                          ? "orange"
                          : "default"
                      }
                    >
                      {estado[0]?.toUpperCase()}
                      {estado.slice(1)}
                    </Tag>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Resultado</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {estudio.resultado || "Sin resultado"}
                    </span>
                  </div>
                  <Tag color={iaBadgeColor} className="mt-1">
                    {iaBadgeText}
                  </Tag>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-700">
                <div>
                  <p className="text-gray-500">Pólipo / lesión</p>
                  <p className="font-semibold">{estudio.polipo || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-500">Tamaño</p>
                  <p className="font-semibold">
                    {estudio.tamano || estudio.tamaño || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Ubicación</p>
                  <p className="font-semibold">{estudio.ubicacion || "-"}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedEstudio && (
        <Modal
          open={isModalOpen}
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          width={780}
          centered
          title={
            <div className="flex flex-col gap-1">
              <span className="text-sm font-semibold text-gray-800">
                Resumen de estudio
              </span>
              <span className="text-xs text-gray-500">
                {selectedEstudio.fecha
                  ? dayjs(selectedEstudio.fecha).format("DD/MM/YYYY HH:mm")
                  : selectedEstudio.fechaRegistro
                  ? dayjs(selectedEstudio.fechaRegistro).format(
                      "DD/MM/YYYY HH:mm"
                    )
                  : "Sin fecha"}
              </span>
            </div>
          }
        >
          {(() => {
            const estudioModal = selectedEstudio as any;
            const secciones = Array.isArray(estudioModal.secciones_ai)
              ? estudioModal.secciones_ai
              : [];
            const lastSession = secciones.length
              ? secciones[secciones.length - 1]
              : null;
            const cnnSummary = lastSession?.ia_cnn?.summary;
            const llm = lastSession?.ia_llm || estudioModal.ia_llm;

            return (
              <div className="space-y-4 text-sm text-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Información general
                    </p>
                    <p>
                      <span className="text-gray-500">Tipo: </span>
                      <span className="font-semibold">
                        {estudioModal.tipo || "Sin tipo"}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">Resultado: </span>
                      <span className="font-semibold">
                        {estudioModal.resultado || "Sin resultado"}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">Pólipo / lesión: </span>
                      <span className="font-semibold">
                        {estudioModal.polipo || "-"}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">Tamaño: </span>
                      <span className="font-semibold">
                        {estudioModal.tamano || estudioModal.tamaño || "-"} mm
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-500">Ubicación: </span>
                      <span className="font-semibold">
                        {estudioModal.ubicacion || "-"}
                      </span>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Detalle IA
                    </p>
                    {cnnSummary ? (
                      <p className="mb-1">
                        <span className="text-gray-500">CNN · pólipos: </span>
                        <span className="font-semibold">
                          {cnnSummary.lastPolypCount ?? 0}
                        </span>
                        {" · "}
                        <span className="text-gray-500">segmentos: </span>
                        <span className="font-semibold">
                          {cnnSummary.totalSegments ??
                            ((lastSession?.ia_cnn?.segments || []).length || 0)}
                        </span>
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 mb-1">
                        Sin resumen CNN registrado.
                      </p>
                    )}
                    {llm ? (
                      <div className="space-y-1">
                        <p>
                          <span className="text-gray-500">LLM: </span>
                          <span className="font-semibold">
                            {llm.has_polyp ? "Pólipo detectado" : "Sin pólipos"}
                          </span>
                          {llm.severity && ` · ${llm.severity}`}
                          {llm.confidence_level &&
                            ` · Confianza: ${llm.confidence_level}`}
                        </p>
                        {llm.description && (
                          <p className="text-xs text-gray-600">
                            {llm.description}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Sin análisis LLM registrado.
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      Índice de riesgo: {estudioModal.indiceRiesgo ?? 0}/100
                    </p>
                  </div>
                </div>

                {estudioModal.hallazgos && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Hallazgos
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {estudioModal.hallazgos}
                    </p>
                  </div>
                )}

                {estudioModal.observaciones && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                      Observaciones del médico
                    </p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">
                      {estudioModal.observaciones}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </Modal>
      )}
    </section>
  );
};

export default RegistrosMedicosPacienteDetalle;
