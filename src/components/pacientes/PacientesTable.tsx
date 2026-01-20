import React from "react";
import { Table, Tag, Avatar } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { ColumnsType } from "antd/es/table";
import { Paciente } from "../../types/Paciente";

interface PacientesTableProps {
  pacientes: Paciente[];
  loading?: boolean;
}

const PacientesTable: React.FC<PacientesTableProps> = ({
  pacientes,
  loading = false,
}) => {
  const navigate = useNavigate();

  const columns: ColumnsType<Paciente> = [
    {
      title: "Paciente",
      key: "paciente",
      width: 250,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <Avatar icon={<UserOutlined />} size={40} />
          <div>
            <div className="font-semibold text-gray-900">
              {record.nombres} {record.apellidoPaterno} {record.apellidoMaterno}
            </div>
            <div className="text-xs text-gray-500">
              Cédula: {record.cedula || "N/A"}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Fecha de Nacimiento",
      dataIndex: "fechaNacimiento",
      key: "fechaNacimiento",
      width: 150,
      sorter: (a, b) => {
        if (!a.fechaNacimiento) return 1;
        if (!b.fechaNacimiento) return -1;
        return a.fechaNacimiento
          .toString()
          .localeCompare(b.fechaNacimiento.toString());
      },
      render: (fecha) => (
        <span className="text-sm font-medium">{fecha?.toString() || "-"}</span>
      ),
    },
    {
      title: "Sexo",
      dataIndex: "sexo",
      key: "sexo",
      width: 100,
      filters: [
        { text: "Masculino", value: "Masculino" },
        { text: "Femenino", value: "Femenino" },
      ],
      onFilter: (value, record) => record.sexo === value,
      render: (sexo) => (
        <Tag color={sexo === "Masculino" ? "blue" : "pink"}>
          {sexo || "N/A"}
        </Tag>
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      ellipsis: true,
      render: (email) => (
        <span className="text-sm text-gray-600">{email || "-"}</span>
      ),
    },
    {
      title: "Teléfono",
      dataIndex: "celular",
      key: "celular",
      width: 130,
      render: (celular) => (
        <span className="text-sm text-gray-600">{celular || "-"}</span>
      ),
    },
    {
      title: "Dirección",
      dataIndex: "direccion",
      key: "direccion",
      ellipsis: true,
      render: (direccion) => (
        <span className="text-sm text-gray-600">{direccion || "-"}</span>
      ),
    },
    {
      title: "Estado Civil",
      dataIndex: "estadoCivil",
      key: "estadoCivil",
      width: 120,
      render: (estadoCivil) => (
        <span className="text-sm">{estadoCivil || "-"}</span>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={pacientes}
      loading={loading}
      rowKey={(record) => record.id || ""}
      onRow={(record) => ({
        onClick: () => {
          if (record.id) {
            navigate(`/paciente-detalle/${record.id}`);
          }
        },
        style: { cursor: "pointer" },
      })}
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total: ${total} pacientes`,
        pageSizeOptions: ["10", "20", "50", "100"],
      }}
      scroll={{ x: 1000 }}
      bordered
      size="middle"
    />
  );
};

export default PacientesTable;
