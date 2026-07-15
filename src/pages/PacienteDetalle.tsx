import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import HeaderPacienteDetalle from "../components/pacientes-detalle/HeaderPacienteDetalle";
import InformacionPacienteDetalle from "../components/pacientes-detalle/InformacionPacienteDetalle";
import EstudiosPacienteDetalle from "../components/pacientes-detalle/EstudiosPacienteDetalle";
import EstudiosPendientesPacienteDetalle from "../components/pacientes-detalle/EstudiosPendientesPacienteDetalle";
import ModalEstudioPacienteDetalle from "../components/pacientes-detalle/ModalEstudioPacienteDetalle";
import ConsultasPacienteDetalle from "../components/pacientes-detalle/ConsultasPacienteDetalle";
import ConsultasPendientesPacienteDetalle from "../components/pacientes-detalle/ConsultasPendientesPacienteDetalle";
import ModalConsultaPacienteDetalle from "../components/pacientes-detalle/ModalConsultaPacienteDetalle";
import RegistrosMedicosPacienteDetalle from "../components/pacientes-detalle/RegistrosMedicosPacienteDetalle";
import FirebasePacientes from "../features/FirebasePacientes";
import { Skeleton } from "antd";
import { useDispatch, useSelector } from "react-redux";
import {
  setDetalleDePaciente,
  setLoading,
  setRefresh,
} from "../store/pacientesSlice";
import { useElectronStore } from "../hooks/useElectronStore";

const PacienteDetalle = () => {
  const { id: pacienteId } = useParams<{ id: string }>();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;

  const [activeTab, setActiveTab] = useState("informacion");

  const tabs = [
    { id: "informacion", label: "Información del Paciente" },
    { id: "consultas", label: "Consultas" },
    { id: "consultas_pendientes", label: "Consultas Pendientes" },
    { id: "historial", label: "Historial de Estudios" },
    { id: "proximos", label: "Próximos Estudios" },
    { id: "registros", label: "Registros Médicos" },
  ];

  const dispatch = useDispatch();
  const detalleDePaciente = useSelector(
    (state: any) => state.pacientes.detalleDePaciente
  );
  const loading = useSelector((state: any) => state.pacientes.loading);
  const refresh = useSelector((state: any) => state.pacientes.refresh);

  useEffect(() => {
    const fetchPaciente = async () => {
      if (!pacienteId) {
        return;
      }

      try {
        const data = await FirebasePacientes.obtenerPacientePorId(
          empresaId,
          pacienteId
        );
        dispatch(setDetalleDePaciente(data));
      } catch (error) {
        console.error("Error obteniendo paciente:", error);
      } finally {
        dispatch(setLoading(false));
        dispatch(setRefresh(false));
      }
    };

    fetchPaciente();
  }, [empresaId, pacienteId, refresh]);

  if (loading) {
    return <Skeleton />;
  }

  if (!detalleDePaciente) {
    return <div>No se encontró el paciente</div>;
  }

  return (
    <section className="flex flex-col gap-6 p-5">
      <HeaderPacienteDetalle />

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-1 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? "text-blue-600 border-b-2 border-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg p-6">
        {activeTab === "informacion" && <InformacionPacienteDetalle />}
        {activeTab === "consultas" && <ConsultasPacienteDetalle />}
        {activeTab === "consultas_pendientes" && (
          <ConsultasPendientesPacienteDetalle />
        )}
        {activeTab === "historial" && <EstudiosPacienteDetalle />}
        {activeTab === "proximos" && <EstudiosPendientesPacienteDetalle />}
        {activeTab === "registros" && <RegistrosMedicosPacienteDetalle />}
      </div>

      {/* Modal estudio*/}
      <ModalEstudioPacienteDetalle />
      {/* Modal consulta*/}
      <ModalConsultaPacienteDetalle />
    </section>
  );
};

export default PacienteDetalle;
