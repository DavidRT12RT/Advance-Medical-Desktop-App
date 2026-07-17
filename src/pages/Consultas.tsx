import React, { useState, useEffect } from "react";
import { message } from "antd";
import { useNavigate } from "react-router-dom";
import FirebaseConsultas from "../features/FirebaseConsultas";
import FirebasePacientes from "../features/FirebasePacientes";
import { useElectronStore } from "../hooks/useElectronStore";
import HeaderConsultas from "../components/consultas/HeaderConsultas";
import SearchConsultas from "../components/consultas/SearchConsultas";
import ConsultasList from "../components/consultas/ConsultasList";
import ModalNuevaConsulta from "../components/consultas/ModalNuevaConsulta";
import { nombreCompletoPaciente } from "../utils/nombrePaciente";
import dayjs from "dayjs";

const Consultas = () => {
  const navigate = useNavigate();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;
  const userId = user?.usuarioDetail?.id;

  const [loading, setLoading] = useState(true);
  const [consultas, setConsultas] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [fechaRango, setFechaRango] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchConsultas();
  }, [empresaId]);

  const fetchConsultas = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // Obtener todos los pacientes del usuario
      const pacientes = await FirebasePacientes.obtenerPacientes(
        empresaId,
        userId,
      );

      // Obtener consultas de cada paciente
      const todasLasConsultas: any[] = [];
      for (const paciente of pacientes) {
        if (!paciente.id) continue;
        try {
          const consultasPaciente =
            await FirebaseConsultas.obtenerConsultasDePaciente(
              empresaId,
              paciente.id,
              userId,
            );
          todasLasConsultas.push(...consultasPaciente);
        } catch (error) {
          console.error(
            `Error obteniendo consultas del paciente ${paciente.id}:`,
            error,
          );
        }
      }

      // Ordenar por fecha
      const sorted = todasLasConsultas.sort((a: any, b: any) => {
        const dateA = new Date(a.fecha || a.fechaRegistro || 0).getTime();
        const dateB = new Date(b.fecha || b.fechaRegistro || 0).getTime();
        return dateB - dateA;
      });

      setConsultas(sorted);
    } catch (error) {
      console.error("Error obteniendo todas las consultas:", error);
      message.error("Error al cargar consultas");
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setModalVisible(true);
  };

  const handleSuccess = () => {
    fetchConsultas();
  };

  const filteredConsultas = consultas.filter((consulta: any) => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch =
      nombreCompletoPaciente(consulta.paciente)
        .toLowerCase()
        .includes(searchLower) ||
      consulta.tipo?.toLowerCase().includes(searchLower) ||
      consulta.resultado?.toLowerCase().includes(searchLower) ||
      consulta.diagnostico?.toLowerCase().includes(searchLower) ||
      consulta.observaciones?.toLowerCase().includes(searchLower);

    const matchesTipo = !tipoFiltro || consulta.tipo === tipoFiltro;
    const matchesEstado = !estadoFiltro || consulta.estado === estadoFiltro;

    let matchesFecha = true;
    if (fechaRango && fechaRango[0] && fechaRango[1]) {
      const consultaFecha = dayjs(consulta.fecha || consulta.fechaRegistro);
      matchesFecha =
        consultaFecha.isAfter(fechaRango[0].startOf("day")) &&
        consultaFecha.isBefore(fechaRango[1].endOf("day"));
    }

    return matchesSearch && matchesTipo && matchesEstado && matchesFecha;
  });

  return (
    <div className="flex flex-col gap-4 p-5">
      <HeaderConsultas onNew={handleNew} />
      <SearchConsultas
        searchText={searchText}
        onSearchChange={setSearchText}
        tipoFiltro={tipoFiltro}
        onTipoChange={setTipoFiltro}
        estadoFiltro={estadoFiltro}
        onEstadoChange={setEstadoFiltro}
        fechaRango={fechaRango}
        onFechaChange={setFechaRango}
      />
      <ConsultasList consultas={filteredConsultas} loading={loading} />
      <ModalNuevaConsulta
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        onSuccess={handleSuccess}
      />
    </div>
  );
};

export default Consultas;
