import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Skeleton,
  Form,
  Input,
  Button,
  Tag,
  message,
  Collapse,
  List,
  Empty,
} from "antd";
import {
  SaveOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  ArrowLeftOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import FirebaseConsultas from "../features/FirebaseConsultas";
import FirebasePacientes from "../features/FirebasePacientes";
import FirebaseEstudios from "../features/FirebaseEstudios";
import SectionTitle from "../components/common/SectionTitle";
import { useElectronStore } from "../hooks/useElectronStore";
const { TextArea } = Input;
const { Panel } = Collapse;

const ConsultaDetalle: React.FC = () => {
  const { id: pacienteId, consultaId } = useParams<{
    id: string;
    consultaId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;

  const [loading, setLoading] = useState(true);
  const [consulta, setConsulta] = useState<any | null>(null);
  const [paciente, setPaciente] = useState<any | null>(null);
  const [estudios, setEstudios] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [finalizeOnSave, setFinalizeOnSave] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!pacienteId || !consultaId) {
        setLoading(false);
        return;
      }

      try {
        // Obtener consulta
        const consultaData: any = await FirebaseConsultas.obtenerConsultaPorId(
          empresaId,
          pacienteId,
          consultaId
        );

        if (!consultaData) {
          setLoading(false);
          return;
        }

        setConsulta(consultaData);

        // Obtener paciente
        const pacienteData = await FirebasePacientes.obtenerPacientePorId(
          empresaId,
          pacienteId
        );
        setPaciente(pacienteData);

        // Obtener estudios del paciente
        const estudiosData = await FirebaseEstudios.obtenerEstudiosDePaciente(
          empresaId,
          pacienteId
        );
        setEstudios(estudiosData || []);

        // Setear valores del formulario
        form.setFieldsValue({
          motivo_consulta: consultaData.motivo_consulta || "",
          hallazgos_generales: consultaData.hallazgos_generales || "",
          notas: consultaData.notas || "",
        });
      } catch (error) {
        console.error("Error obteniendo datos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [empresaId, pacienteId, consultaId, form]);

  const handleSave = async () => {
    if (!pacienteId || !consultaId) return;

    try {
      setSaving(true);
      const values = form.getFieldsValue(true);

      const payload: any = {
        motivo_consulta: values.motivo_consulta ?? "",
        hallazgos_generales: values.hallazgos_generales ?? "",
        notas: values.notas ?? "",
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
        message.success("Consulta guardada exitosamente");
      }
    } catch (error) {
      console.error("Error guardando consulta:", error);
      message.error("Error al guardar la consulta");
    } finally {
      setSaving(false);
      setFinalizeOnSave(false);
    }
  };

  const isFinalizada = consulta?.estado === "finalizada";

  const antecedentes = paciente
    ? {
        patologicos: paciente.antecedentesPatologicos || "No registrados",
        noPatologicos: paciente.antecedentesNoPatologicos || "No registrados",
        alergias: paciente.alergias || "Ninguna conocida",
        medicamentosActuales: paciente.medicamentosActuales || "Ninguno",
        cirugiasPrevias: paciente.cirugiasPrevias || "Ninguna",
        antecedentesFamiliares:
          paciente.antecedentesFamiliares || "No registrados",
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
                  handleSave();
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
                  handleSave();
                }}
              >
                Finalizar consulta
              </Button>
            </div>
          )}
        </div>

        {loading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna principal - Formulario */}
            <div className="lg:col-span-2 space-y-6">
              {/* Info básica */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Fecha de consulta</p>
                    <p className="text-lg font-semibold">
                      {consulta?.fecha
                        ? dayjs(consulta.fecha).format("DD/MM/YYYY")
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Formulario de consulta */}
              <Form
                layout="vertical"
                form={form}
                autoComplete="off"
                size="large"
                disabled={isFinalizada}
              >
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <SectionTitle
                    title="Información de la consulta"
                    icon={<FileTextOutlined className="text-indigo-600" />}
                  />

                  <Form.Item
                    label="Motivo de consulta"
                    name="motivo_consulta"
                    className="mb-4"
                  >
                    <TextArea
                      rows={2}
                      placeholder="Describa el motivo de la consulta..."
                      className="bg-gray-50"
                    />
                  </Form.Item>

                  <Form.Item
                    label="Hallazgos generales"
                    name="hallazgos_generales"
                    className="mb-4"
                  >
                    <TextArea
                      rows={4}
                      placeholder="Describa los hallazgos durante la consulta..."
                      className="bg-gray-50"
                    />
                  </Form.Item>

                  <Form.Item label="Notas adicionales" name="notas">
                    <TextArea
                      rows={4}
                      placeholder="Notas, observaciones, indicaciones para el paciente..."
                      className="bg-gray-50"
                    />
                  </Form.Item>
                </div>
              </Form>

              {/* Estudios relacionados */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mt-5">
                <SectionTitle
                  title="Estudios del paciente"
                  icon={<ExperimentOutlined className="text-indigo-600" />}
                />

                {estudios.length === 0 ? (
                  <Empty
                    description="No hay estudios registrados"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <List
                    size="small"
                    dataSource={estudios}
                    renderItem={(estudio: any) => (
                      <List.Item
                        className="cursor-pointer hover:bg-gray-50 rounded px-2"
                        onClick={() =>
                          navigate(
                            `/paciente-detalle/${pacienteId}/estudios/${estudio.id}`
                          )
                        }
                      >
                        <div className="flex justify-between w-full items-center">
                          <div>
                            <span className="font-medium">{estudio.tipo}</span>
                            <span className="text-gray-500 ml-2">
                              {estudio.fecha
                                ? dayjs(estudio.fecha).format("DD/MM/YYYY")
                                : "-"}
                            </span>
                          </div>
                          <Tag
                            color={
                              estudio.estado === "finalizado"
                                ? "green"
                                : estudio.estado === "en_progreso"
                                ? "blue"
                                : "orange"
                            }
                          >
                            {estudio.estado || "Pendiente"}
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
            </div>

            {/* Columna lateral - Antecedentes */}
            <div className="space-y-6">
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
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsultaDetalle;
