import React, { useState, useEffect } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Row,
  Col,
  message,
  AutoComplete,
} from "antd";
import { useNavigate } from "react-router-dom";
import FirebaseEstudios from "../../features/FirebaseEstudios";
import FirebasePacientes from "../../features/FirebasePacientes";
import { useElectronStore } from "../../hooks/useElectronStore";
import { TIPOS_ESTUDIO_OPTIONS } from "../../utils/tiposEstudio";

interface ModalNuevoEstudioProps {
  visible: boolean;
  onCancel: () => void;
}

const ModalNuevoEstudio: React.FC<ModalNuevoEstudioProps> = ({
  visible,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;
  const userId = user?.usuarioDetail?.id;

  const [pacientes, setPacientes] = useState<any[]>([]);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [selectedPaciente, setSelectedPaciente] = useState<any>(null);

  useEffect(() => {
    if (visible) {
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

  const handleCancel = () => {
    form.resetFields();
    setSearchValue("");
    setSelectedPaciente(null);
    onCancel();
  };

  const handleSubmit = async (values: any) => {
    try {
      await form.validateFields();

      if (!selectedPaciente) {
        message.error("Debes seleccionar un paciente");
        return;
      }

      const fechaFormatoApi = values.fecha
        ? values.fecha.format("YYYY-MM-DD")
        : null;

      const estudioBasico = {
        tipo: values.tipo,
        fecha: fechaFormatoApi,
        observaciones: values.observaciones || "",
        estado: "pendiente",
      };

      const nuevoEstudio = await FirebaseEstudios.crearEstudioBasico(
        empresaId,
        selectedPaciente.id,
        estudioBasico,
        userId,
      );

      message.success("Estudio creado exitosamente");
      handleCancel();

      // Navegar al detalle del estudio recién creado
      navigate(
        `/paciente-detalle/${selectedPaciente.id}/estudios/${nuevoEstudio.id}`,
      );
    } catch (error) {
      console.error("Error al guardar estudio básico:", error);
      message.error("Error al crear el estudio");
    }
  };

  const pacientesOptions = pacientes
    .filter((p) => {
      const searchLower = searchValue.toLowerCase();
      const nombreCompleto =
        `${p.nombres} ${p.apellidoPaterno} ${p.apellidoMaterno}`.toLowerCase();
      return (
        nombreCompleto.includes(searchLower) ||
        p.cedula?.toLowerCase().includes(searchLower) ||
        p.email?.toLowerCase().includes(searchLower)
      );
    })
    .map((p) => ({
      value: p.id,
      label: `${p.nombres} ${p.apellidoPaterno} ${p.apellidoMaterno} - ${
        p.cedula || "Sin cédula"
      }`,
      paciente: p,
    }));

  const handleSelectPaciente = (value: string, option: any) => {
    setSelectedPaciente(option.paciente);
    setSearchValue(option.label);
  };

  return (
    <Modal
      title="Crear Nuevo Estudio"
      open={visible}
      onCancel={handleCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancelar
        </Button>,
        <Button key="submit" type="primary" onClick={() => form.submit()}>
          Crear Estudio
        </Button>,
      ]}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <Form.Item
          label="Seleccionar Paciente"
          name="paciente"
          rules={[
            {
              required: true,
              message: "Debes seleccionar un paciente",
            },
          ]}
        >
          <AutoComplete
            value={searchValue}
            onChange={setSearchValue}
            onSelect={handleSelectPaciente}
            options={pacientesOptions}
            placeholder="Buscar paciente por nombre, cédula o email..."
            filterOption={false}
            notFoundContent={
              loadingPacientes ? "Cargando..." : "No se encontraron pacientes"
            }
            style={{ width: "100%" }}
          />
        </Form.Item>

        {selectedPaciente && (
          <div className="bg-indigo-50 p-3 rounded mb-4 border border-indigo-200">
            <p className="text-sm text-gray-600 mb-1">Paciente seleccionado:</p>
            <p className="font-semibold text-gray-900">
              {selectedPaciente.nombres} {selectedPaciente.apellidoPaterno}{" "}
              {selectedPaciente.apellidoMaterno}
            </p>
            <p className="text-xs text-gray-600">
              Cédula: {selectedPaciente.cedula || "N/A"} | Sexo:{" "}
              {selectedPaciente.sexo || "N/A"} | Fecha Nac:{" "}
              {selectedPaciente.fechaNacimiento || "N/A"}
            </p>
          </div>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Tipo de Procedimiento"
              name="tipo"
              initialValue="Colonoscopia"
              rules={[
                {
                  required: true,
                  message: "Selecciona el tipo de procedimiento",
                },
              ]}
            >
              <Select options={TIPOS_ESTUDIO_OPTIONS} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Fecha de Procedimiento"
              name="fecha"
              rules={[{ required: true, message: "Selecciona la fecha" }]}
            >
              <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="Observaciones Iniciales"
          name="observaciones"
          rules={[{ required: false }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Notas iniciales sobre el procedimiento (opcional)"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModalNuevoEstudio;
