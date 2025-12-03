import React, { useState, useEffect } from "react";
import { Skeleton } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import FirebaseConsultas from "../../features/FirebaseConsultas";

const ConsultasPacienteDetalle = () => {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
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
          "finalizada"
        );
        setConsultas(data as any[]);
      } catch (error) {
        console.error("Error obteniendo historial de consultas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsultas();
  }, [empresaId, pacienteId]);

  if (loading) {
    return (
      <section className="space-y-6">
        {/* Título */}
        <Skeleton active paragraph={{ rows: 0 }} style={{ width: 250 }} />

        {/* Consultas skeleton - Loop */}
        {[1, 2].map((consulta) => (
          <div key={consulta} className="space-y-4">
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
              {/* Header con fecha y resultado */}
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

              {/* Grid de información */}
              <div className="grid grid-cols-3 gap-6 mb-6">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div key={item} className="flex flex-col gap-2">
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
          Historial de Consultas
        </h2>
        <p className="text-sm text-gray-500">
          Aún no hay consultas finalizadas registradas para este paciente.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
        Historial de Consultas
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
            {/* Header con fecha, tipo y resultado */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Fecha de Consulta
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {consulta.fecha}
                </p>
                <p className="text-xs text-gray-600 mt-1">{consulta.tipo}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium">
                  Resultado General
                </p>
                <p
                  className={`text-lg font-semibold ${
                    (consulta.resultado || "").toLowerCase() === "normal"
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                >
                  {consulta.resultado || "Sin resultado"}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Tolerancia:{" "}
                  <span className="font-semibold">
                    {consulta.tolerancia || "-"}
                  </span>
                </p>
              </div>
            </div>

            {/* Hallazgos Generales */}
            <div className="bg-white p-4 rounded mb-6 border border-gray-200">
              <p className="text-sm text-gray-500 font-medium mb-2">
                Hallazgos Generales
              </p>
              <p className="text-sm text-gray-700">
                {consulta.hallazgos || "Sin hallazgos registrados."}
              </p>
            </div>

            {/* Grid de información - Pólipos */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">
                  Tipo de Pólipo
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {consulta.polipo || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">Tamaño</p>
                <p className="text-base font-semibold text-gray-900">
                  {consulta.tamano || consulta.tamaño || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">Ubicación</p>
                <p className="text-base font-semibold text-gray-900">
                  {consulta.ubicacion || "-"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">
                  Clasificación
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {consulta.clasificacion || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">
                  Acción Realizada
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {consulta.accion || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">Biopsia</p>
                <p className="text-base font-semibold text-gray-900">
                  {consulta.biopsia || "-"}
                </p>
              </div>
            </div>

            {/* Información Médica */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-500 font-medium mb-2">
                  Medicamentos Utilizados
                </p>
                <p className="text-sm text-gray-700">
                  {consulta.medicamentos || "Sin medicamentos registrados."}
                </p>
              </div>
              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-500 font-medium mb-2">
                  Complicaciones
                </p>
                <p className="text-sm text-gray-700">
                  {consulta.complicaciones || "Sin complicaciones registradas."}
                </p>
              </div>
            </div>

            {/* Seguimiento */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">
                  Próximo Seguimiento
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {consulta.seguimiento || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">
                  Intervalo de Seguimiento
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {consulta.intervaloSeguimiento || "-"}
                </p>
              </div>
            </div>

            {/* Observaciones */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <p className="text-sm text-gray-500 font-medium mb-2">
                Observaciones del Médico
              </p>
              <p className="text-sm text-gray-700">
                {consulta.observaciones || "Sin observaciones registradas."}
              </p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

export default ConsultasPacienteDetalle;
