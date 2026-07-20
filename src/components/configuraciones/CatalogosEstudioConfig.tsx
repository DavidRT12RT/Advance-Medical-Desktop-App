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
  CLAVES_CON_DETALLES,
  ClaveCatalogo,
} from "../../utils/catalogosEstudio";

const CLAVES = Object.keys(CATALOGOS_ESTUDIO_LABELS) as ClaveCatalogo[];

/** Placeholder del alta para las claves de personal médico con detalles. */
const PLACEHOLDERS_NOMBRE: Partial<Record<ClaveCatalogo, string>> = {
  medicosTratantes: "Nombre completo del médico tratante",
  anestesiologos: "Nombre completo del anestesiólogo",
};

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
    detalleDe,
    guardarDetalleDe,
    loading,
  } = useCatalogosEstudio();

  const [nuevos, setNuevos] = useState<Partial<Record<ClaveCatalogo, string>>>(
    {},
  );
  // Alta de personal médico con sus datos (cédula/especialidad opcionales)
  const [nuevosPersonal, setNuevosPersonal] = useState<
    Partial<
      Record<ClaveCatalogo, { nombre: string; cedula: string; especialidad: string }>
    >
  >({});
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
    if (CLAVES_CON_DETALLES[editando.clave]) {
      const nombreFinal = (editando.nuevo || "").trim() || editando.valor;
      guardarDetalleDe(editando.clave, nombreFinal, {
        cedula: editando.cedula || "",
        especialidad: editando.especialidad || "",
      });
    }
    setEditando(null);
  };

  const nuevoPersonalDe = (clave: ClaveCatalogo) =>
    nuevosPersonal[clave] || { nombre: "", cedula: "", especialidad: "" };

  const cambiarNuevoPersonal = (
    clave: ClaveCatalogo,
    parciales: Partial<{ nombre: string; cedula: string; especialidad: string }>,
  ) =>
    setNuevosPersonal((prev) => ({
      ...prev,
      [clave]: { ...nuevoPersonalDe(clave), ...parciales },
    }));

  const agregarPersonal = (clave: ClaveCatalogo) => {
    const datos = nuevoPersonalDe(clave);
    const nombre = datos.nombre.trim();
    if (!nombre) return;
    agregarItem(clave, nombre);
    if (datos.cedula || datos.especialidad) {
      guardarDetalleDe(clave, nombre, {
        cedula: datos.cedula.trim(),
        especialidad: datos.especialidad.trim(),
      });
    }
    setNuevosPersonal((prev) => ({
      ...prev,
      [clave]: { nombre: "", cedula: "", especialidad: "" },
    }));
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

                    const conDetalles = !!CLAVES_CON_DETALLES[clave];
                    const detalle = conDetalles
                      ? detalleDe(clave, item)
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
                                      cedula: conDetalles
                                        ? detalleDe(clave, item)?.cedula || ""
                                        : undefined,
                                      especialidad: conDetalles
                                        ? detalleDe(clave, item)
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
                          conDetalles ? (
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
                        ) : conDetalles ? (
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

              {CLAVES_CON_DETALLES[clave] ? (
                <div className="flex flex-col gap-1" style={{ marginTop: 8 }}>
                  <Input
                    placeholder={PLACEHOLDERS_NOMBRE[clave] || "Nombre completo"}
                    value={nuevoPersonalDe(clave).nombre}
                    onChange={(e) =>
                      cambiarNuevoPersonal(clave, { nombre: e.target.value })
                    }
                    onPressEnter={() => agregarPersonal(clave)}
                  />
                  <Space.Compact style={{ width: "100%" }}>
                    <Input
                      placeholder="Cédula profesional (opcional)"
                      value={nuevoPersonalDe(clave).cedula}
                      onChange={(e) =>
                        cambiarNuevoPersonal(clave, { cedula: e.target.value })
                      }
                      onPressEnter={() => agregarPersonal(clave)}
                    />
                    <Input
                      placeholder="Especialidad (opcional)"
                      value={nuevoPersonalDe(clave).especialidad}
                      onChange={(e) =>
                        cambiarNuevoPersonal(clave, {
                          especialidad: e.target.value,
                        })
                      }
                      onPressEnter={() => agregarPersonal(clave)}
                    />
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => agregarPersonal(clave)}
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
