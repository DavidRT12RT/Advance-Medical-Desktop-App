import React, { useState } from "react";
import {
  Button,
  Card,
  Empty,
  Input,
  List,
  Popconfirm,
  Skeleton,
  Space,
  Tooltip,
} from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { useCatalogosEstudio } from "../../hooks/useCatalogosEstudio";
import {
  CATALOGOS_ESTUDIO_DEFAULTS,
  CATALOGOS_ESTUDIO_LABELS,
  ClaveCatalogo,
} from "../../utils/catalogosEstudio";

const CLAVES = Object.keys(CATALOGOS_ESTUDIO_LABELS) as ClaveCatalogo[];

/**
 * Administración de los listados personalizables del estudio (procedimientos,
 * motivos, personal, equipo, sedación): agregar, renombrar, borrar y
 * restaurar los valores sugeridos. Cada médico edita solo sus listados.
 */
const CatalogosEstudioConfig = () => {
  const {
    items,
    agregarItem,
    eliminarItem,
    renombrarItem,
    restaurarSugeridos,
    loading,
  } = useCatalogosEstudio();

  const [nuevos, setNuevos] = useState<Partial<Record<ClaveCatalogo, string>>>(
    {},
  );
  const [editando, setEditando] = useState<{
    clave: ClaveCatalogo;
    valor: string;
    nuevo: string;
  } | null>(null);

  if (loading) {
    return <Skeleton active paragraph={{ rows: 8 }} />;
  }

  const agregar = (clave: ClaveCatalogo) => {
    const valor = (nuevos[clave] || "").trim();
    if (!valor) return;
    agregarItem(clave, valor);
    setNuevos((prev) => ({ ...prev, [clave]: "" }));
  };

  const confirmarRenombre = () => {
    if (!editando) return;
    renombrarItem(editando.clave, editando.valor, editando.nuevo);
    setEditando(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-600">
        Estos listados alimentan los campos del estudio y son personales de tu
        usuario. Renombrar o borrar una entrada no modifica los estudios ya
        guardados con ella.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CLAVES.map((clave) => {
          const lista = items(clave);
          const tieneSugeridos =
            (CATALOGOS_ESTUDIO_DEFAULTS[clave] ?? []).length > 0;

          return (
            <Card
              key={clave}
              size="small"
              title={CATALOGOS_ESTUDIO_LABELS[clave]}
              extra={
                tieneSugeridos && (
                  <Tooltip title="Reincorporar los valores sugeridos que hayas borrado">
                    <Button
                      size="small"
                      type="text"
                      icon={<UndoOutlined />}
                      onClick={() => restaurarSugeridos(clave)}
                    >
                      Restaurar sugeridos
                    </Button>
                  </Tooltip>
                )
              }
            >
              {lista.length === 0 ? (
                <Empty
                  description="Sin entradas"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ) : (
                <List
                  size="small"
                  dataSource={lista}
                  renderItem={(item) => {
                    const enEdicion =
                      editando?.clave === clave && editando.valor === item;

                    return (
                      <List.Item
                        actions={
                          enEdicion
                            ? [
                                <Button
                                  key="ok"
                                  size="small"
                                  type="text"
                                  icon={<CheckOutlined />}
                                  onClick={confirmarRenombre}
                                />,
                                <Button
                                  key="cancel"
                                  size="small"
                                  type="text"
                                  icon={<CloseOutlined />}
                                  onClick={() => setEditando(null)}
                                />,
                              ]
                            : [
                                <Button
                                  key="edit"
                                  size="small"
                                  type="text"
                                  icon={<EditOutlined />}
                                  onClick={() =>
                                    setEditando({
                                      clave,
                                      valor: item,
                                      nuevo: item,
                                    })
                                  }
                                />,
                                <Popconfirm
                                  key="delete"
                                  title="¿Borrar esta entrada?"
                                  okText="Borrar"
                                  cancelText="Cancelar"
                                  onConfirm={() => eliminarItem(clave, item)}
                                >
                                  <Button
                                    size="small"
                                    type="text"
                                    danger
                                    icon={<DeleteOutlined />}
                                  />
                                </Popconfirm>,
                              ]
                        }
                      >
                        {enEdicion ? (
                          <Input
                            size="small"
                            autoFocus
                            value={editando.nuevo}
                            onChange={(e) =>
                              setEditando({
                                ...editando,
                                nuevo: e.target.value,
                              })
                            }
                            onPressEnter={confirmarRenombre}
                          />
                        ) : (
                          <span className="truncate">{item}</span>
                        )}
                      </List.Item>
                    );
                  }}
                />
              )}

              <Space.Compact style={{ width: "100%", marginTop: 8 }}>
                <Input
                  placeholder="Agregar nuevo..."
                  value={nuevos[clave] || ""}
                  onChange={(e) =>
                    setNuevos((prev) => ({ ...prev, [clave]: e.target.value }))
                  }
                  onPressEnter={() => agregar(clave)}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => agregar(clave)}
                />
              </Space.Compact>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CatalogosEstudioConfig;
