import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Skeleton,
  Form,
  Input,
  Button,
  Select,
  DatePicker,
  Tag,
  Divider,
  Modal,
  Collapse,
  List,
  Empty,
  App,
} from "antd";
import {
  SaveOutlined,
  RobotOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  HomeOutlined,
  TeamOutlined,
  ToolOutlined,
  FilePdfOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import FirebaseEstudios from "../features/FirebaseEstudios";
import {
  REGIONES_ANATOMICAS,
  organoPorTipoEstudio,
} from "../utils/regionesAnatomicas";
import FirebasePacientes from "../features/FirebasePacientes";
import EstudioBasicoDetalle from "../components/pacientes-detalle/EstudioBasicoDetalle";
import SectionTitle from "../components/common/SectionTitle";
import ModalInfoSeccionAI from "../components/consulta-detalle/ModalInfoSeccionAI";
import ModalGenerarReporte from "../components/consulta-detalle/ModalGenerarReporte";
import HistorialEdicionesEstudio from "../components/pacientes-detalle/HistorialEdicionesEstudio";
import ModalHistorialCambios from "../components/pacientes-detalle/ModalHistorialCambios";
import { useElectronStore } from "../hooks/useElectronStore";

const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;

const EstudioDetalle: React.FC = () => {
  const { id: pacienteId, estudioId } = useParams<{
    id: string;
    estudioId: string;
  }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;

  const [loading, setLoading] = useState(true);
  const [estudio, setEstudio] = useState<any | null>(null);
  const [paciente, setPaciente] = useState<any | null>(null);
  const [otrosEstudios, setOtrosEstudios] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [finalizeOnSave, setFinalizeOnSave] = useState(false);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<
    number | null
  >(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState("");
  const [isHistorialModalOpen, setIsHistorialModalOpen] = useState(false);

  useEffect(() => {
    const fetchEstudio = async () => {
      if (!pacienteId || !estudioId) {
        setLoading(false);
        return;
      }

      try {
        const data: any = await FirebaseEstudios.obtenerEstudioPorId(
          empresaId,
          pacienteId,
          estudioId
        );

        if (!data) {
          setLoading(false);
          return;
        }

        setEstudio(data);

        if (data.paciente_id) {
          const pacienteData = await FirebasePacientes.obtenerPacientePorId(
            empresaId,
            data.paciente_id
          );
          setPaciente(pacienteData);

          // Obtener otros estudios del paciente
          const estudiosData = await FirebaseEstudios.obtenerEstudiosDePaciente(
            empresaId,
            data.paciente_id
          );
          // Filtrar el estudio actual
          setOtrosEstudios(
            (estudiosData || []).filter((e: any) => e.id !== estudioId)
          );
        }

        const fechaSeguimiento = data.seguimiento
          ? dayjs(data.seguimiento)
          : null;

        // Obtener configuración médica del usuario actual
        const configuracionMedica =
          user?.usuarioDetail?.configuraciones?.configuracionDatosMedicos;
        const nombreUsuario = user?.usuarioDetail?.nombre;

        // Auto-llenar datos del médico tratante con datos del usuario actual
        // Si el estudio ya tiene datos guardados, usarlos; si no, usar datos del usuario
        const medicoNombre = data.medico_nombre || nombreUsuario || "";
        const medicoCedula =
          data.medico_cedula || configuracionMedica?.cedula || "";
        const medicoEspecialidad =
          data.medico_especialidad || configuracionMedica?.especialidad || "";

        // Setear explícitamente todos los campos clínicos que usamos en el detalle
        form.setFieldsValue({
          resultado: data.resultado,
          hallazgos: data.hallazgos,
          polipo: data.polipo,
          tamano: data.tamano || data.tamaño,
          ubicacion: data.ubicacion,
          clasificacion: data.clasificacion,
          accion: data.accion,
          biopsia: data.biopsia,
          medicamentos: data.medicamentos,
          complicaciones: data.complicaciones,
          seguimiento: fechaSeguimiento,
          intervaloSeguimiento: data.intervaloSeguimiento,
          tolerancia: data.tolerancia,
          // Datos del anestesiólogo
          anestesiologo_nombre: data.anestesiologo_nombre,
          anestesiologo_cedula: data.anestesiologo_cedula,
          anestesiologo_especialidad: data.anestesiologo_especialidad,
          // Datos del consultorio/clínica
          clinica_nombre: data.clinica_nombre,
          clinica_numero: data.clinica_numero,
          clinica_direccion: data.clinica_direccion,
          clinica_telefono: data.clinica_telefono,
          // Datos del médico tratante (auto-llenados con datos del estudio o usuario actual)
          medico_nombre: medicoNombre,
          medico_cedula: medicoCedula,
          medico_especialidad: medicoEspecialidad,
          // Método de sedación
          metodo_sedacion: data.metodo_sedacion,
          sedacion_dosis: data.sedacion_dosis,
          sedacion_observaciones: data.sedacion_observaciones,
          // Equipo utilizado
          equipo_endoscopio: data.equipo_endoscopio,
          equipo_marca: data.equipo_marca,
          equipo_modelo: data.equipo_modelo,
          equipo_serie: data.equipo_serie,
          // Datos del asistente
          asistente_nombre: data.asistente_nombre,
          asistente_rol: data.asistente_rol,
        });
      } catch (error) {
        console.error("Error obteniendo detalle de estudio:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEstudio();
  }, [empresaId, pacienteId, estudioId, form]);

  // useEffect para recargar el formulario cuando cambia el estado del estudio (ej: al reabrir)
  useEffect(() => {
    if (!estudio) return;

    const fechaSeguimiento = estudio.seguimiento
      ? dayjs(estudio.seguimiento)
      : null;

    // Obtener configuración médica del usuario actual
    const configuracionMedica =
      user?.usuarioDetail?.configuraciones?.configuracionDatosMedicos;
    const nombreUsuario = user?.usuarioDetail?.nombre;

    // Auto-llenar datos del médico tratante
    const medicoNombre = estudio.medico_nombre || nombreUsuario || "";
    const medicoCedula =
      estudio.medico_cedula || configuracionMedica?.cedula || "";
    const medicoEspecialidad =
      estudio.medico_especialidad || configuracionMedica?.especialidad || "";

    // Actualizar formulario con los datos actuales del estudio
    form.setFieldsValue({
      resultado: estudio.resultado,
      hallazgos: estudio.hallazgos,
      polipo: estudio.polipo,
      tamano: estudio.tamano || estudio.tamaño,
      ubicacion: estudio.ubicacion,
      clasificacion: estudio.clasificacion,
      accion: estudio.accion,
      biopsia: estudio.biopsia,
      medicamentos: estudio.medicamentos,
      complicaciones: estudio.complicaciones,
      seguimiento: fechaSeguimiento,
      intervaloSeguimiento: estudio.intervaloSeguimiento,
      tolerancia: estudio.tolerancia,
      // Datos del anestesiólogo
      anestesiologo_nombre: estudio.anestesiologo_nombre,
      anestesiologo_cedula: estudio.anestesiologo_cedula,
      anestesiologo_especialidad: estudio.anestesiologo_especialidad,
      // Datos del consultorio/clínica
      clinica_nombre: estudio.clinica_nombre,
      clinica_numero: estudio.clinica_numero,
      clinica_direccion: estudio.clinica_direccion,
      clinica_telefono: estudio.clinica_telefono,
      // Datos del médico tratante
      medico_nombre: medicoNombre,
      medico_cedula: medicoCedula,
      medico_especialidad: medicoEspecialidad,
      // Método de sedación
      metodo_sedacion: estudio.metodo_sedacion,
      sedacion_dosis: estudio.sedacion_dosis,
      sedacion_observaciones: estudio.sedacion_observaciones,
      // Equipo utilizado
      equipo_endoscopio: estudio.equipo_endoscopio,
      equipo_marca: estudio.equipo_marca,
      equipo_modelo: estudio.equipo_modelo,
      equipo_serie: estudio.equipo_serie,
      // Datos del asistente
      asistente_nombre: estudio.asistente_nombre,
      asistente_rol: estudio.asistente_rol,
    });
  }, [estudio?.estado, estudio?.fecha_reapertura, form, user]);

  const handleReopenEstudio = async () => {
    if (!reopenReason.trim()) {
      message.warning("Por favor ingresa un motivo para reabrir el estudio");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        estado: "en_edicion",
        fecha_reapertura: new Date().toISOString(),
        motivo_reapertura: reopenReason,
      };

      await FirebaseEstudios.actualizarEstudio(
        empresaId,
        pacienteId || "",
        estudioId || "",
        payload
      );

      setEstudio((prev: any) => (prev ? { ...prev, ...payload } : prev));
      setIsReopenModalOpen(false);
      setReopenReason("");
      message.success("Estudio reabierto para edición");
    } catch (error) {
      console.error("Error reabriendo estudio:", error);
      message.error("Error al reabrir el estudio");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDetalle = async (values: any) => {
    if (!pacienteId || !estudioId) return;
    try {
      setSaving(true);

      // Aseguramos que todos los campos del formulario clínico se envíen de forma explícita
      const allValues = form.getFieldsValue(true);

      const seguimientoValue = allValues.seguimiento;

      const payload: any = {
        resultado: allValues.resultado ?? null,
        hallazgos: allValues.hallazgos ?? null,
        polipo: allValues.polipo ?? null,
        tamano: allValues.tamano ?? null,
        ubicacion: allValues.ubicacion ?? null,
        clasificacion: allValues.clasificacion ?? null,
        accion: allValues.accion ?? null,
        biopsia: allValues.biopsia ?? null,
        medicamentos: allValues.medicamentos ?? null,
        complicaciones: allValues.complicaciones ?? null,
        seguimiento: seguimientoValue
          ? seguimientoValue.format("YYYY-MM-DD")
          : null,
        intervaloSeguimiento: allValues.intervaloSeguimiento ?? null,
        tolerancia: allValues.tolerancia ?? null,
        // Datos del anestesiólogo
        anestesiologo_nombre: allValues.anestesiologo_nombre ?? null,
        anestesiologo_cedula: allValues.anestesiologo_cedula ?? null,
        anestesiologo_especialidad:
          allValues.anestesiologo_especialidad ?? null,
        // Datos del consultorio/clínica
        clinica_nombre: allValues.clinica_nombre ?? null,
        clinica_numero: allValues.clinica_numero ?? null,
        clinica_direccion: allValues.clinica_direccion ?? null,
        clinica_telefono: allValues.clinica_telefono ?? null,
        // Datos del médico tratante
        medico_nombre: allValues.medico_nombre ?? null,
        medico_cedula: allValues.medico_cedula ?? null,
        medico_especialidad: allValues.medico_especialidad ?? null,
        // Método de sedación
        metodo_sedacion: allValues.metodo_sedacion ?? null,
        sedacion_dosis: allValues.sedacion_dosis ?? null,
        sedacion_observaciones: allValues.sedacion_observaciones ?? null,
        // Equipo utilizado
        equipo_endoscopio: allValues.equipo_endoscopio ?? null,
        equipo_marca: allValues.equipo_marca ?? null,
        equipo_modelo: allValues.equipo_modelo ?? null,
        equipo_serie: allValues.equipo_serie ?? null,
        // Datos del asistente
        asistente_nombre: allValues.asistente_nombre ?? null,
        asistente_rol: allValues.asistente_rol ?? null,
      };

      // Si el estudio fue reabierto (tiene fecha_reapertura), registrar cambios en historial
      if (estudio?.fecha_reapertura) {
        const editHistory = estudio.edit_history || [];
        const changes: any = {};

        // Detectar cambios comparando valores anteriores con nuevos
        Object.keys(payload).forEach((key) => {
          const valorAnterior = estudio[key];
          const valorNuevo = payload[key];

          // Solo registrar si hay un cambio real
          if (valorAnterior !== valorNuevo) {
            changes[key] = {
              anterior: valorAnterior ?? null,
              nuevo: valorNuevo ?? null,
            };
          }
        });

        // Si hay cambios, agregar al historial
        if (Object.keys(changes).length > 0) {
          // Buscar si ya existe una entrada para esta reapertura
          const ultimaReapertura = estudio.fecha_reapertura;
          const indiceUltimaEdicion = editHistory.findIndex(
            (entry: any) => entry.fecha_reapertura === ultimaReapertura
          );

          if (indiceUltimaEdicion >= 0) {
            // Actualizar la entrada existente con los nuevos cambios
            const cambiosExistentes =
              editHistory[indiceUltimaEdicion].cambios || {};
            editHistory[indiceUltimaEdicion] = {
              ...editHistory[indiceUltimaEdicion],
              timestamp: new Date().toISOString(),
              cambios: { ...cambiosExistentes, ...changes },
            };
          } else {
            // Crear nueva entrada en el historial
            editHistory.push({
              timestamp: new Date().toISOString(),
              motivo: estudio.motivo_reapertura || "Sin motivo especificado",
              cambios: changes,
              usuario: user?.usuarioDetail?.nombre || "Usuario",
              fecha_reapertura: ultimaReapertura,
            });
          }

          payload.edit_history = editHistory;
        }
      }

      if (finalizeOnSave) {
        payload.estado = "finalizado";
        payload.fecha_finalizacion = new Date().toISOString();
      }

      await FirebaseEstudios.actualizarEstudio(
        empresaId,
        pacienteId,
        estudioId,
        payload
      );

      setEstudio((prev: any) => (prev ? { ...prev, ...payload } : prev));
      if (finalizeOnSave) {
        message.success("Estudio finalizado correctamente");
        navigate(`/paciente-detalle/${pacienteId}`);
      } else {
        message.success("Estudio actualizado exitosamente");
      }
    } catch (error) {
      console.error("Error actualizando estudio:", error);
      message.error("Error al actualizar el estudio");
    } finally {
      setSaving(false);
      setFinalizeOnSave(false);
      setReopenReason("");
    }
  };

  const aiSessions = Array.isArray(estudio?.secciones_ai)
    ? estudio.secciones_ai
    : [];

  const lastSessionAI = aiSessions.length
    ? aiSessions[aiSessions.length - 1]
    : null;

  const hasIaData = aiSessions.length > 0;
  const isFinalizado = estudio?.estado === "finalizado";

  const antecedentes = paciente
    ? {
        patologicos: paciente.antecedentesPatologicos || "No registrados",
        noPatologicos: paciente.antecedentesNoPatologicos || "No registrados",
        alergias: paciente.alergias || "Ninguna conocida",
        medicamentosActuales: paciente.medicamentosActuales || "Ninguno",
        cirugiasPrevias: paciente.cirugiasPrevias || "Ninguna",
        antecedentesFamiliares:
          paciente.antecedentesHeredoFamiliares || "No registrados",
      }
    : null;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-10">
      <div className="max-w-7xl mx-auto p-6">
        <Button
          type="default"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate(`/paciente-detalle/${pacienteId}`)}
          className="mb-5"
        >
          Volver al paciente
        </Button>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-3">
            <span>
              {paciente
                ? `Estudio de ${[
                    paciente.nombres,
                    paciente.apellidoPaterno,
                    paciente.apellidoMaterno,
                  ]
                    .filter(Boolean)
                    .join(" ")}`
                : "Detalle de estudio"}
            </span>
            {estudio?.estado && (
              <Tag
                color={
                  estudio.estado === "finalizado"
                    ? "green"
                    : estudio.estado === "en_edicion"
                    ? "orange"
                    : estudio.estado === "en_progreso"
                    ? "blue"
                    : "orange"
                }
              >
                {estudio.estado === "en_edicion"
                  ? "En edición"
                  : estudio.estado[0].toUpperCase() + estudio.estado.slice(1)}
              </Tag>
            )}
          </h1>
          {estudio?.estado === "finalizado" ? (
            <div className="flex gap-2">
              {estudio?.edit_history && estudio.edit_history.length > 0 && (
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => setIsHistorialModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                  size="large"
                >
                  Ver Historial ({estudio.edit_history.length})
                </Button>
              )}
              <Button
                type="primary"
                icon={<FilePdfOutlined />}
                onClick={() => setIsReportModalOpen(true)}
                className="bg-red-500 hover:bg-red-600 border-red-500"
                size="large"
              >
                Generar Reporte PDF
              </Button>
              <Button
                size="large"
                type="default"
                onClick={() => setIsReopenModalOpen(true)}
              >
                Reabrir para edición
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              {estudio?.edit_history && estudio.edit_history.length > 0 && (
                <Button
                  icon={<HistoryOutlined />}
                  onClick={() => setIsHistorialModalOpen(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white border-amber-500"
                >
                  Ver Historial ({estudio.edit_history.length})
                </Button>
              )}
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={() => {
                  setFinalizeOnSave(false);
                  form.submit();
                }}
              >
                Guardar cambios
              </Button>
              <Button
                type="primary"
                danger
                loading={saving}
                onClick={() => {
                  setFinalizeOnSave(true);
                  form.submit();
                }}
              >
                Finalizar estudio
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <>
            {/* Resumen básico del estudio */}
            <div className="mb-8">
              <EstudioBasicoDetalle
                loading={false}
                estudio={
                  estudio
                    ? {
                        tipo: estudio.tipo,
                        fecha: estudio.fecha,
                        observaciones: estudio.observaciones || "",
                        estado: estudio.estado,
                      }
                    : null
                }
              />
            </div>

            {/* Sección de IA como bloque independiente */}
            <section className="my-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <SectionTitle
                  title="Detección asistida por IA"
                  icon={<RobotOutlined className="text-indigo-600" />}
                />
                {!hasIaData ? (
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <p className="text-sm text-gray-700 md:max-w-xl">
                      Aún no hay resultados de detección registrados para este
                      estudio.
                    </p>
                    {!isFinalizado && (
                      <div className="flex justify-end">
                        <Button
                          type="primary"
                          onClick={() => {
                            if (!pacienteId || !estudioId) return;
                            navigate(
                              `/paciente-detalle/${pacienteId}/estudios/${estudioId}/deteccion`
                            );
                          }}
                        >
                          Comenzar detección con IA
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <span className="text-xs text-gray-500">
                        {`Sesiones AI registradas: ${aiSessions.length}`}
                      </span>
                      {!isFinalizado && (
                        <div className="flex justify-end">
                          <Button
                            type="primary"
                            onClick={() => {
                              if (!pacienteId || !estudioId) return;
                              navigate(
                                `/paciente-detalle/${pacienteId}/estudios/${estudioId}/deteccion`
                              );
                            }}
                          >
                            Nueva detección con IA
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3">
                      {aiSessions.map((session: any, index: number) => {
                        const cnnSummary = session?.ia_cnn?.summary;
                        const llm = session?.ia_llm;
                        const timestamp = session?.timestamp;

                        return (
                          <button
                            key={index}
                            type="button"
                            className="w-full text-left border border-gray-200 rounded-lg px-4 py-3 hover:border-indigo-400 hover:bg-indigo-50/40 transition flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                            onClick={() => {
                              setSelectedSessionIndex(index);
                              setIsSessionModalOpen(true);
                            }}
                          >
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-indigo-600 uppercase">
                                  {`Sesión ${index + 1}`}
                                </span>
                                {timestamp && (
                                  <span className="text-[11px] text-gray-500">
                                    {dayjs(timestamp).format(
                                      "DD/MM/YYYY HH:mm"
                                    )}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600">
                                {cnnSummary ? (
                                  <>
                                    {`Segmentos: ${
                                      cnnSummary.totalSegments ??
                                      session?.ia_cnn?.segments?.length ??
                                      0
                                    }`}
                                    {" · "}
                                    {`Último conteo de pólipos: ${
                                      cnnSummary.lastPolypCount ?? 0
                                    }`}
                                  </>
                                ) : (
                                  "Sin datos CNN"
                                )}
                              </p>
                            </div>

                            <div className="flex-1 md:text-right space-y-1">
                              <p className="text-xs font-semibold text-gray-500 uppercase">
                                Resumen LLM
                              </p>
                              {llm ? (
                                <p className="text-xs text-gray-600">
                                  {llm.has_polyp
                                    ? "Pólipo detectado"
                                    : "Sin pólipos"}
                                  {llm.severity &&
                                    ` · Severidad: ${llm.severity}`}
                                  {llm.confidence_level &&
                                    ` · Confianza: ${llm.confidence_level}`}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-500">
                                  Sin análisis LLM
                                </p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </section>
            {/* Historial de ediciones */}
            {estudio?.edit_history && estudio.edit_history.length > 0 && (
              <HistorialEdicionesEstudio
                editHistory={estudio.edit_history}
                motivo_reapertura={estudio.motivo_reapertura}
                fecha_reapertura={estudio.fecha_reapertura}
              />
            )}

            {/* Formulario clínico */}
            <div className="space-y-8">
              <Form
                layout="vertical"
                form={form}
                onFinish={handleSaveDetalle}
                autoComplete="off"
                size="large"
                disabled={estudio?.estado === "finalizado"}
              >
                <div className="space-y-8">
                  {/* Sección 1: Información clínica y hallazgos */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <SectionTitle
                      title="Información clínica y hallazgos"
                      icon={<FileTextOutlined className="text-indigo-600" />}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Form.Item
                        label="Diagnostico"
                        name="resultado"
                        className="md:col-span-2"
                      >
                        <Input placeholder="Ej. Colonoscopia completa hasta ciego, preparación adecuada..." />
                      </Form.Item>
                      <Form.Item
                        label="Hallazgos generales"
                        name="hallazgos"
                        className="md:col-span-2"
                      >
                        <TextArea
                          rows={4}
                          placeholder="Describa detalladamente los hallazgos visuales..."
                          className="bg-gray-50"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Sección 2: Detalle de pólipos */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full -mr-10 -mt-10 z-0" />
                    <div className="relative z-10">
                      <SectionTitle
                        title="Detalle de lesiones / pólipos"
                        icon={
                          <ExperimentOutlined className="text-indigo-600" />
                        }
                      />
                      <div className="bg-indigo-50/50 p-5 rounded-lg border border-indigo-100">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <Form.Item label="Tipo / morfología" name="polipo">
                            <Select placeholder="Seleccionar tipo de pólipo">
                              <Option value="Sin pólipo">Sin pólipo</Option>
                              <Option value="Adenomatoso">Adenomatoso</Option>
                              <Option value="Hiperplásico">Hiperplásico</Option>
                              <Option value="Sésil (Is)">Sésil (Is)</Option>
                              <Option value="Pediculado (Ip)">
                                Pediculado (Ip)
                              </Option>
                              <Option value="LST">LST</Option>
                            </Select>
                          </Form.Item>
                          <Form.Item label="Tamaño (mm)" name="tamano">
                            <Input suffix="mm" placeholder="8" />
                          </Form.Item>
                          <Form.Item
                            label="Ubicación anatómica"
                            name="ubicacion"
                            tooltip="La región seleccionada se marca sobre la ilustración del órgano en el reporte PDF"
                          >
                            <Select placeholder="Seleccionar región..." allowClear>
                              {REGIONES_ANATOMICAS[
                                organoPorTipoEstudio(estudio?.tipo)
                              ].map((r) => (
                                <Option key={r.etiqueta} value={r.etiqueta}>
                                  {r.etiqueta}
                                </Option>
                              ))}
                            </Select>
                          </Form.Item>
                          <Form.Item
                            label="Clasificación (NICE/JNET)"
                            name="clasificacion"
                          >
                            <Select placeholder="Seleccionar clasificación">
                              <Option value="NICE I">NICE I</Option>
                              <Option value="NICE II">NICE II</Option>
                              <Option value="NICE III">NICE III</Option>
                              <Option value="JNET 1">JNET 1</Option>
                              <Option value="JNET 2A">JNET 2A</Option>
                              <Option value="JNET 2B">JNET 2B</Option>
                              <Option value="JNET 3">JNET 3</Option>
                            </Select>
                          </Form.Item>
                          <Form.Item label="Acción terapéutica" name="accion">
                            <Input placeholder="Ej. Mucosectomía" />
                          </Form.Item>
                          <Form.Item label="¿Se tomó biopsia?" name="biopsia">
                            <Select placeholder="Seleccionar...">
                              <Option value="Sí">Sí</Option>
                              <Option value="No">No</Option>
                            </Select>
                          </Form.Item>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sección 3: Plan y seguimiento */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <SectionTitle
                      title="Plan y seguimiento"
                      icon={<MedicineBoxOutlined className="text-indigo-600" />}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Form.Item
                        label="Medicamentos utilizados"
                        name="medicamentos"
                      >
                        <TextArea
                          rows={2}
                          placeholder="Sedación, antiespasmódicos..."
                        />
                      </Form.Item>
                      <Form.Item
                        label="Complicaciones intraprocedimiento"
                        name="complicaciones"
                      >
                        <TextArea
                          rows={2}
                          placeholder="Ninguna o describir..."
                        />
                      </Form.Item>

                      <Divider className="md:col-span-2 my-2" />

                      <Form.Item
                        label="Fecha sugerida próximo control"
                        name="seguimiento"
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          format="DD/MM/YYYY"
                          placeholder="Seleccionar fecha"
                        />
                      </Form.Item>
                      <Form.Item
                        label="Intervalo (texto)"
                        name="intervaloSeguimiento"
                      >
                        <Input placeholder="Ej. 3 años si biopsia confirma adenoma" />
                      </Form.Item>
                      <Form.Item
                        label="Tolerancia del paciente"
                        name="tolerancia"
                        className="md:col-span-2"
                      >
                        <Input placeholder="Ej. Buena tolerancia, alta satisfactoria" />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Sección 4: Datos del Médico Tratante */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <SectionTitle
                      title="Médico Tratante"
                      icon={<UserOutlined className="text-blue-600" />}
                    />
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-700 flex items-center gap-2">
                        <InfoCircleOutlined className="text-blue-600" />
                        <span>
                          Estos datos corresponden a tu información profesional.
                          Para modificarlos, ve a{" "}
                          <strong>
                            Configuración → Datos Médicos Profesionales
                          </strong>
                        </span>
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Form.Item label="Nombre completo" name="medico_nombre">
                        <Input
                          placeholder="Dr. Juan Pérez García"
                          disabled
                          className="bg-gray-50"
                        />
                      </Form.Item>
                      <Form.Item
                        label="Cédula profesional"
                        name="medico_cedula"
                      >
                        <Input
                          placeholder="12345678"
                          disabled
                          className="bg-gray-50"
                        />
                      </Form.Item>
                      <Form.Item
                        label="Especialidad"
                        name="medico_especialidad"
                      >
                        <Input
                          placeholder="Gastroenterología"
                          disabled
                          className="bg-gray-50"
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Sección 5: Datos del Anestesiólogo */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <SectionTitle
                      title="Anestesiólogo"
                      icon={<UserOutlined className="text-purple-600" />}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Form.Item
                        label="Nombre completo"
                        name="anestesiologo_nombre"
                      >
                        <Input placeholder="Dr. María López Ruiz" />
                      </Form.Item>
                      <Form.Item
                        label="Cédula profesional"
                        name="anestesiologo_cedula"
                      >
                        <Input placeholder="87654321" />
                      </Form.Item>
                      <Form.Item
                        label="Especialidad"
                        name="anestesiologo_especialidad"
                      >
                        <Input placeholder="Anestesiología" />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Sección 6: Datos del Asistente */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <SectionTitle
                      title="Asistente / Enfermero(a)"
                      icon={<TeamOutlined className="text-teal-600" />}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Form.Item
                        label="Nombre completo"
                        name="asistente_nombre"
                      >
                        <Input placeholder="Enf. Ana Martínez" />
                      </Form.Item>
                      <Form.Item label="Rol / Función" name="asistente_rol">
                        <Select placeholder="Seleccionar rol">
                          <Option value="Enfermero(a)">Enfermero(a)</Option>
                          <Option value="Técnico">Técnico</Option>
                          <Option value="Asistente médico">
                            Asistente médico
                          </Option>
                          <Option value="Residente">Residente</Option>
                          <Option value="Otro">Otro</Option>
                        </Select>
                      </Form.Item>
                    </div>
                  </div>

                  {/* Sección 7: Datos del Consultorio / Clínica */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <SectionTitle
                      title="Consultorio / Clínica"
                      icon={<HomeOutlined className="text-green-600" />}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Form.Item
                        label="Nombre del establecimiento"
                        name="clinica_nombre"
                      >
                        <Input placeholder="Hospital General / Clínica XYZ" />
                      </Form.Item>
                      <Form.Item
                        label="Número de consultorio / sala"
                        name="clinica_numero"
                      >
                        <Input placeholder="Consultorio 205 / Sala de Endoscopia 1" />
                      </Form.Item>
                      <Form.Item
                        label="Dirección"
                        name="clinica_direccion"
                        className="md:col-span-2"
                      >
                        <Input placeholder="Av. Principal #123, Col. Centro, CP 12345" />
                      </Form.Item>
                      <Form.Item label="Teléfono" name="clinica_telefono">
                        <Input placeholder="(555) 123-4567" />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Sección 8: Método de Sedación */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <SectionTitle
                      title="Método de Sedación"
                      icon={<MedicineBoxOutlined className="text-orange-600" />}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Form.Item
                        label="Tipo de sedación"
                        name="metodo_sedacion"
                      >
                        <Select placeholder="Seleccionar método">
                          <Option value="Sedación consciente">
                            Sedación consciente
                          </Option>
                          <Option value="Sedación profunda">
                            Sedación profunda
                          </Option>
                          <Option value="Anestesia general">
                            Anestesia general
                          </Option>
                          <Option value="Sin sedación">Sin sedación</Option>
                          <Option value="Sedación con Propofol">
                            Sedación con Propofol
                          </Option>
                          <Option value="Sedación con Midazolam">
                            Sedación con Midazolam
                          </Option>
                          <Option value="Otro">Otro</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item
                        label="Dosis administrada"
                        name="sedacion_dosis"
                      >
                        <Input placeholder="Ej. Propofol 200mg IV, Fentanilo 100mcg" />
                      </Form.Item>
                      <Form.Item
                        label="Observaciones de sedación"
                        name="sedacion_observaciones"
                        className="md:col-span-2"
                      >
                        <TextArea
                          rows={2}
                          placeholder="Notas sobre la sedación, respuesta del paciente, etc."
                        />
                      </Form.Item>
                    </div>
                  </div>

                  {/* Sección 9: Equipo Utilizado */}
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <SectionTitle
                      title="Equipo Utilizado"
                      icon={<ToolOutlined className="text-gray-600" />}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Form.Item
                        label="Tipo de endoscopio"
                        name="equipo_endoscopio"
                      >
                        <Select placeholder="Seleccionar tipo">
                          <Option value="Colonoscopio">Colonoscopio</Option>
                          <Option value="Gastroscopio">Gastroscopio</Option>
                          <Option value="Duodenoscopio">Duodenoscopio</Option>
                          <Option value="Enteroscopio">Enteroscopio</Option>
                          <Option value="Sigmoidoscopio">Sigmoidoscopio</Option>
                          <Option value="Otro">Otro</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item label="Marca" name="equipo_marca">
                        <Input placeholder="Olympus, Fujifilm, Pentax, etc." />
                      </Form.Item>
                      <Form.Item label="Modelo" name="equipo_modelo">
                        <Input placeholder="CF-HQ190L, etc." />
                      </Form.Item>
                      <Form.Item label="Número de serie" name="equipo_serie">
                        <Input placeholder="SN-XXXXX" />
                      </Form.Item>
                    </div>
                  </div>
                </div>
              </Form>
            </div>

            {/* Columna lateral - Antecedentes y Otros Estudios */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Otros estudios del paciente */}
              <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <SectionTitle
                  title="Otros estudios del paciente"
                  icon={<ExperimentOutlined className="text-indigo-600" />}
                />

                {otrosEstudios.length === 0 ? (
                  <Empty
                    description="No hay otros estudios registrados"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <List
                    size="small"
                    dataSource={otrosEstudios}
                    renderItem={(otroEstudio: any) => (
                      <List.Item
                        className="cursor-pointer hover:bg-gray-50 rounded px-2"
                        onClick={() =>
                          navigate(
                            `/paciente-detalle/${pacienteId}/estudios/${otroEstudio.id}`
                          )
                        }
                      >
                        <div className="flex justify-between w-full items-center">
                          <div>
                            <span className="font-medium">
                              {otroEstudio.tipo}
                            </span>
                            <span className="text-gray-500 ml-2">
                              {otroEstudio.fecha
                                ? dayjs(otroEstudio.fecha).format("DD/MM/YYYY")
                                : "-"}
                            </span>
                          </div>
                          <Tag
                            color={
                              otroEstudio.estado === "finalizado"
                                ? "green"
                                : otroEstudio.estado === "en_progreso"
                                ? "blue"
                                : "orange"
                            }
                          >
                            {otroEstudio.estado || "Pendiente"}
                          </Tag>
                        </div>
                      </List.Item>
                    )}
                  />
                )}

                <Button
                  type="dashed"
                  className="w-full mt-4"
                  onClick={() => navigate(`/paciente-detalle/${pacienteId}`)}
                >
                  Ver todos los estudios
                </Button>
              </div>

              {/* Antecedentes del paciente */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <SectionTitle
                  title="Antecedentes del paciente"
                  icon={<UserOutlined className="text-indigo-600" />}
                />

                {antecedentes ? (
                  <Collapse
                    defaultActiveKey={["1", "2"]}
                    ghost
                    className="bg-transparent"
                  >
                    <Panel
                      header={
                        <span className="font-medium text-gray-700">
                          Antecedentes patológicos
                        </span>
                      }
                      key="1"
                    >
                      <p className="text-sm text-gray-600">
                        {antecedentes.patologicos}
                      </p>
                    </Panel>
                    <Panel
                      header={
                        <span className="font-medium text-gray-700">
                          Antecedentes no patológicos
                        </span>
                      }
                      key="2"
                    >
                      <p className="text-sm text-gray-600">
                        {antecedentes.noPatologicos}
                      </p>
                    </Panel>
                    <Panel
                      header={
                        <span className="font-medium text-gray-700">
                          Alergias
                        </span>
                      }
                      key="3"
                    >
                      <p className="text-sm text-gray-600">
                        {antecedentes.alergias}
                      </p>
                    </Panel>
                    <Panel
                      header={
                        <span className="font-medium text-gray-700">
                          Medicamentos actuales
                        </span>
                      }
                      key="4"
                    >
                      <p className="text-sm text-gray-600">
                        {antecedentes.medicamentosActuales}
                      </p>
                    </Panel>
                    <Panel
                      header={
                        <span className="font-medium text-gray-700">
                          Cirugías previas
                        </span>
                      }
                      key="5"
                    >
                      <p className="text-sm text-gray-600">
                        {antecedentes.cirugiasPrevias}
                      </p>
                    </Panel>
                    <Panel
                      header={
                        <span className="font-medium text-gray-700">
                          Antecedentes familiares
                        </span>
                      }
                      key="6"
                    >
                      <p className="text-sm text-gray-600">
                        {antecedentes.antecedentesFamiliares}
                      </p>
                    </Panel>
                  </Collapse>
                ) : (
                  <p className="text-sm text-gray-500">
                    No hay antecedentes registrados
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      {selectedSessionIndex !== null && aiSessions[selectedSessionIndex] && (
        <ModalInfoSeccionAI
          isSessionModalOpen={isSessionModalOpen}
          setIsSessionModalOpen={setIsSessionModalOpen}
          selectedSessionIndex={selectedSessionIndex}
          aiSessions={aiSessions}
        />
      )}
      {isFinalizado && (
        <ModalGenerarReporte
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          estudio={estudio}
          paciente={paciente}
        />
      )}
      <Modal
        title="Reabrir estudio para edición"
        open={isReopenModalOpen}
        onCancel={() => {
          setIsReopenModalOpen(false);
          setReopenReason("");
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsReopenModalOpen(false);
              setReopenReason("");
            }}
          >
            Cancelar
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={saving}
            onClick={handleReopenEstudio}
          >
            Reabrir estudio
          </Button>,
        ]}
      >
        <div className="space-y-4 flex flex-col">
          <p className="text-sm text-gray-600">
            Al reabrir este estudio, podrás realizar cambios en todos los
            campos. Se registrará un historial de auditoría con los cambios
            realizados.
          </p>
          <Form.Item
            label="Motivo de reapertura"
            required
            style={{ display: "flex", flexDirection: "column" }}
          >
            <TextArea
              rows={4}
              placeholder="Describe el motivo por el cual necesitas reabrir este estudio finalizado..."
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              className="bg-gray-50"
            />
          </Form.Item>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Nota:</strong> Este cambio quedará registrado en el
              historial de auditoría del estudio para fines de cumplimiento
              normativo.
            </p>
          </div>
        </div>
      </Modal>
      <ModalHistorialCambios
        visible={isHistorialModalOpen}
        onCancel={() => setIsHistorialModalOpen(false)}
        editHistory={estudio?.edit_history}
        motivo_reapertura={estudio?.motivo_reapertura}
        fecha_reapertura={estudio?.fecha_reapertura}
      />
    </div>
  );
};

export default EstudioDetalle;
