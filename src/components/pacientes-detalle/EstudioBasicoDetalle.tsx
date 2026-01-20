import React from "react";
import { Skeleton } from "antd";

interface EstudioBasicoDetalleProps {
  loading: boolean;
  estudio?: {
    tipo: string;
    fecha: string | null;
    observaciones: string;
    estado?: string;
  } | null;
}

const EstudioBasicoDetalle: React.FC<EstudioBasicoDetalleProps> = ({
  loading,
  estudio,
}) => {
  if (loading) {
    return (
      <section className="space-y-6">
        {/* Titulo */}
        <Skeleton active paragraph={{ rows: 0 }} style={{ width: 250 }} />

        {/* Card skeleton */}
        <div className="space-y-4">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            {/* Header skeleton */}
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

            {/* Grid skeleton */}
            <div className="grid grid-cols-3 gap-6 mb-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex flex-col gap-2">
                  <Skeleton.Input active style={{ width: "70%", height: 14 }} />
                  <Skeleton.Input
                    active
                    style={{ width: "100%", height: 18 }}
                  />
                </div>
              ))}
            </div>

            {/* Observaciones skeleton */}
            <Skeleton.Input active style={{ width: "100%", height: 60 }} />
          </div>
        </div>
      </section>
    );
  }

  if (!estudio) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
          Detalle de Estudio
        </h2>
        <p className="text-sm text-gray-500">
          No se encontraron datos del estudio.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
        Detalle de Estudio
      </h2>

      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
        {/* Header con fecha, tipo y estado */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Fecha de Procedimiento
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {estudio.fecha || "-"}
            </p>
            <p className="text-xs text-gray-600 mt-1">{estudio.tipo}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 font-medium">Estado</p>
            <p className="text-lg font-semibold text-blue-600">
              {estudio.estado || "En progreso"}
            </p>
          </div>
        </div>

        {/* Grid de información básica */}
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">
              Tipo de Procedimiento
            </p>
            <p className="text-base font-semibold text-gray-900">
              {estudio.tipo}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">
              Fecha de Registro
            </p>
            <p className="text-base font-semibold text-gray-900">
              {estudio.fecha || "-"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">Estado</p>
            <p className="text-base font-semibold text-gray-900">
              {estudio.estado || "En progreso"}
            </p>
          </div>
        </div>

        {/* Observaciones */}
        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
          <p className="text-sm text-gray-500 font-medium mb-2">
            Observaciones Iniciales
          </p>
          <p className="text-sm text-gray-700">
            {estudio.observaciones || "Sin observaciones registradas."}
          </p>
        </div>
      </div>
    </section>
  );
};

export default EstudioBasicoDetalle;
