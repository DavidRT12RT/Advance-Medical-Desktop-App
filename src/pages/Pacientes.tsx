import { useEffect, useState } from "react";
import { Form, message, Modal } from "antd";
import SearchPacientes from "../components/pacientes/SearchPacientes";
import PacientesTable from "../components/pacientes/PacientesTable";
import DatosPaciente from "../components/pacientes/DatosPaciente";
import AntecedentePaciente from "../components/pacientes/AntecedentePaciente";
import FirebasePacientes from "../features/FirebasePacientes";
import { useDispatch, useSelector } from "react-redux";
import {
  setListaDePacientes,
  setDetalleDePaciente,
  setLoading,
  setMode,
  setOpenDrawer,
} from "../store/pacientesSlice";
import HeaderPaciente from "../components/pacientes/HeaderPaciente";
import ModalPaciente from "../components/pacientes/ModalPaciente";
import { Paciente } from "../types/Paciente";
import dayjs from "dayjs";
import { cleanUndefinedValues } from "../helpers/cleanUndefinedValues";
import { useElectronStore } from "../hooks/useElectronStore";

const Pacientes = () => {
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;

  const [formDatosGenerales] = Form.useForm();
  const [formAntecedentes] = Form.useForm();
  const [searchText, setSearchText] = useState("");

  const dispatch = useDispatch();
  const { mode, loading, openDrawer, listaDePacientes, detalleDePaciente } =
    useSelector((state: any) => state.pacientes);

  const filteredPacientes = listaDePacientes.filter((paciente: Paciente) => {
    const searchLower = searchText.toLowerCase();
    return (
      paciente.nombres?.toLowerCase().includes(searchLower) ||
      paciente.apellidoPaterno?.toLowerCase().includes(searchLower) ||
      paciente.apellidoMaterno?.toLowerCase().includes(searchLower) ||
      paciente.cedula?.toLowerCase().includes(searchLower) ||
      paciente.email?.toLowerCase().includes(searchLower) ||
      paciente.celular?.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    const obtenerPacientes = async () => {
      try {
        const pacientesData = await FirebasePacientes.obtenerPacientes(
          empresaId
        );
        dispatch(setListaDePacientes(pacientesData));
      } catch (error) {
        console.error("Error obteniendo pacientes:", error);
        message.error("Error al cargar pacientes");
      }
    };
    obtenerPacientes();
  }, [empresaId, dispatch]);

  const handleSelectPaciente = (paciente: Paciente) => {
    // Crear una copia del paciente para evitar modificar el objeto original (read-only)
    const pacienteEditado = {
      ...paciente,
      fechaNacimiento: dayjs(paciente.fechaNacimiento),
    };
    dispatch(setDetalleDePaciente(pacienteEditado));
    dispatch(setMode("edit"));
    dispatch(setOpenDrawer(true));
    formDatosGenerales.setFieldsValue(pacienteEditado);
    formAntecedentes.setFieldsValue(pacienteEditado);
  };

  const handleNew = () => {
    dispatch(setMode("create"));
    dispatch(setDetalleDePaciente(null));
    dispatch(setOpenDrawer(true));
    formDatosGenerales.resetFields();
    formAntecedentes.resetFields();
  };

  const handleSave = async () => {
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

      if (mode === "create") {
        const newPaciente: Paciente = {
          ...values,
        };
        const pacienteCreado = await FirebasePacientes.crearActualizarPaciente(
          empresaId,
          newPaciente
        );
        const pacientesActualizados = await FirebasePacientes.obtenerPacientes(
          empresaId
        );
        dispatch(setListaDePacientes(pacientesActualizados));
        dispatch(setDetalleDePaciente(pacienteCreado));
        message.success("Paciente creado exitosamente");
      } else {
        values.id = detalleDePaciente?.id || "";
        const pacienteActualizado =
          await FirebasePacientes.crearActualizarPaciente(empresaId, values);
        const pacientesActualizados = await FirebasePacientes.obtenerPacientes(
          empresaId
        );
        dispatch(setListaDePacientes(pacientesActualizados));
        message.success("Paciente actualizado exitosamente");
        dispatch(setDetalleDePaciente(pacienteActualizado));
      }

      dispatch(setMode("view"));
      dispatch(setOpenDrawer(false));
      formDatosGenerales.resetFields();
      formAntecedentes.resetFields();
      dispatch(setLoading(false));
    } catch (error) {
      console.error("Validation failed:", error);
      message.error("Error al guardar paciente");
      dispatch(setLoading(false));
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "¿Está seguro de eliminar este paciente?",
      content: "Esta acción no se puede deshacer",
      okText: "Sí, eliminar",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: async () => {
        dispatch(setLoading(true));
        try {
          await FirebasePacientes.eliminarPaciente(
            empresaId,
            detalleDePaciente?.id || ""
          );
          const pacientesActualizados =
            await FirebasePacientes.obtenerPacientes(empresaId);
          dispatch(setListaDePacientes(pacientesActualizados));
          dispatch(setMode("view"));
          formDatosGenerales.resetFields();
          formAntecedentes.resetFields();

          message.success(
            `${detalleDePaciente?.nombres} ${detalleDePaciente?.apellidoPaterno} ${detalleDePaciente?.apellidoMaterno} eliminado exitosamente`
          );
        } catch (error) {
          console.error("Error eliminando paciente:", error);
          message.error("Error al eliminar paciente");
        } finally {
          dispatch(setLoading(false));
        }
      },
    });
  };

  const handleCancel = () => {
    dispatch(setMode("view"));
    dispatch(setOpenDrawer(false));
    dispatch(setDetalleDePaciente(null));
    formDatosGenerales.resetFields();
    formAntecedentes.resetFields();
  };

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

  return (
    <div className="flex flex-col gap-4 p-5">
      <HeaderPaciente onNew={handleNew} />
      <SearchPacientes value={searchText} onChange={setSearchText} />
      <PacientesTable pacientes={filteredPacientes} loading={loading} />
      <ModalPaciente
        visible={openDrawer}
        onCancel={handleCancel}
        onDelete={handleDelete}
        onCreate={handleSave}
        mode={mode}
        steps={steps}
        loading={loading}
      />
    </div>
  );
};

export default Pacientes;
