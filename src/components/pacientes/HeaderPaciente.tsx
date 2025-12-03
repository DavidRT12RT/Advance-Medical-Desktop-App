import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

interface HeaderPacienteProps {
  onNew: () => void;
}

const HeaderPaciente: React.FC<HeaderPacienteProps> = ({ onNew }) => {
  return (
    <div className="flex items-center justify-between">
      <h1 style={{ fontSize: "24px", fontWeight: 600 }}>
        Gestión de Pacientes
      </h1>
      <Button type="primary" icon={<PlusOutlined />} onClick={onNew}>
        Nuevo paciente
      </Button>
    </div>
  );
};

export default HeaderPaciente;
