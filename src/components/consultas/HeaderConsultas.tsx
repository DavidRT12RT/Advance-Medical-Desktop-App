import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

interface HeaderConsultasProps {
  onNew: () => void;
}

const HeaderConsultas: React.FC<HeaderConsultasProps> = ({ onNew }) => {
  return (
    <div className="flex items-center justify-between">
      <h1 style={{ fontSize: "28px", fontWeight: 600 }}>
        Gestión de Consultas
      </h1>
      <Button type="primary" icon={<PlusOutlined />} onClick={onNew}>
        Nueva consulta
      </Button>
    </div>
  );
};

export default HeaderConsultas;
