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
  message,
  Modal,
} from "antd";
import {
  SaveOutlined,
  RobotOutlined,
  MedicineBoxOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ArrowLeftOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import FirebaseConsultas from "../features/FirebaseConsultas";
import FirebasePacientes from "../features/FirebasePacientes";
import ConsultaBasicaDetalle from "../components/pacientes-detalle/ConsultaBasicaDetalle";
import SectionTitle from "../components/common/SectionTitle";
import ModalInfoSeccionAI from "../components/consulta-detalle/ModalInfoSeccionAI";

const { TextArea } = Input;
const { Option } = Select;

const ConsultaDetalle: React.FC = () => {
  const { id: pacienteId, consultaId } = useParams<{
    id: string;
    consultaId: string;
  }>();
  const navigate = useNavigate();
  // TODO: Obtener empresaId del contexto de autenticación
  const empresaId = "GoFayqIW9MR718FzNpyzGUgaK283";

  const [loading, setLoading] = useState(true);
  const [consulta, setConsulta] = useState<any | null>(null);
  const [paciente, setPaciente] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [finalizeOnSave, setFinalizeOnSave] = useState(false);
  const [selectedSessionIndex, setSelectedSessionIndex] = useState<
    number | null
  >(null);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);

  console.log("la consulta luce asi", consulta);

  useEffect(() => {
    const fetchConsulta = async () => {
      if (!pacienteId || !consultaId) {
        setLoading(false);
        return;
      }

      try {
        const data: any = await FirebaseConsultas.obtenerConsultaPorId(
          empresaId,
          pacienteId,
          consultaId
        );

        if (!data) {
          setLoading(false);
          return;
        }

        setConsulta(data);

        if (data.paciente_id) {
          const pacienteData = await FirebasePacientes.obtenerPacientePorId(
            empresaId,
            data.paciente_id
          );
          setPaciente(pacienteData);
        }

        const fechaSeguimiento = data.seguimiento
          ? dayjs(data.seguimiento)
          : null;

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
        });
      } catch (error) {
        console.error("Error obteniendo detalle de consulta:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchConsulta();
  }, [empresaId, pacienteId, consultaId, form]);

  const handleSaveDetalle = async (values: any) => {
    if (!pacienteId || !consultaId) return;
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
      };

      if (finalizeOnSave) {
        payload.estado = "finalizada";
      }

      await FirebaseConsultas.actualizarConsulta(
        empresaId,
        pacienteId,
        consultaId,
        payload
      );

      setConsulta((prev: any) => (prev ? { ...prev, ...payload } : prev));
      if (finalizeOnSave) {
        message.success("Consulta finalizada correctamente");
        navigate(`/paciente-detalle/${pacienteId}`);
      } else {
        message.success("Consulta actualizada exitosamente");
      }
    } catch (error) {
      console.error("Error actualizando consulta:", error);
      message.error("Error al actualizar la consulta");
    } finally {
      setSaving(false);
      setFinalizeOnSave(false);
    }
  };

  const aiSessions = Array.isArray(consulta?.secciones_ai)
    ? consulta.secciones_ai
    : [];

  const lastSessionAI = aiSessions.length
    ? aiSessions[aiSessions.length - 1]
    : null;

  const hasIaData = aiSessions.length > 0;
  const isFinalizada = consulta?.estado === "finalizada";

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
                ? `Consulta de ${[
                    paciente.nombres,
                    paciente.apellidoPaterno,
                    paciente.apellidoMaterno,
                  ]
                    .filter(Boolean)
                    .join(" ")}`
                : "Detalle de consulta"}
            </span>
            {consulta?.estado && (
              <Tag
                color={
                  consulta.estado === "finalizada"
                    ? "green"
                    : consulta.estado === "en_progreso"
                    ? "blue"
                    : "orange"
                }
              >
                {consulta.estado[0].toUpperCase() + consulta.estado.slice(1)}
              </Tag>
            )}
          </h1>
          {!isFinalizada && (
            <div className="flex gap-2">
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
                Finalizar consulta
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <Skeleton active paragraph={{ rows: 6 }} />
        ) : (
          <>
            {/* Resumen básico de la consulta */}
            <div className="mb-8">
              <ConsultaBasicaDetalle
                loading={false}
                consulta={
                  consulta
                    ? {
                        tipo: consulta.tipo,
                        fecha: consulta.fecha,
                        observaciones: consulta.observaciones || "",
                        estado: consulta.estado,
                      }
                    : null
                }
              />
            </div>

            {/* Formulario clínico */}
            <div className="space-y-8">
              <Form
                layout="vertical"
                form={form}
                onFinish={handleSaveDetalle}
                autoComplete="off"
                size="large"
                disabled={isFinalizada}
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
                        label="Resultado general"
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
                          <Form.Item label="Ubicación" name="ubicacion">
                            <Select placeholder="Seleccionar...">
                              <Option value="Ciego">Ciego</Option>
                              <Option value="Colon Ascendente">
                                Colon Ascendente
                              </Option>
                              <Option value="Transverso">Transverso</Option>
                              <Option value="Descendente">Descendente</Option>
                              <Option value="Sigmoides">Sigmoides</Option>
                              <Option value="Recto">Recto</Option>
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
                </div>
              </Form>

              {/* Sección de IA como bloque independiente */}
              <section className="mt-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <SectionTitle
                    title="Detección asistida por IA"
                    icon={<RobotOutlined className="text-indigo-600" />}
                  />
                  {!hasIaData ? (
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <p className="text-sm text-gray-700 md:max-w-xl">
                        Aún no hay resultados de detección registrados para esta
                        consulta.
                      </p>
                      {!isFinalizada && (
                        <div className="flex justify-end">
                          <Button
                            type="primary"
                            onClick={() => {
                              if (!pacienteId || !consultaId) return;
                              navigate(
                                `/paciente-detalle/${pacienteId}/consultas/${consultaId}/deteccion`
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
                        {!isFinalizada && (
                          <div className="flex justify-end">
                            <Button
                              type="primary"
                              onClick={() => {
                                if (!pacienteId || !consultaId) return;
                                navigate(
                                  `/paciente-detalle/${pacienteId}/consultas/${consultaId}/deteccion`
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
    </div>
  );
};

export default ConsultaDetalle;
