import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";

interface HeaderEstudiosProps {
  onNew: () => void;
}

const HeaderEstudios: React.FC<HeaderEstudiosProps> = ({ onNew }) => {
  return (
    <div className="flex items-center justify-between">
      <h1 style={{ fontSize: "28px", fontWeight: 600 }}>Gestión de Estudios</h1>
      <Button type="primary" icon={<PlusOutlined />} onClick={onNew}>
        Nuevo estudio
      </Button>
    </div>
  );
};

export default HeaderEstudios;
