import { useAppSelector, useAppDispatch } from "../../store/hooks";
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  message,
} from "antd";
import { useParams } from "react-router-dom";
import { setOpenModalConsultas, setRefresh } from "../../store/pacientesSlice";
import FirebaseConsultas from "../../features/FirebaseConsultas";
import { useElectronStore } from "../../hooks/useElectronStore";
import { TIPOS_ESTUDIO_OPTIONS } from "../../utils/tiposEstudio";

const ModalConsultaPacienteDetalle = () => {
  const isOpenModal = useAppSelector(
    (state) => state.pacientes.openModalConsultas
  );
  const detalleDePaciente = useAppSelector(
    (state) => state.pacientes.detalleDePaciente
  );
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  const { id: pacienteId } = useParams<{ id: string }>();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;
  const userId = user?.usuarioDetail?.id;

  const handleCancel = () => {
    form.resetFields();
    dispatch(setOpenModalConsultas(false));
  };

  const handleSubmit = async (values: any) => {
    try {
      await form.validateFields();

      if (!pacienteId) {
        console.error("No se encontró el ID del paciente en la ruta");
        message.error("No se pudo identificar al paciente para la consulta");
        return;
      }

      const fechaFormatoApi = values.fecha
        ? values.fecha.format("YYYY-MM-DD")
        : null;

      const consultaBasica = {
        pacienteId,
        paciente: {
          id: detalleDePaciente?.id || pacienteId,
          nombres: detalleDePaciente?.nombres || "",
          apellidoPaterno: detalleDePaciente?.apellidoPaterno || "",
          apellidoMaterno: detalleDePaciente?.apellidoMaterno || "",
          sexo: detalleDePaciente?.sexo || "",
          fechaNacimiento: detalleDePaciente?.fechaNacimiento || "",
        },
        tipo: values.tipo,
        fecha: fechaFormatoApi,
        motivo_consulta: values.motivo_consulta || "",
        notas: values.notas || "",
        hallazgos_generales: "",
        estado: "pendiente",
        medico: {
          id: userId || null,
          nombre: user?.usuarioDetail?.nombre || "Sin nombre",
        },
      };

      await FirebaseConsultas.crearConsultaBasica(
        empresaId,
        pacienteId,
        consultaBasica,
        userId
      );

      message.success("Consulta creada exitosamente");
      handleCancel();
      dispatch(setRefresh(Math.random()));
    } catch (error) {
      console.error("Error al guardar consulta básica:", error);
      message.error("Error al crear la consulta");
    }
  };

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
        <Form.Item
          label="Tipo de Consulta"
          name="tipo"
          rules={[{ required: true, message: "Selecciona el tipo" }]}
        >
          <Select
            placeholder="Seleccione tipo"
            options={TIPOS_ESTUDIO_OPTIONS}
          />
        </Form.Item>

        <Form.Item
          label="Fecha de Consulta"
          name="fecha"
          rules={[{ required: true, message: "Selecciona la fecha" }]}
        >
          <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
        </Form.Item>

        <Form.Item
          label="Motivo de Consulta"
          name="motivo_consulta"
          rules={[
            { required: true, message: "Ingresa el motivo de la consulta" },
          ]}
        >
          <Input.TextArea
            rows={2}
            placeholder="Motivo principal de la consulta"
          />
        </Form.Item>

        <Form.Item
          label="Notas Iniciales"
          name="notas"
          rules={[{ required: false }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="Notas u observaciones iniciales (opcional)"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModalConsultaPacienteDetalle;
