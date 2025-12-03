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
import { setOpenModalConsultas } from "../../store/pacientesSlice";
import FirebaseConsultas from "../../features/FirebaseConsultas";

const ModalConsultaPacienteDetalle = () => {
  const isOpenModal = useAppSelector(
    (state) => state.pacientes.openModalConsultas
  );
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  const { id: pacienteId } = useParams<{ id: string }>();
  // TODO: Obtener empresaId del contexto de autenticación
  const empresaId = "GoFayqIW9MR718FzNpyzGUgaK283";

  const handleCancel = () => {
    form.resetFields();
    dispatch(setOpenModalConsultas(false));
  };

  const handleSubmit = async (values: any) => {
    try {
      await form.validateFields();
      console.log("Datos de consulta básica:", values);
      // Aquí iría la lógica para guardar la consulta básica

      if (!pacienteId) {
        console.error("No se encontró el ID del paciente en la ruta");
        message.error("No se pudo identificar al paciente para la consulta");
        return;
      }

      const fechaFormatoApi = values.fecha
        ? values.fecha.format("YYYY-MM-DD")
        : null;

      const consultaBasica = {
        tipo: values.tipo,
        fecha: fechaFormatoApi,
        observaciones: values.observaciones || "",
        estado: "pendiente",
      };

      await FirebaseConsultas.crearConsultaBasica(
        empresaId,
        pacienteId,
        consultaBasica
      );

      console.log("Consulta creada exitosamente");

      message.success("Consulta creada exitosamente");
      handleCancel();
    } catch (error) {
      console.error("Error al guardar consulta básica:", error);
      message.error("Error al crear la consulta");
    }
  };

  console.log("isOpenModal:", isOpenModal);
  return (
    <Modal
      title="Crear Nueva Consulta"
      open={isOpenModal}
      onCancel={handleCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancelar
        </Button>,
        <Button key="submit" type="primary" onClick={() => form.submit()}>
          Crear Consulta
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

export default ModalConsultaPacienteDetalle;
