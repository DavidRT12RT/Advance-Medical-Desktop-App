import React, { useEffect, useState } from "react";
import { Skeleton, Tag } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import FirebaseConsultas from "../../features/FirebaseConsultas";
import { useElectronStore } from "../../hooks/useElectronStore";

const ConsultasPendientesPacienteDetalle = () => {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;

  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<any[]>([]);

  useEffect(() => {
    const fetchConsultas = async () => {
      if (!pacienteId) {
        setLoading(false);
        return;
      }
      try {
        const data = await FirebaseConsultas.obtenerConsultasPorEstado(
          empresaId,
          pacienteId,
          "pendiente"
        );
        setConsultas(data as any[]);
      } catch (error) {
        console.error("Error obteniendo consultas pendientes:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultas();
  }, [empresaId, pacienteId]);

  if (loading) {
    return (
      <section className="space-y-6">
        <Skeleton active paragraph={{ rows: 0 }} style={{ width: 300 }} />
        {[1, 2].map((item) => (
          <div
            key={item}
            className="bg-gray-50 p-5 rounded-lg border border-gray-200"
          >
            <div className="flex justify-between items-start mb-4">
              <Skeleton.Input active style={{ width: 120, height: 20 }} />
              <Skeleton.Input active style={{ width: 80, height: 24 }} />
            </div>
            <Skeleton active paragraph={{ rows: 2 }} />
          </div>
        ))}
      </section>
    );
  }

  if (!consultas || consultas.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
          Consultas Pendientes
        </h2>
        <p className="text-sm text-gray-500">
          No hay consultas pendientes para este paciente.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
        Consultas Pendientes
      </h2>

      <div className="space-y-4">
        {consultas.map((consulta: any) => (
          <div
            key={consulta.id}
            className="bg-gray-50 p-5 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              if (!pacienteId || !consulta.id) return;
              navigate(
                `/paciente-detalle/${pacienteId}/consultas/${consulta.id}`
              );
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-xs text-gray-500 font-medium">Fecha</p>
                <p className="text-lg font-semibold text-gray-900">
                  {consulta.fecha
                    ? dayjs(consulta.fecha).format("DD/MM/YYYY")
                    : "-"}
                </p>
              </div>
              <Tag color="orange">Pendiente</Tag>
            </div>

            {consulta.motivo_consulta && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 font-medium mb-1">
                  Motivo de consulta
                </p>
                <p className="text-sm text-gray-700">
                  {consulta.motivo_consulta}
                </p>
              </div>
            )}

            {consulta.notas && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded">
                <p className="text-xs text-gray-500 font-medium mb-1">
                  Notas iniciales
                </p>
                <p className="text-sm text-gray-700 line-clamp-2">
                  {consulta.notas}
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">
              Registrada:{" "}
              {consulta.fechaRegistro
                ? dayjs(consulta.fechaRegistro).format("DD/MM/YYYY HH:mm")
                : "-"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default ConsultasPendientesPacienteDetalle;
