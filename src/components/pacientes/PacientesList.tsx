import React from 'react';
import { List, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';

interface Paciente {
  id: string;
  nombreCompleto: string;
  cedula?: string;
}

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
  return (
    <List
      style={{
        backgroundColor: '#fff',
        border: '1px solid #f0f0f0',
        borderRadius: '8px',
        maxHeight: '400px',
        overflowY: 'auto',
      }}
      loading={loading}
      dataSource={pacientes}
      renderItem={(paciente) => (
        <List.Item
          onClick={() => onSelectPaciente(paciente)}
          style={{
            cursor: 'pointer',
            backgroundColor: paciente.id === selectedPacienteId ? '#1890ff' : 'transparent',
            color: paciente.id === selectedPacienteId ? '#fff' : '#000',
            padding: '12px 16px',
          }}
        >
          <List.Item.Meta
            avatar={
              <Avatar
                icon={<UserOutlined />}
                style={{
                  backgroundColor: paciente.id === selectedPacienteId ? '#fff' : '#1890ff',
                  color: paciente.id === selectedPacienteId ? '#1890ff' : '#fff',
                }}
              />
            }
            title={
              <span
                style={{
                  color: paciente.id === selectedPacienteId ? '#fff' : '#000',
                  fontWeight: 500,
                }}
              >
                {paciente.nombreCompleto}
              </span>
            }
          />
        </List.Item>
      )}
    />
  );
};

export default PacientesList;