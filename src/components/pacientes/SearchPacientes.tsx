import React from "react";
import { Input, Select } from "antd";
import { SearchOutlined } from "@ant-design/icons";

const { Option } = Select;

interface SearchPacientesProps {
  value: string;
  onChange: (value: string) => void;
  sexoFiltro?: string;
  onSexoChange?: (value: string) => void;
  placeholder?: string;
}

const SearchPacientes: React.FC<SearchPacientesProps> = ({
  value,
  onChange,
  sexoFiltro = "",
  onSexoChange,
  placeholder = "Buscar por nombre, cédula, teléfono o email...",
}) => {
  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder={placeholder}
        prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="large"
        allowClear
      />
      {onSexoChange && (
        <div className="flex items-center gap-3">
          <Select
            placeholder="Sexo"
            value={sexoFiltro}
            onChange={onSexoChange}
            size="large"
            style={{ width: 200 }}
            allowClear
          >
            <Option value="">Todos</Option>
            <Option value="Masculino">Masculino</Option>
            <Option value="Femenino">Femenino</Option>
          </Select>
        </div>
      )}
    </div>
  );
};

export default SearchPacientes;
