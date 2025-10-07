import React from 'react';
import { Input } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

interface SearchDoctoresProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchDoctores: React.FC<SearchDoctoresProps> = ({
  value,
  onChange,
  placeholder = 'Buscar por nombre, cédula, especialidad, ciudad o email...',
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

export default SearchDoctores;