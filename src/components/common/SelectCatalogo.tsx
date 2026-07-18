import React, { useState } from "react";
import { Button, Divider, Input, Select, Space } from "antd";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";

interface SelectCatalogoProps {
  items: string[];
  onAgregar: (valor: string) => void;
  onEliminar: (valor: string) => void;
  placeholder?: string;
  textoAgregar?: string;
  disabled?: boolean;
  // Inyectados por Form.Item
  value?: string;
  onChange?: (valor?: string) => void;
}

/**
 * Select con catálogo editable por el usuario: buscar, agregar entradas
 * nuevas desde el pie del dropdown y borrar entradas con el ícono de cada
 * opción. Pensado para usarse dentro de un Form.Item (recibe value/onChange).
 */
const SelectCatalogo: React.FC<SelectCatalogoProps> = ({
  items,
  onAgregar,
  onEliminar,
  placeholder,
  textoAgregar = "Agregar nuevo...",
  disabled,
  value,
  onChange,
}) => {
  const [nuevo, setNuevo] = useState("");

  const agregar = () => {
    const v = nuevo.trim();
    if (!v) return;
    onAgregar(v);
    setNuevo("");
  };

  return (
    <Select
      showSearch
      allowClear
      disabled={disabled}
      value={value || undefined}
      onChange={onChange}
      placeholder={placeholder}
      options={items.map((item) => ({ label: item, value: item }))}
      optionRender={(option) => (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate">{option.label}</span>
          <Button
            size="small"
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation();
              onEliminar(String(option.value));
            }}
          />
        </div>
      )}
      dropdownRender={(menu) => (
        <>
          {menu}
          <Divider style={{ margin: "8px 0" }} />
          <Space.Compact style={{ width: "100%", padding: "0 8px 8px" }}>
            <Input
              placeholder={textoAgregar}
              value={nuevo}
              onChange={(e) => setNuevo(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onPressEnter={agregar}
            />
            <Button type="primary" icon={<PlusOutlined />} onClick={agregar} />
          </Space.Compact>
        </>
      )}
    />
  );
};

export default SelectCatalogo;
