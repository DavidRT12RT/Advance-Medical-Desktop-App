import React, { useState, useEffect } from "react";
import { Modal, Form, Select, DatePicker, Input, message } from "antd";
import { useElectronStore } from "../../hooks/useElectronStore";
import FirebasePacientes from "../../features/FirebasePacientes";
import FirebaseConsultas from "../../features/FirebaseConsultas";
import dayjs from "dayjs";

const { Option } = Select;
const { TextArea } = Input;

interface ModalNuevaConsultaProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
}

const ModalNuevaConsulta: React.FC<ModalNuevaConsultaProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;
  const userId = user?.usuarioDetail?.id;

  const [loading, setLoading] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);

  useEffect(() => {
    if (visible && empresaId) {
      fetchPacientes();
    }
  }, [visible, empresaId]);

  const fetchPacientes = async () => {
    if (!empresaId) return;
    try {
      setLoadingPacientes(true);
      const data = await FirebasePacientes.obtenerPacientes(empresaId, userId);
      setPacientes(data);
    } catch (error) {
      console.error("Error obteniendo pacientes:", error);
      message.error("Error al cargar pacientes");
    } finally {
      setLoadingPacientes(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      if (!empresaId) {
        message.error("No se encontró la empresa");
        return;
      }

      const pacienteSeleccionado = pacientes.find(
        (p) => p.id === values.pacienteId,
      );

      const nuevaConsulta = {
        pacienteId: values.pacienteId,
        paciente: {
          id: pacienteSeleccionado?.id,
          nombre: pacienteSeleccionado?.nombre,
          apellido: pacienteSeleccionado?.apellido,
          sexo: pacienteSeleccionado?.sexo,
          fechaNacimiento: pacienteSeleccionado?.fechaNacimiento,
        },
        fecha: values.fecha.format("YYYY-MM-DD"),
        tipo: values.tipo,
        estado: "pendiente",
        resultado: values.resultado || null,
        observaciones: values.observaciones || "",
        diagnostico: "",
        medico: {
          id: user?.id,
          nombre: user?.nombre || "Sin nombre",
        },
        fechaRegistro: new Date().toISOString(),
        empresaId,
      };

      await FirebaseConsultas.crearConsultaBasica(
        empresaId,
        values.pacienteId,
        nuevaConsulta,
        userId,
      );
      message.success("Consulta creada exitosamente");
      form.resetFields();
      onCancel();
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error creando consulta:", error);
      message.error("Error al crear consulta");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Nueva Consulta"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText="Crear"
      cancelText="Cancelar"
      width={600}
    >
      <Form form={form} layout="vertical" className="mt-4">
        <Form.Item
          name="pacienteId"
          label="Paciente"
          rules={[{ required: true, message: "Seleccione un paciente" }]}
        >
          <Select
            placeholder="Seleccione un paciente"
            loading={loadingPacientes}
            showSearch
            optionFilterProp="children"
          >
            {pacientes.map((paciente) => (
              <Option key={paciente.id} value={paciente.id}>
                {paciente.nombre} {paciente.apellido}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="fecha"
          label="Fecha de la consulta"
          rules={[{ required: true, message: "Seleccione una fecha" }]}
        >
          <DatePicker
            style={{ width: "100%" }}
            format="YYYY-MM-DD"
            placeholder="Seleccione fecha"
          />
        </Form.Item>

        <Form.Item
          name="tipo"
          label="Tipo de consulta"
          rules={[{ required: true, message: "Seleccione el tipo" }]}
        >
          <Select placeholder="Seleccione tipo">
            <Option value="Colonoscopia">Colonoscopia</Option>
            <Option value="Endoscopia">Endoscopia</Option>
          </Select>
        </Form.Item>

        <Form.Item name="resultado" label="Resultado">
          <Select placeholder="Seleccione resultado" allowClear>
            <Option value="Normal">Normal</Option>
            <Option value="Anormal">Anormal</Option>
          </Select>
        </Form.Item>

        <Form.Item name="observaciones" label="Observaciones iniciales">
          <TextArea
            rows={4}
            placeholder="Ingrese observaciones iniciales..."
            maxLength={500}
            showCount
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModalNuevaConsulta;
