import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface SearchPacientesProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchPacientes: React.FC<SearchPacientesProps> = ({
  value,
  onChange,
  placeholder = 'Buscar por nombre, cédula, teléfono o email...',
}) => {
  return (
    <Input
      placeholder={placeholder}
      prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      size="large"
      allowClear
      style={{ maxWidth: '500px', marginBottom: '16px' }}
    />
  );
};

export default SearchPacientes;