import { Avatar, Button, Dropdown, Tooltip } from "antd";
import {
  PlusOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
} from "@ant-design/icons";

import { useDispatch } from "react-redux";
import { setOpenModalConsultas } from "../../store/pacientesSlice";

const HeaderPacienteDetalle = () => {
  const dispatch = useDispatch();

  const getMenuItems = (): any[] => [
    {
      key: 0,
      label: "Editar paciente",
      icon: <EditOutlined />,
      onClick: () => {},
    },
    {
      type: "divider",
    },
    {
      key: "4",
      label: <a>Eliminar paciente</a>,
      icon: <DeleteOutlined />,
    },
  ];

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <Avatar size={50} />
        <h1 style={{ fontSize: "24px", fontWeight: 600 }}>
          David Arcos Melgarejo
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => dispatch(setOpenModalConsultas(true))}
        >
          Crear consulta
        </Button>
        {/* Abrir menú de opciones */}
        <Dropdown
          menu={{
            items: getMenuItems(),
          }}
          placement="bottomRight"
          trigger={["click"]}
        >
          <Tooltip title="Acciones">
            <Button icon={<MoreOutlined />} />
          </Tooltip>
        </Dropdown>
      </div>
    </div>
  );
};

export default HeaderPacienteDetalle;
