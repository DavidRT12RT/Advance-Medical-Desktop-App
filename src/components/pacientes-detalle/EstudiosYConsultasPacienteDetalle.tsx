import { useEffect, useState } from "react";
import { Badge, Empty, Skeleton, Tag } from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import dayjs from "dayjs";
import FirebaseEstudios from "../../features/FirebaseEstudios";
import FirebaseConsultas from "../../features/FirebaseConsultas";
import { useElectronStore } from "../../hooks/useElectronStore";
import { colorPorTipo } from "../../utils/tiposEstudio";

interface Registro {
  kind: "estudio" | "consulta";
  id: string;
  tipo?: string;
  fecha?: string;
  estado?: string;
  resumen?: string;
}

const ESTADOS_PROGRAMADOS = ["pendiente", "en_progreso", "en_edicion"];

const estadoBadge = (estado?: string) => {
  if (!estado) return <Badge status="default" text="Sin estado" />;
  if (estado === "pendiente") return <Badge status="warning" text="Pendiente" />;
  if (estado === "en_progreso")
    return <Badge status="processing" text="En progreso" />;
  if (estado === "en_edicion")
    return <Badge status="processing" text="En edición" />;
  return (
    <Badge
      status="success"
      text={estado[0].toUpperCase() + estado.slice(1)}
    />
  );
};

/**
 * Vista consolidada del paciente: todos sus estudios y consultas, separados
 * en programados/pendientes y previos. Es la pestaña por defecto del detalle
 * — al seleccionar (o crear) un paciente, esto es lo primero que se ve.
 */
const EstudiosYConsultasPacienteDetalle = () => {
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;
  // Recargar cuando se crea una consulta/estudio desde los modales del detalle
  const refresh = useSelector((state: any) => state.pacientes.refresh);

  const [loading, setLoading] = useState(true);
  const [registros, setRegistros] = useState<Registro[]>([]);

  useEffect(() => {
    const fetchRegistros = async () => {
      if (!pacienteId || !empresaId) {
        setLoading(false);
        return;
      }
      try {
        const [estudios, consultas] = await Promise.all([
          FirebaseEstudios.obtenerEstudiosDePaciente(empresaId, pacienteId),
          FirebaseConsultas.obtenerConsultasDePaciente(empresaId, pacienteId),
        ]);

        const items: Registro[] = [
          ...(estudios || []).map((e: any) => ({
            kind: "estudio" as const,
            id: e.id,
            tipo: e.tipo,
            fecha: e.fecha,
            estado: e.estado,
            resumen: e.motivo_estudio || e.observaciones || "",
          })),
          ...(consultas || []).map((c: any) => ({
            kind: "consulta" as const,
            id: c.id,
            tipo: c.tipo,
            fecha: c.fecha,
            estado: c.estado,
            resumen: c.motivo_consulta || c.observaciones || "",
          })),
        ];

        setRegistros(items);
      } catch (error) {
        console.error("Error obteniendo estudios y consultas:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRegistros();
  }, [empresaId, pacienteId, refresh]);

  if (loading) {
    return <Skeleton active paragraph={{ rows: 6 }} />;
  }

  const programados = registros
    .filter((r) => ESTADOS_PROGRAMADOS.includes(r.estado || ""))
    .sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  const previos = registros
    .filter((r) => !ESTADOS_PROGRAMADOS.includes(r.estado || ""))
    .sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));

  const irADetalle = (registro: Registro) => {
    if (!pacienteId || !registro.id) return;
    navigate(
      registro.kind === "estudio"
        ? `/paciente-detalle/${pacienteId}/estudios/${registro.id}`
        : `/paciente-detalle/${pacienteId}/consultas/${registro.id}`,
    );
  };

  const renderLista = (items: Registro[]) => (
    <div className="space-y-3">
      {items.map((registro) => (
        <div
          key={`${registro.kind}-${registro.id}`}
          className="bg-gray-50 px-5 py-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between gap-4"
          onClick={() => irADetalle(registro)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <Tag color={registro.kind === "estudio" ? "geekblue" : "cyan"}>
              {registro.kind === "estudio" ? "Estudio" : "Consulta"}
            </Tag>
            <Tag color={colorPorTipo(registro.tipo)}>
              {registro.tipo || "Sin tipo"}
            </Tag>
            <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
              {registro.fecha
                ? dayjs(registro.fecha).format("DD/MM/YYYY")
                : "Sin fecha"}
            </span>
            {registro.resumen && (
              <span className="text-sm text-gray-500 truncate">
                {registro.resumen}
              </span>
            )}
          </div>
          <div className="shrink-0">{estadoBadge(registro.estado)}</div>
        </div>
      ))}
    </div>
  );

  if (registros.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
          Estudios y Consultas
        </h2>
        <Empty
          description={
            <span>
              Este paciente aún no tiene estudios ni consultas registrados.
              <br />
              Usa los botones <strong>Nueva consulta</strong> o{" "}
              <strong>Nuevo estudio</strong> de arriba para registrar el
              primero. Se pueden registrar varios estudios distintos en un
              mismo día.
            </span>
          }
        />
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
          Programados y pendientes
        </h2>
        {programados.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay estudios ni consultas pendientes.
          </p>
        ) : (
          renderLista(programados)
        )}
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800 border-l-4 border-indigo-600 pl-3">
          Previos
        </h2>
        {previos.length === 0 ? (
          <p className="text-sm text-gray-500">
            No hay estudios ni consultas finalizados.
          </p>
        ) : (
          renderLista(previos)
        )}
      </div>
    </section>
  );
};

export default EstudiosYConsultasPacienteDetalle;
