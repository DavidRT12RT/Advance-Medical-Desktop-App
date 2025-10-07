import React from 'react';
import { Button, Space } from 'antd';
import { PlusOutlined, SaveOutlined, DeleteOutlined, CloseOutlined, SearchOutlined } from '@ant-design/icons';

interface AccionesPacienteProps {
  mode: 'view' | 'create' | 'edit';
  onNew: () => void;
  onSave: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onSearch?: () => void;
  loading?: boolean;
}

const AccionesPaciente: React.FC<AccionesPacienteProps> = ({
  mode,
  onNew,
  onSave,
  onDelete,
  onCancel,
  onSearch,
  loading = false,
}) => {
  return (
    <Space style={{ marginTop: '24px', width: '100%', justifyContent: 'flex-end' }}>
      {mode === 'view' && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onNew}
          size="large"
          style={{ minWidth: '150px' }}
        >
          Nuevo
        </Button>
      )}

      {(mode === 'create' || mode === 'edit') && (
        <>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={onSave}
            loading={loading}
            size="large"
            style={{ minWidth: '150px', backgroundColor: '#722ed1' }}
          >
            {mode === 'create' ? 'Crear' : 'Actualizar datos'}
          </Button>

          {mode === 'edit' && (
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={onDelete}
              loading={loading}
              size="large"
              style={{ minWidth: '150px' }}
            >
              Borrar
            </Button>
          )}

          {onSearch && (
            <Button
              icon={<SearchOutlined />}
              onClick={onSearch}
              size="large"
              style={{ minWidth: '150px', backgroundColor: '#722ed1', color: 'white' }}
            >
              Buscar
            </Button>
          )}

          <Button
            icon={<CloseOutlined />}
            onClick={onCancel}
            size="large"
            style={{ minWidth: '150px', backgroundColor: '#722ed1', color: 'white' }}
          >
            Cancelar
          </Button>
        </>
      )}
    </Space>
  );
};

export default AccionesPaciente;