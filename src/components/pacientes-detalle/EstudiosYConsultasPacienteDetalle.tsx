import { useEffect, useState } from "react";
import { Empty, Skeleton, Tag } from "antd";
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
  data: any;
}

const ESTADOS_PROGRAMADOS = ["pendiente", "en_progreso", "en_edicion"];

const esProgramado = (registro: Registro) =>
  ESTADOS_PROGRAMADOS.includes(registro.data?.estado || "");

const etiquetaEstado = (estado?: string) => {
  if (estado === "pendiente") return <Tag color="orange">Pendiente</Tag>;
  if (estado === "en_progreso") return <Tag color="blue">En progreso</Tag>;
  if (estado === "en_edicion") return <Tag color="blue">En edición</Tag>;
  if (estado === "finalizado" || estado === "finalizada")
    return <Tag color="green">Finalizado</Tag>;
  if (estado === "completada") return <Tag color="green">Completada</Tag>;
  return <Tag>{estado || "Sin estado"}</Tag>;
};

/**
 * Vista consolidada del paciente: todos sus estudios y consultas, separados
 * en programados/pendientes y previos, con las tarjetas completas de cada
 * tipo de registro. Es la pestaña inicial del detalle — al seleccionar (o
 * crear) un paciente, esto es lo primero que se ve.
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

        setRegistros([
          ...(estudios || []).map((e: any) => ({
            kind: "estudio" as const,
            id: e.id,
            data: e,
          })),
          ...(consultas || []).map((c: any) => ({
            kind: "consulta" as const,
            id: c.id,
            data: c,
          })),
        ]);
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

  const programados = [...registros]
    .filter(esProgramado)
    .sort((a, b) => (a.data.fecha || "").localeCompare(b.data.fecha || ""));
  const previos = [...registros]
    .filter((r) => !esProgramado(r))
    .sort((a, b) => (b.data.fecha || "").localeCompare(a.data.fecha || ""));

  const irADetalle = (registro: Registro) => {
    if (!pacienteId || !registro.id) return;
    navigate(
      registro.kind === "estudio"
        ? `/paciente-detalle/${pacienteId}/estudios/${registro.id}`
        : `/paciente-detalle/${pacienteId}/consultas/${registro.id}`,
    );
  };

  const encabezadoTags = (registro: Registro) => (
    <div className="flex items-center gap-1 mb-3">
      <Tag color={registro.kind === "estudio" ? "geekblue" : "cyan"}>
        {registro.kind === "estudio" ? "Estudio" : "Consulta"}
      </Tag>
      <Tag color={colorPorTipo(registro.data.tipo)}>
        {registro.data.tipo || "Sin tipo"}
      </Tag>
    </div>
  );

  // Tarjeta de estudio programado/pendiente (estilo "Próximos Estudios")
  const cardEstudioProgramado = (registro: Registro) => {
    const estudio = registro.data;
    return (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
        {encabezadoTags(registro)}
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Fecha de Procedimiento
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {estudio.fecha || "-"}
            </p>
            {estudio.motivo_estudio && (
              <p className="text-xs text-gray-600 mt-1">
                Motivo: {estudio.motivo_estudio}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 font-medium">Estado</p>
            {etiquetaEstado(estudio.estado)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">
              Observaciones Iniciales
            </p>
            <p className="text-sm text-gray-700">
              {estudio.observaciones || "Sin observaciones registradas."}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">
              Fecha de Registro
            </p>
            <p className="text-sm text-gray-700">
              {estudio.fechaRegistro
                ? new Date(estudio.fechaRegistro).toLocaleString()
                : "-"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Tarjeta de estudio previo/finalizado (estilo "Historial de Estudios")
  const cardEstudioPrevio = (registro: Registro) => {
    const estudio = registro.data;
    return (
      <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
        {encabezadoTags(registro)}
        <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-200">
          <div>
            <p className="text-sm text-gray-500 font-medium">
              Fecha de Estudio
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {estudio.fecha || "-"}
            </p>
            {estudio.motivo_estudio && (
              <p className="text-xs text-gray-600 mt-1">
                Motivo: {estudio.motivo_estudio}
              </p>
            )}
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
              <span className="font-semibold">{estudio.tolerancia || "-"}</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-4 rounded mb-6 border border-gray-200">
          <p className="text-sm text-gray-500 font-medium mb-2">
            Hallazgos Generales
          </p>
          <p className="text-sm text-gray-700">
            {estudio.hallazgos || "Sin hallazgos registrados."}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="space-y-1">
            <p className="text-sm text-gray-500 font-medium">Tipo de Pólipo</p>
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
            <p className="text-sm text-gray-500 font-medium">Clasificación</p>
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

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
          <p className="text-sm text-gray-500 font-medium mb-2">
            Observaciones del Médico
          </p>
          <p className="text-sm text-gray-700">
            {estudio.observaciones || "Sin observaciones registradas."}
          </p>
        </div>
      </div>
    );
  };

  // Tarjeta de consulta (estilo pestañas de consultas, pendiente o finalizada)
  const cardConsulta = (registro: Registro) => {
    const consulta = registro.data;
    const pendiente = esProgramado(registro);
    return (
      <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
        {encabezadoTags(registro)}
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-gray-500 font-medium">Fecha</p>
            <p className="text-lg font-semibold text-gray-900">
              {consulta.fecha
                ? dayjs(consulta.fecha).format("DD/MM/YYYY")
                : "-"}
            </p>
          </div>
          {etiquetaEstado(consulta.estado)}
        </div>

        {consulta.motivo_consulta && (
          <div className="mb-3">
            <p className="text-xs text-gray-500 font-medium mb-1">
              Motivo de consulta
            </p>
            <p className="text-sm text-gray-700">{consulta.motivo_consulta}</p>
          </div>
        )}

        {consulta.hallazgos_generales && (
          <div className="bg-white p-3 rounded border border-gray-200 mb-3">
            <p className="text-xs text-gray-500 font-medium mb-1">
              Hallazgos generales
            </p>
            <p className="text-sm text-gray-700 line-clamp-2">
              {consulta.hallazgos_generales}
            </p>
          </div>
        )}

        {consulta.notas && (
          <div
            className={
              pendiente
                ? "bg-yellow-50 border-l-4 border-yellow-500 p-3 rounded"
                : "bg-blue-50 border-l-4 border-blue-600 p-3 rounded"
            }
          >
            <p className="text-xs text-gray-500 font-medium mb-1">Notas</p>
            <p className="text-sm text-gray-700 line-clamp-2">
              {consulta.notas}
            </p>
          </div>
        )}

        {pendiente && (
          <p className="text-xs text-gray-400 mt-3">
            Registrada:{" "}
            {consulta.fechaRegistro
              ? dayjs(consulta.fechaRegistro).format("DD/MM/YYYY HH:mm")
              : "-"}
          </p>
        )}
      </div>
    );
  };

  const renderLista = (items: Registro[]) => (
    <div className="space-y-4">
      {items.map((registro) => (
        <div
          key={`${registro.kind}-${registro.id}`}
          className="cursor-pointer"
          onClick={() => irADetalle(registro)}
        >
          {registro.kind === "consulta"
            ? cardConsulta(registro)
            : esProgramado(registro)
              ? cardEstudioProgramado(registro)
              : cardEstudioPrevio(registro)}
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
