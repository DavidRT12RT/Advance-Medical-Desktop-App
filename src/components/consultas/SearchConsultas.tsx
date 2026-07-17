import React from "react";
import { Input, Select, DatePicker } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { TIPOS_ESTUDIO } from "../../utils/tiposEstudio";

const { RangePicker } = DatePicker;
const { Option } = Select;

interface SearchConsultasProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  tipoFiltro: string;
  onTipoChange: (value: string) => void;
  estadoFiltro: string;
  onEstadoChange: (value: string) => void;
  fechaRango: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null;
  onFechaChange: (
    dates: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null,
  ) => void;
}

const SearchConsultas: React.FC<SearchConsultasProps> = ({
  searchText,
  onSearchChange,
  tipoFiltro,
  onTipoChange,
  estadoFiltro,
  onEstadoChange,
  fechaRango,
  onFechaChange,
}) => {
  return (
    <div className="flex flex-col gap-3">
      <Input
        placeholder="Buscar por nombre del paciente, tipo de consulta, diagnóstico..."
        prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
        value={searchText}
        onChange={(e) => onSearchChange(e.target.value)}
        size="large"
        allowClear
      />
      <div className="flex items-center gap-3">
        <Select
          placeholder="Tipo de consulta"
          value={tipoFiltro}
          onChange={onTipoChange}
          size="large"
          style={{ width: 200 }}
          allowClear
        >
          <Option value="">Todos los tipos</Option>
          {TIPOS_ESTUDIO.map((tipo) => (
            <Option key={tipo} value={tipo}>
              {tipo}
            </Option>
          ))}
        </Select>

        <Select
          placeholder="Estado"
          value={estadoFiltro}
          onChange={onEstadoChange}
          size="large"
          style={{ width: 200 }}
          allowClear
        >
          <Option value="">Todos los estados</Option>
          <Option value="completada">Completada</Option>
          <Option value="en_progreso">En progreso</Option>
          <Option value="pendiente">Pendiente</Option>
        </Select>

        <RangePicker
          value={fechaRango}
          onChange={onFechaChange}
          size="large"
          placeholder={["Fecha inicio", "Fecha fin"]}
          format="YYYY-MM-DD"
        />
      </div>
    </div>
  );
};

export default SearchConsultas;
