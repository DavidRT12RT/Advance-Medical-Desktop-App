import React, { useState, useEffect } from "react";
import { message } from "antd";
import { useNavigate } from "react-router-dom";
import FirebaseEstudios from "../features/FirebaseEstudios";
import { useElectronStore } from "../hooks/useElectronStore";
import HeaderEstudios from "../components/estudios/HeaderEstudios";
import SearchEstudios from "../components/estudios/SearchEstudios";
import EstudiosList from "../components/estudios/EstudiosList";
import ModalNuevoEstudio from "../components/estudios/ModalNuevoEstudio";
import { nombreCompletoPaciente } from "../utils/nombrePaciente";
import dayjs from "dayjs";

const Estudios = () => {
  const navigate = useNavigate();
  const { user } = useElectronStore();
  const empresaId = user?.empresa?.id;
  const userId = user?.usuarioDetail?.id;

  const [loading, setLoading] = useState(true);
  const [estudios, setEstudios] = useState<any[]>([]);
  const [searchText, setSearchText] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("");
  const [fechaRango, setFechaRango] = useState<
    [dayjs.Dayjs | null, dayjs.Dayjs | null] | null
  >(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchEstudios();
  }, [empresaId]);

  const fetchEstudios = async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await FirebaseEstudios.obtenerTodosLosEstudios(
        empresaId,
        userId,
      );
      const sorted = data.sort((a: any, b: any) => {
        const dateA = new Date(a.fecha || a.fechaRegistro || 0).getTime();
        const dateB = new Date(b.fecha || b.fechaRegistro || 0).getTime();
        return dateB - dateA;
      });
      setEstudios(sorted as any[]);
    } catch (error) {
      console.error("Error obteniendo todos los estudios:", error);
      message.error("Error al cargar estudios");
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setModalVisible(true);
  };

  const filteredEstudios = estudios.filter((estudio: any) => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch =
      nombreCompletoPaciente(estudio.paciente)
        .toLowerCase()
        .includes(searchLower) ||
      estudio.tipo?.toLowerCase().includes(searchLower) ||
      estudio.resultado?.toLowerCase().includes(searchLower) ||
      estudio.hallazgos?.toLowerCase().includes(searchLower) ||
      estudio.polipo?.toLowerCase().includes(searchLower);

    const matchesTipo = !tipoFiltro || estudio.tipo === tipoFiltro;
    const matchesEstado = !estadoFiltro || estudio.estado === estadoFiltro;

    let matchesFecha = true;
    if (fechaRango && fechaRango[0] && fechaRango[1]) {
      const estudioFecha = dayjs(estudio.fecha || estudio.fechaRegistro);
      matchesFecha =
        estudioFecha.isAfter(fechaRango[0].startOf("day")) &&
        estudioFecha.isBefore(fechaRango[1].endOf("day"));
    }

    return matchesSearch && matchesTipo && matchesEstado && matchesFecha;
  });

  return (
    <div className="flex flex-col gap-4 p-5">
      <HeaderEstudios onNew={handleNew} />
      <SearchEstudios
        searchText={searchText}
        onSearchChange={setSearchText}
        tipoFiltro={tipoFiltro}
        onTipoChange={setTipoFiltro}
        estadoFiltro={estadoFiltro}
        onEstadoChange={setEstadoFiltro}
        fechaRango={fechaRango}
        onFechaChange={setFechaRango}
      />
      <EstudiosList estudios={filteredEstudios} loading={loading} />
      <ModalNuevoEstudio
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
      />
    </div>
  );
};

export default Estudios;
