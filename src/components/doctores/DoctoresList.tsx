import React from 'react';
import { Table, Avatar, Tag } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

interface Doctores {
  id: string;
  nombreCompleto: string;
  cedula: string;
  especialidad: string;
  telefono: string;
  email: string;
  ciudad: string;
}

interface DoctoresListProps {
  doctors: Doctores[];
  loading?: boolean;
  onSelectDoctor: (doctor: Doctores) => void;
  selectedDoctorId?: string;
}

const DoctoresList: React.FC<DoctoresListProps> = ({
  doctors,
  loading = false,
  onSelectDoctor,
  selectedDoctorId,
}) => {
  const columns: ColumnsType<Doctores> = [
    {
      title: 'Doctor',
      dataIndex: 'nombreCompleto',
      key: 'nombreCompleto',
      render: (text: string, record: Doctores) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
              Cédula: {record.cedula}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Especialidad',
      dataIndex: 'especialidad',
      key: 'especialidad',
      render: (text: string) => <Tag color="cyan">{text}</Tag>,
    },
    {
      title: 'Ciudad',
      dataIndex: 'ciudad',
      key: 'ciudad',
    },
    {
      title: 'Teléfono',
      dataIndex: 'telefono',
      key: 'telefono',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      ellipsis: true,
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={doctors}
      loading={loading}
      rowKey="id"
      pagination={{
        pageSize: 10,
        showSizeChanger: true,
        showTotal: (total) => `Total ${total} doctores`,
      }}
      onRow={(record) => ({
        onClick: () => onSelectDoctor(record),
        style: {
          cursor: 'pointer',
          backgroundColor: record.id === selectedDoctorId ? '#e6f7ff' : undefined,
        },
      })}
      style={{ marginTop: '16px' }}
    />
  );
};

export default DoctoresList;