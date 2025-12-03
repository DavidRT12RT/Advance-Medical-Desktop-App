import React, { useState } from "react";
import { Button, Input, Modal, Form } from "antd";
import { FilterFilled, SearchOutlined } from "@ant-design/icons";

interface SearchPacientesProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchPacientes: React.FC<SearchPacientesProps> = ({
  value,
  onChange,
  placeholder = "Buscar por nombre, cédula, teléfono o email...",
}) => {
  return (
    <div className="flex items-center gap-5">
      <Input
        placeholder={placeholder}
        prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        size="large"
        allowClear
      />
      {/* <Button type="primary" icon={<FilterFilled />} size="large">
        Filtros
      </Button> */}
    </div>
  );
};

export default SearchPacientes;
