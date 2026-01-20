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
import { useParams } from "react-router-dom";
import { setOpenModalEstudios } from "../../store/pacientesSlice";
import FirebaseEstudios from "../../features/FirebaseEstudios";
import { useElectronStore } from "../../hooks/useElectronStore";

const ModalEstudioPacienteDetalle = () => {
  const isOpenModal = useAppSelector(
    (state) => state.pacientes.openModalEstudios
  );
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  const { id: pacienteId } = useParams<{ id: string }>();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;

  const handleCancel = () => {
    form.resetFields();
    dispatch(setOpenModalEstudios(false));
  };

  const handleSubmit = async (values: any) => {
    try {
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

      await FirebaseEstudios.crearEstudioBasico(
        empresaId,
        pacienteId,
        estudioBasico
      );

      console.log("Estudio creado exitosamente");

      message.success("Estudio creado exitosamente");
      handleCancel();
    } catch (error) {
      console.error("Error al guardar estudio básico:", error);
      message.error("Error al crear el estudio");
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
              <Select
                options={[
                  { label: "Colonoscopia", value: "Colonoscopia" },
                  { label: "Endoscopia", value: "Endoscopia" },
                ]}
              />
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
