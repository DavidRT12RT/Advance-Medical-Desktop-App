import { useState } from "react";
import { useAppSelector, useAppDispatch } from "../../store/hooks";
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
} from "antd";
import { useParams, useNavigate } from "react-router-dom";
import { setOpenModalEstudios, setRefresh } from "../../store/pacientesSlice";
import FirebaseEstudios from "../../features/FirebaseEstudios";
import { useElectronStore } from "../../hooks/useElectronStore";
import { TIPOS_ESTUDIO_OPTIONS } from "../../utils/tiposEstudio";

const ModalEstudioPacienteDetalle = () => {
  const isOpenModal = useAppSelector(
    (state) => state.pacientes.openModalEstudios
  );
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  const { id: pacienteId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;
  const userId = user?.usuarioDetail?.id;
  const [saving, setSaving] = useState(false);

  const handleCancel = () => {
    form.resetFields();
    dispatch(setOpenModalEstudios(false));
  };

  const handleSubmit = async (values: any) => {
    if (saving) return;
    try {
      setSaving(true);
      await form.validateFields();
      console.log("Datos de estudio básico:", values);

      if (!pacienteId) {
        console.error("No se encontró el ID del paciente en la ruta");
        message.error("No se pudo identificar al paciente para el estudio");
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
        pacienteId,
        estudioBasico,
        userId
      );

      message.success("Estudio creado exitosamente");
      handleCancel();
      dispatch(setRefresh(Math.random()));

      // Navegar al detalle del estudio recién creado (igual que el modal
      // de la vista de gestión de estudios)
      navigate(`/paciente-detalle/${pacienteId}/estudios/${nuevoEstudio.id}`);
    } catch (error) {
      console.error("Error al guardar estudio básico:", error);
      message.error("Error al crear el estudio");
    } finally {
      setSaving(false);
    }
  };

  console.log("isOpenModal:", isOpenModal);
  return (
    <Modal
      title="Crear Nuevo Estudio"
      open={isOpenModal}
      onCancel={handleCancel}
      width={600}
      footer={[
        <Button key="cancel" disabled={saving} onClick={handleCancel}>
          Cancelar
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={saving}
          onClick={() => form.submit()}
        >
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

export default ModalEstudioPacienteDetalle;
