import React, { useState, useEffect } from "react";
import { Skeleton } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import FirebaseEstudios from "../../features/FirebaseEstudios";
import { useElectronStore } from "../../hooks/useElectronStore";

const EstudiosPacienteDetalle = () => {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;

  const [loading, setLoading] = useState(true);
  const [estudios, setEstudios] = useState<any[]>([]);

  useEffect(() => {
    const fetchEstudios = async () => {
      if (!pacienteId) {
        setLoading(false);
        return;
      }
      try {
        const data = await FirebaseEstudios.obtenerEstudiosPorEstado(
          empresaId,
          pacienteId,
          "finalizado"
        );
        setEstudios(data as any[]);
      } catch (error) {
        console.error("Error obteniendo historial de estudios:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstudios();
  }, [empresaId, pacienteId]);

  if (loading) {
    return (
      <section className="space-y-6">
        {/* Título */}
        <Skeleton active paragraph={{ rows: 0 }} style={{ width: 250 }} />

        {/* Estudios skeleton - Loop */}
        {[1, 2].map((estudio) => (
          <div key={estudio} className="space-y-4">
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

  if (!estudios || estudios.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
          Historial de Estudios
        </h2>
        <p className="text-sm text-gray-500">
          Aún no hay estudios finalizados registrados para este paciente.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
        Historial de Estudios
      </h2>

      {estudios.map((estudio: any) => (
        <div
          key={estudio.id}
          className="space-y-4 cursor-pointer"
          onClick={() => {
            if (!pacienteId || !estudio.id) return;
            navigate(`/paciente-detalle/${pacienteId}/estudios/${estudio.id}`);
          }}
        >
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            {/* Header con fecha, tipo y resultado */}
            <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
              <div>
                <p className="text-sm text-gray-500 font-medium">
                  Fecha de Estudio
                </p>
                <p className="text-lg font-semibold text-gray-900">
                  {estudio.fecha}
                </p>
                <p className="text-xs text-gray-600 mt-1">{estudio.tipo}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500 font-medium">
                  Resultado General
                </p>
                <p
                  className={`text-lg font-semibold ${
                    (estudio.resultado || "").toLowerCase() === "normal"
                      ? "text-green-600"
                      : "text-orange-600"
                  }`}
                >
                  {estudio.resultado || "Sin resultado"}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Tolerancia:{" "}
                  <span className="font-semibold">
                    {estudio.tolerancia || "-"}
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
                {estudio.hallazgos || "Sin hallazgos registrados."}
              </p>
            </div>

            {/* Grid de información - Pólipos */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">
                  Tipo de Pólipo
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {estudio.polipo || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">Tamaño</p>
                <p className="text-base font-semibold text-gray-900">
                  {estudio.tamano || estudio.tamaño || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">Ubicación</p>
                <p className="text-base font-semibold text-gray-900">
                  {estudio.ubicacion || "-"}
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">
                  Clasificación
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {estudio.clasificacion || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">
                  Acción Realizada
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {estudio.accion || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">Biopsia</p>
                <p className="text-base font-semibold text-gray-900">
                  {estudio.biopsia || "-"}
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
                  {estudio.medicamentos || "Sin medicamentos registrados."}
                </p>
              </div>
              <div className="bg-white p-4 rounded border border-gray-200">
                <p className="text-sm text-gray-500 font-medium mb-2">
                  Complicaciones
                </p>
                <p className="text-sm text-gray-700">
                  {estudio.complicaciones || "Sin complicaciones registradas."}
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
                  {estudio.seguimiento || "-"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500 font-medium">
                  Intervalo de Seguimiento
                </p>
                <p className="text-base font-semibold text-gray-900">
                  {estudio.intervaloSeguimiento || "-"}
                </p>
              </div>
            </div>

            {/* Observaciones */}
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <p className="text-sm text-gray-500 font-medium mb-2">
                Observaciones del Médico
              </p>
              <p className="text-sm text-gray-700">
                {estudio.observaciones || "Sin observaciones registradas."}
              </p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
};

export default EstudiosPacienteDetalle;
