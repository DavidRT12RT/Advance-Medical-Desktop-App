import { Avatar, Button, Dropdown, Form, Skeleton, Tooltip } from "antd";
import {
  PlusOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";

import { useDispatch, useSelector } from "react-redux";
import {
  setDetalleDePaciente,
  setListaDePacientes,
  setLoading,
  setMode,
  setOpenDrawer,
  setOpenModalEstudios,
  setOpenModalConsultas,
  setRefresh,
} from "../../store/pacientesSlice";
import ModalPaciente from "../pacientes/ModalPaciente";

import DatosPaciente from "../pacientes/DatosPaciente";
import AntecedentePaciente from "../pacientes/AntecedentePaciente";
import dayjs from "dayjs";
import { cleanUndefinedValues } from "../../helpers/cleanUndefinedValues";
import { message } from "antd";
import FirebasePacientes from "../../features/FirebasePacientes";
import { useElectronStore } from "../../hooks/useElectronStore";

const HeaderPacienteDetalle = () => {
  const dispatch = useDispatch();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;

  const detalleDePaciente = useSelector(
    (state: any) => state.pacientes.detalleDePaciente
  );
  const loading = useSelector((state: any) => state.pacientes.loading);

  const [formDatosGenerales] = Form.useForm();
  const [formAntecedentes] = Form.useForm();

  const {
    mode,
    loading: loadingModal,
    openDrawer,
  } = useSelector((state: any) => state.pacientes);

  const steps = [
    {
      title: "Datos Generales",
      component: <DatosPaciente form={formDatosGenerales} />,
      form: formDatosGenerales,
    },
    {
      title: "Antecedentes",
      component: <AntecedentePaciente form={formAntecedentes} />,
      form: formAntecedentes,
    },
  ];

  const handleEditPaciente = async () => {
    try {
      let datosGenerales = await formDatosGenerales.validateFields();
      let antecedentes = await formAntecedentes.validateFields();

      datosGenerales = cleanUndefinedValues(datosGenerales);
      antecedentes = cleanUndefinedValues(antecedentes);

      // Formatear valores necesarios
      const fechaNacimiento = dayjs(datosGenerales.fechaNacimiento).format(
        "YYYY-MM-DD"
      );
      const values = { ...datosGenerales, ...antecedentes, fechaNacimiento };
      dispatch(setLoading(true));

      values.id = detalleDePaciente?.id || "";
      const pacienteActualizado =
        await FirebasePacientes.crearActualizarPaciente(empresaId, values);
      const pacientesActualizados = await FirebasePacientes.obtenerPacientes(
        empresaId
      );
      dispatch(setListaDePacientes(pacientesActualizados));
      message.success("Paciente actualizado exitosamente");
      dispatch(setDetalleDePaciente(pacienteActualizado));

      dispatch(setMode("view"));
      dispatch(setOpenDrawer(false));
      formDatosGenerales.resetFields();
      formAntecedentes.resetFields();
      dispatch(setLoading(false));
      dispatch(setRefresh(Math.random()));
    } catch (error) {
      console.error("Validation failed:", error);
      message.error("Error al guardar paciente");
      dispatch(setLoading(false));
    }
  };

  const getMenuItems = (): any[] => [
    {
      key: 0,
      label: "Editar paciente",
      icon: <EditOutlined />,
      onClick: () => {
        dispatch(setMode("edit"));
        dispatch(setOpenDrawer(true));
        const pacienteParaForm = {
          ...detalleDePaciente,
          fechaNacimiento: detalleDePaciente.fechaNacimiento
            ? dayjs(detalleDePaciente.fechaNacimiento as any)
            : null,
        };

        formDatosGenerales.setFieldsValue(pacienteParaForm);
        formAntecedentes.setFieldsValue(pacienteParaForm);
      },
    },
    {
      type: "divider",
    },
    {
      key: "4",
      label: <a>Eliminar paciente</a>,
      icon: <DeleteOutlined />,
    },
  ];

  if (loading) {
    return <Skeleton />;
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Avatar size={50} />
        <h1
          style={{ fontSize: "28px", fontWeight: 600 }}
        >{`${detalleDePaciente?.nombres} ${detalleDePaciente?.apellidoPaterno} ${detalleDePaciente?.apellidoMaterno}`}</h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => dispatch(setOpenModalConsultas(true))}
        >
          Nueva consulta
        </Button>
        <Button
          type="default"
          icon={<PlusOutlined />}
          onClick={() => dispatch(setOpenModalEstudios(true))}
        >
          Nuevo estudio
        </Button>
        {/* Abrir menú de opciones */}
        <Dropdown
          menu={{
            items: getMenuItems(),
          }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Tooltip title="Acciones">
            <Button icon={<MoreOutlined />} />
          </Tooltip>
        </Dropdown>
      </div>
      <ModalPaciente
        visible={openDrawer}
        onCancel={() => dispatch(setOpenDrawer(false))}
        onDelete={() => dispatch(setOpenDrawer(false))}
        onCreate={handleEditPaciente}
        mode={mode}
        steps={steps}
        loading={loadingModal}
      />
    </div>
  );
};

export default HeaderPacienteDetalle;
