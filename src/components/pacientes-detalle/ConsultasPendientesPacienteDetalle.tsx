import React, { useEffect, useState } from "react";
import { Skeleton } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import FirebaseConsultas from "../../features/FirebaseConsultas";

const ConsultasPendientesPacienteDetalle = () => {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  // TODO: Obtener empresaId del contexto de autenticación
  const empresaId = "GoFayqIW9MR718FzNpyzGUgaK283";

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
        {/* Titulo */}
        <Skeleton active paragraph={{ rows: 0 }} style={{ width: 300 }} />

        {[1, 2].map((item) => (
          <div key={item} className="space-y-4">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
                <div className="flex flex-col gap-2">
                  <Skeleton.Input active style={{ width: 150, height: 14 }} />
                  <Skeleton.Input active style={{ width: 120, height: 20 }} />
                </div>
                <div className="text-right flex flex-col gap-2 items-end">
                  <Skeleton.Input active style={{ width: 150, height: 14 }} />
                  <Skeleton.Input active style={{ width: 100, height: 20 }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-6">
                {[1, 2, 3, 4].map((col) => (
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

  if (!consultas || consultas.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
          Próximos tratamientos
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
        Próximos tratamientos
      </h2>

      {consultas.map((consulta: any) => (
        <div
          key={consulta.id}
          className="space-y-4 cursor-pointer"
          onClick={() => {
            if (!pacienteId || !consulta.id) return;
            navigate(
              `/paciente-detalle/${pacienteId}/consultas/${consulta.id}`
            );
          }}
        >
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            {/* Header con fecha y tipo */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Fecha de Procedimiento
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {consulta.fecha || "-"}
                </p>
                <p className="text-xs text-gray-600 mt-1">{consulta.tipo}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium">Estado</p>
                <p className="text-lg font-semibold text-orange-600">
                  {consulta.estado || "Pendiente"}
                </p>
              </div>
            </div>

            {/* Info básica */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">
                  Observaciones Iniciales
                </p>
                <p className="text-sm text-gray-700">
                  {consulta.observaciones || "Sin observaciones registradas."}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">
                  Fecha de Registro
                </p>
                <p className="text-sm text-gray-700">
                  {consulta.fechaRegistro
                    ? new Date(consulta.fechaRegistro).toLocaleString()
                    : "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

export default ConsultasPendientesPacienteDetalle;
