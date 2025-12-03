import React from "react";
import { List, Avatar, Skeleton } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { Paciente } from "../../types/Paciente";
import { useNavigate } from "react-router-dom";

interface PacientesListProps {
  pacientes: Paciente[];
  loading?: boolean;
  onSelectPaciente: (paciente: Paciente) => void;
  selectedPacienteId?: string;
}

const PacientesList: React.FC<PacientesListProps> = ({
  pacientes,
  loading = false,
  onSelectPaciente,
  selectedPacienteId,
}) => {
  const navigate = useNavigate();

  return (
    <List
      style={{
        backgroundColor: "#fff",
        border: "1px solid #f0f0f0",
        borderRadius: "8px",
        maxHeight: "400px",
        overflowY: "auto",
      }}
      loading={loading}
      dataSource={pacientes}
      renderItem={(paciente) => (
        <List.Item
          onClick={() => navigate(`/paciente-detalle/${paciente.id}`)}
          style={{
            cursor: "pointer",
            backgroundColor: "transparent",
            color: "#000",
            padding: "12px 16px",
          }}
          actions={[
            <a key="list-loadmore-edit">Editar</a>,
            <a
              key="list-loadmore-more"
              onClick={() => navigate(`/paciente-detalle/${paciente.id}`)}
            >
              Ver detalle
            </a>,
          ]}
        >
          <Skeleton avatar title={false} loading={loading} active></Skeleton>
          <List.Item.Meta
            avatar={<Avatar icon={<UserOutlined />} />}
            title={
              <span
                style={{
                  color: "#000",
                  fontWeight: "bold",
                }}
              >
                {`${paciente.nombres} ${paciente.apellidoPaterno} ${paciente.apellidoMaterno}`}
              </span>
            }
            description={
              <div className="flex gap-2 items-center">
                <p>{paciente.email}</p>
                <p>{paciente.cedula}</p>
                <p>{paciente.celular}</p>
              </div>
            }
          />
        </List.Item>
      )}
    />
  );
};

export default PacientesList;
