import React, { useState, useEffect } from "react";
import { Form, Button, Checkbox, Divider, message } from "antd";
import {
  SaveOutlined,
  FileTextOutlined,
  MedicineBoxOutlined,
  RobotOutlined,
  UserOutlined,
} from "@ant-design/icons";
import FirebaseConfiguraciones from "../../features/FirebaseConfiguraciones";
import SectionTitle from "../common/SectionTitle";

interface ConfiguracionReporteProps {
  idEmpresa: string;
  idOrganizacion: string;
  idUsuario: string;
  usuarioData?: any;
  onSave?: () => void;
}

const sectionCheckboxStyle = "flex items-center";

const ConfiguracionReporte: React.FC<ConfiguracionReporteProps> = ({
  idEmpresa,
  idOrganizacion,
  idUsuario,
  usuarioData,
  onSave,
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    cargarConfiguraciones();
  }, [usuarioData]);

  const cargarConfiguraciones = () => {
    try {
      console.log(
        "El usuario Data que tenemos al momento de cargar las configuraciones",
        usuarioData
      );
      const configuracionReporte =
        usuarioData?.configuraciones?.configuracionReporte;

      console.log(
        "Configuraciones reporte que viene de la db",
        configuracionReporte
      );

      if (configuracionReporte) {
        form.setFieldsValue({
          configuracionReporte: configuracionReporte,
        });
      } else {
        // Valores por defecto
        form.setFieldsValue({
          configuracionReporte: {
            incluirDatosPaciente: true,
            incluirDatosClinica: true,
            incluirDatosMedico: true,
            incluirDatosAnestesiologo: false,
            incluirDatosAsistente: false,
            incluirResultado: true,
            incluirHallazgos: true,
            incluirPolipos: true,
            incluirMedicamentos: true,
            incluirComplicaciones: false,
            incluirSeguimiento: true,
            incluirSedacion: true,
            incluirEquipo: true,
            incluirAnalisisIA: true,
          },
        });
      }
    } catch (error) {
      console.error("Error cargando configuraciones:", error);
      messageApi.open({
        type: "error",
        content: "Error al cargar las configuraciones",
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = form.getFieldsValue(true);

      await FirebaseConfiguraciones.actualizarConfiguracionReporte(
        idEmpresa,
        idOrganizacion,
        idUsuario,
        values.configuracionReporte
      );

      messageApi.open({
        type: "success",
        content: "Configuración del reporte guardada exitosamente",
      });
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error("Error guardando configuraciones:", error);
      messageApi.open({
        type: "error",
        content: "Error al guardar la configuración del reporte",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {contextHolder}
      <Form form={form} layout="vertical">
        <div className="space-y-6">
          {/* Sección: Datos Generales */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <SectionTitle
              title="Datos Generales"
              icon={<UserOutlined className="text-indigo-600" />}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirDatosPaciente"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox disabled>Datos del paciente</Checkbox>
                </Form.Item>
                <span className="text-xs text-red-500 ml-1">(Obligatorio)</span>
              </div>
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirDatosClinica"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>Datos de la clínica</Checkbox>
                </Form.Item>
              </div>
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirDatosMedico"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>Médico tratante</Checkbox>
                </Form.Item>
              </div>
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirDatosAnestesiologo"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>Anestesiólogo</Checkbox>
                </Form.Item>
              </div>
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirDatosAsistente"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>Asistente</Checkbox>
                </Form.Item>
              </div>
            </div>
          </div>

          {/* Sección: Información Clínica */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <SectionTitle
              title="Información Clínica"
              icon={<MedicineBoxOutlined className="text-indigo-600" />}
            />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirResultado"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>Resultado general</Checkbox>
                </Form.Item>
              </div>
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirHallazgos"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>Hallazgos</Checkbox>
                </Form.Item>
              </div>
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirPolipos"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>Detalle de pólipos</Checkbox>
                </Form.Item>
              </div>
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirMedicamentos"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>Medicamentos</Checkbox>
                </Form.Item>
              </div>
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirComplicaciones"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>Complicaciones</Checkbox>
                </Form.Item>
              </div>
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirSeguimiento"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>Plan de seguimiento</Checkbox>
                </Form.Item>
              </div>
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirSedacion"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox disabled>Método de sedación</Checkbox>
                </Form.Item>
                <span className="text-xs text-red-500 ml-1">(Obligatorio)</span>
              </div>
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirEquipo"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>Equipo utilizado</Checkbox>
                </Form.Item>
              </div>
            </div>
          </div>

          {/* Sección: Análisis de IA */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <SectionTitle
              title="Análisis de IA"
              icon={<RobotOutlined className="text-indigo-600" />}
            />
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
              <div className={sectionCheckboxStyle}>
                <Form.Item
                  name={["configuracionReporte", "incluirAnalisisIA"]}
                  valuePropName="checked"
                  noStyle
                >
                  <Checkbox>
                    Incluir resultados del análisis de IA (CNN y LLM)
                  </Checkbox>
                </Form.Item>
              </div>
            </div>
          </div>

          {/* Botón de Guardar */}
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            size="large"
          >
            Guardar Configuración
          </Button>
        </div>
      </Form>
    </>
  );
};

export default ConfiguracionReporte;
