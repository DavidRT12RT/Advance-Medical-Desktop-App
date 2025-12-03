import React, { useState } from "react";
import { useParams } from "react-router-dom";
import HeaderPacienteDetalle from "../components/pacientes-detalle/HeaderPacienteDetalle";
import InformacionPacienteDetalle from "../components/pacientes-detalle/InformacionPacienteDetalle";
import ConsultasPacienteDetalle from "../components/pacientes-detalle/ConsultasPacienteDetalle";
import ConsultasPendientesPacienteDetalle from "../components/pacientes-detalle/ConsultasPendientesPacienteDetalle";
import ModalConsultaPacienteDetalle from "../components/pacientes-detalle/ModalConsultaPacienteDetalle";
import RegistrosMedicosPacienteDetalle from "../components/pacientes-detalle/RegistrosMedicosPacienteDetalle";

const PacienteDetalle = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("informacion");

  const tabs = [
    { id: "informacion", label: "Información del Paciente" },
    { id: "historial", label: "Historial de Consultas" },
    { id: "proximos", label: "Próximos Tratamientos" },
    { id: "registros", label: "Registros Médicos" },
  ];

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
        {activeTab === "historial" && <ConsultasPacienteDetalle />}
        {activeTab === "proximos" && <ConsultasPendientesPacienteDetalle />}
        {activeTab === "registros" && <RegistrosMedicosPacienteDetalle />}
      </div>

      {/* Modal consulta*/}
      <ModalConsultaPacienteDetalle />
    </section>
  );
};

export default PacienteDetalle;
