import React from "react";
import { Table, Tag, Badge } from "antd";
import { useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import {
  TIPOS_ESTUDIO_FILTERS,
  colorPorTipo,
} from "../../utils/tiposEstudio";

interface ConsultasListProps {
  consultas: any[];
  loading?: boolean;
}

const ConsultasList: React.FC<ConsultasListProps> = ({
  consultas,
  loading = false,
}) => {
  const navigate = useNavigate();

  const columns: ColumnsType<any> = [
    {
      title: "Paciente",
      key: "paciente",
      width: 200,
      render: (_, record) => (
        <div>
          <div className="font-semibold text-gray-900">
            {record.paciente?.nombre} {record.paciente?.apellido}
          </div>
          <div className="text-xs text-gray-500">
            {record.paciente?.sexo} | {record.paciente?.fechaNacimiento}
          </div>
        </div>
      ),
    },
    {
      title: "Fecha",
      dataIndex: "fecha",
      key: "fecha",
      width: 120,
      sorter: (a, b) => {
        const dateA = new Date(a.fecha || a.fechaRegistro || 0).getTime();
        const dateB = new Date(b.fecha || b.fechaRegistro || 0).getTime();
        return dateA - dateB;
      },
      render: (fecha) => (
        <span className="text-sm font-medium">{fecha || "-"}</span>
      ),
    },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 130,
      filters: TIPOS_ESTUDIO_FILTERS,
      onFilter: (value, record) => record.tipo === value,
      render: (tipo) => (
        <Tag color={colorPorTipo(tipo)}>{tipo || "Sin tipo"}</Tag>
      ),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 120,
      filters: [
        { text: "Completada", value: "completada" },
        { text: "En progreso", value: "en_progreso" },
        { text: "Pendiente", value: "pendiente" },
      ],
      onFilter: (value, record) => record.estado === value,
      render: (estado) => {
        let color = "default";
        let text = estado || "Sin estado";

        if (estado === "completada") {
          color = "success";
          text = "Completada";
        } else if (estado === "en_progreso") {
          color = "processing";
          text = "En progreso";
        } else if (estado === "pendiente") {
          color = "warning";
          text = "Pendiente";
        }

        return <Badge status={color as any} text={text} />;
      },
    },
    {
      title: "Resultado",
      dataIndex: "resultado",
      key: "resultado",
      width: 120,
      render: (resultado) => {
        if (!resultado) return <span className="text-gray-400">-</span>;
        return (
          <Tag color={resultado === "Normal" ? "green" : "red"}>
            {resultado}
          </Tag>
        );
      },
    },
    {
      title: "Diagnóstico",
      dataIndex: "diagnostico",
      key: "diagnostico",
      ellipsis: true,
      render: (diagnostico) => (
        <span className="text-sm text-gray-700">
          {diagnostico || "Sin diagnóstico"}
        </span>
      ),
    },
    {
      title: "Médico",
      dataIndex: "medico",
      key: "medico",
      width: 150,
      render: (medico) => (
        <span className="text-sm text-gray-600">
          {medico?.nombre || "No asignado"}
        </span>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={consultas}
      loading={loading}
      rowKey={(record) => record.id}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} consultas`,
      }}
      onRow={(record) => ({
        onClick: () => {
          if (record.pacienteId && record.id) {
            navigate(
              `/paciente-detalle/${record.pacienteId}/consultas/${record.id}`,
            );
          }
        },
        style: { cursor: "pointer" },
      })}
      scroll={{ x: 1200 }}
    />
  );
};

export default ConsultasList;
