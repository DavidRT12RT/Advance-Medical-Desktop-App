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
    detalleAnestesiologo,
    guardarDetalleAnestesiologo,
    loading,
  } = useCatalogosEstudio();

  const [nuevos, setNuevos] = useState<Partial<Record<ClaveCatalogo, string>>>(
    {},
  );
  // Alta de anestesiólogo con sus datos (cédula/especialidad opcionales)
  const [nuevoAnestesiologo, setNuevoAnestesiologo] = useState({
    nombre: "",
    cedula: "",
    especialidad: "",
  });
  const [editando, setEditando] = useState<{
    clave: ClaveCatalogo;
    valor: string;
    nuevo: string;
    cedula?: string;
    especialidad?: string;
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
    if (editando.clave === "anestesiologos") {
      const nombreFinal = (editando.nuevo || "").trim() || editando.valor;
      guardarDetalleAnestesiologo(nombreFinal, {
        cedula: editando.cedula || "",
        especialidad: editando.especialidad || "",
      });
    }
    setEditando(null);
  };

  const agregarAnestesiologo = () => {
    const nombre = nuevoAnestesiologo.nombre.trim();
    if (!nombre) return;
    agregarItem("anestesiologos", nombre);
    if (nuevoAnestesiologo.cedula || nuevoAnestesiologo.especialidad) {
      guardarDetalleAnestesiologo(nombre, {
        cedula: nuevoAnestesiologo.cedula.trim(),
        especialidad: nuevoAnestesiologo.especialidad.trim(),
      });
    }
    setNuevoAnestesiologo({ nombre: "", cedula: "", especialidad: "" });
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

                    const esAnestesiologo = clave === "anestesiologos";
                    const detalle = esAnestesiologo
                      ? detalleAnestesiologo(item)
                      : undefined;

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
                                      cedula:
                                        clave === "anestesiologos"
                                          ? detalleAnestesiologo(item)?.cedula ||
                                            ""
                                          : undefined,
                                      especialidad:
                                        clave === "anestesiologos"
                                          ? detalleAnestesiologo(item)
                                              ?.especialidad || ""
                                          : undefined,
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
                          esAnestesiologo ? (
                            <div className="flex flex-col gap-1 w-full pr-2">
                              <Input
                                size="small"
                                autoFocus
                                placeholder="Nombre completo"
                                value={editando.nuevo}
                                onChange={(e) =>
                                  setEditando({
                                    ...editando,
                                    nuevo: e.target.value,
                                  })
                                }
                              />
                              <div className="flex gap-1">
                                <Input
                                  size="small"
                                  placeholder="Cédula profesional"
                                  value={editando.cedula}
                                  onChange={(e) =>
                                    setEditando({
                                      ...editando,
                                      cedula: e.target.value,
                                    })
                                  }
                                />
                                <Input
                                  size="small"
                                  placeholder="Especialidad"
                                  value={editando.especialidad}
                                  onChange={(e) =>
                                    setEditando({
                                      ...editando,
                                      especialidad: e.target.value,
                                    })
                                  }
                                  onPressEnter={confirmarRenombre}
                                />
                              </div>
                            </div>
                          ) : (
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
                          )
                        ) : esAnestesiologo ? (
                          <div className="flex flex-col min-w-0">
                            <span className="truncate">{item}</span>
                            <span className="text-xs text-gray-400 truncate">
                              {detalle?.cedula || detalle?.especialidad
                                ? [
                                    detalle?.cedula
                                      ? `Céd. ${detalle.cedula}`
                                      : null,
                                    detalle?.especialidad,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ")
                                : "Sin cédula ni especialidad registradas"}
                            </span>
                          </div>
                        ) : (
                          <span className="truncate">{item}</span>
                        )}
                      </List.Item>
                    );
                  }}
                />
              )}

              {clave === "anestesiologos" ? (
                <div className="flex flex-col gap-1" style={{ marginTop: 8 }}>
                  <Input
                    placeholder="Nombre completo del anestesiólogo"
                    value={nuevoAnestesiologo.nombre}
                    onChange={(e) =>
                      setNuevoAnestesiologo((prev) => ({
                        ...prev,
                        nombre: e.target.value,
                      }))
                    }
                    onPressEnter={agregarAnestesiologo}
                  />
                  <Space.Compact style={{ width: "100%" }}>
                    <Input
                      placeholder="Cédula profesional (opcional)"
                      value={nuevoAnestesiologo.cedula}
                      onChange={(e) =>
                        setNuevoAnestesiologo((prev) => ({
                          ...prev,
                          cedula: e.target.value,
                        }))
                      }
                      onPressEnter={agregarAnestesiologo}
                    />
                    <Input
                      placeholder="Especialidad (opcional)"
                      value={nuevoAnestesiologo.especialidad}
                      onChange={(e) =>
                        setNuevoAnestesiologo((prev) => ({
                          ...prev,
                          especialidad: e.target.value,
                        }))
                      }
                      onPressEnter={agregarAnestesiologo}
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={agregarAnestesiologo}
                    />
                  </Space.Compact>
                </div>
              ) : (
                <Space.Compact style={{ width: "100%", marginTop: 8 }}>
                  <Input
                    placeholder="Agregar nuevo..."
                    value={nuevos[clave] || ""}
                    onChange={(e) =>
                      setNuevos((prev) => ({
                        ...prev,
                        [clave]: e.target.value,
                      }))
                    }
                    onPressEnter={() => agregar(clave)}
                  />
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => agregar(clave)}
                  />
                </Space.Compact>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CatalogosEstudioConfig;
