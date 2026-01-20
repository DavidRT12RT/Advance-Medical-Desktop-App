import React from "react";
import { Table, Tag, Badge } from "antd";
import { useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";

interface EstudiosListProps {
  estudios: any[];
  loading?: boolean;
}

const EstudiosList: React.FC<EstudiosListProps> = ({
  estudios,
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
      filters: [
        { text: "Colonoscopia", value: "Colonoscopia" },
        { text: "Endoscopia", value: "Endoscopia" },
      ],
      onFilter: (value, record) => record.tipo === value,
      render: (tipo) => (
        <Tag color={tipo === "Colonoscopia" ? "blue" : "green"}>
          {tipo || "Sin tipo"}
        </Tag>
      ),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      width: 120,
      filters: [
        { text: "Finalizado", value: "finalizado" },
        { text: "En progreso", value: "en_progreso" },
        { text: "Pendiente", value: "pendiente" },
      ],
      onFilter: (value, record) => record.estado === value,
      render: (estado) => {
        let color = "default";
        let text = estado || "Sin estado";

        if (estado === "finalizado") {
          color = "success";
          text = "Finalizado";
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
      ellipsis: true,
      render: (resultado) => {
        const isNormal = (resultado || "").toLowerCase() === "normal";
        return (
          <Tag
            color={isNormal ? "green" : "orange"}
            style={{ maxWidth: "100%" }}
          >
            {resultado || "Sin resultado"}
          </Tag>
        );
      },
    },
    {
      title: "Índice de Riesgo",
      dataIndex: "indiceRiesgo",
      key: "indiceRiesgo",
      width: 130,
      sorter: (a, b) => (a.indiceRiesgo || 0) - (b.indiceRiesgo || 0),
      render: (indiceRiesgo) => {
        if (indiceRiesgo === undefined || indiceRiesgo === null) {
          return <span className="text-gray-400">-</span>;
        }

        let color = "text-green-600";
        if (indiceRiesgo >= 70) {
          color = "text-red-600";
        } else if (indiceRiesgo >= 40) {
          color = "text-orange-600";
        }

        return (
          <span className={`font-bold text-lg ${color}`}>{indiceRiesgo}%</span>
        );
      },
    },
    {
      title: "Hallazgos",
      dataIndex: "hallazgos",
      key: "hallazgos",
      ellipsis: true,
      render: (hallazgos) => (
        <span className="text-sm text-gray-600">
          {hallazgos || "Sin hallazgos"}
        </span>
      ),
    },
    {
      title: "Pólipo",
      dataIndex: "polipo",
      key: "polipo",
      width: 150,
      render: (polipo) => <span className="text-sm">{polipo || "-"}</span>,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={estudios}
      loading={loading}
      rowKey={(record) => `${record.paciente?.id}-${record.id}`}
      onRow={(record) => ({
        onClick: () => {
          if (record.paciente?.id && record.id) {
            navigate(
              `/paciente-detalle/${record.paciente.id}/estudios/${record.id}`
            );
          }
        },
        style: { cursor: "pointer" },
      })}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total: ${total} estudios`,
        pageSizeOptions: ["10", "20", "50", "100"],
      }}
      scroll={{ x: 1200 }}
      bordered
      size="middle"
    />
  );
};

export default EstudiosList;
