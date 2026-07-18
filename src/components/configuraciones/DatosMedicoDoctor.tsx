import React, { useState, useEffect } from "react";
import { Form, Button, Input, Divider, message } from "antd";
import {
  SaveOutlined,
  IdcardOutlined,
  PhoneOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import FirebaseConfiguraciones from "../../features/FirebaseConfiguraciones";
import SectionTitle from "../common/SectionTitle";

interface DatosMedicoDoctorProps {
  idEmpresa: string;
  idOrganizacion: string;
  idUsuario: string;
  usuarioData?: any;
  onSave?: () => void;
}

const DatosMedicoDoctor: React.FC<DatosMedicoDoctorProps> = ({
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
    cargarDatos();
  }, [usuarioData, idEmpresa, idOrganizacion, idUsuario]);

  const cargarDatos = async () => {
    try {
      // Preferir lo último guardado en Firestore; la copia del perfil en la
      // sesión local se llena al iniciar sesión y puede venir desactualizada
      // o sin el objeto configuraciones (perfiles antiguos o self-service)
      let configuracionMedica =
        usuarioData?.configuraciones?.configuracionDatosMedicos || {};

      try {
        const configuracionesFrescas =
          await FirebaseConfiguraciones.obtenerConfiguracionesUsuario(
            idEmpresa,
            idOrganizacion,
            idUsuario
          );
        if (configuracionesFrescas?.configuracionDatosMedicos) {
          configuracionMedica = configuracionesFrescas.configuracionDatosMedicos;
        }
      } catch (error) {
        // Sin red: se usa la copia local (o el formulario vacío)
        console.warn("No se pudieron leer configuraciones frescas:", error);
      }

      form.setFieldsValue({
        cedula: configuracionMedica.cedula || "",
        especialidad: configuracionMedica.especialidad || "",
        numeroRegistro: configuracionMedica.numeroRegistro || "",
        institucionFormacion: configuracionMedica.institucionFormacion || "",
        aniosExperiencia: configuracionMedica.aniosExperiencia || "",
        telefonoContacto: configuracionMedica.telefonoContacto || "",
        emailProfesional: configuracionMedica.emailProfesional || "",
        consultorio: configuracionMedica.consultorio || "",
      });
    } catch (error) {
      console.error("Error cargando datos médicos:", error);
      messageApi.open({
        type: "error",
        content: "Error al cargar los datos médicos",
      });
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const values = await form.validateFields();

      await FirebaseConfiguraciones.actualizarDatosMedicoDoctor(
        idEmpresa,
        idOrganizacion,
        idUsuario,
        values
      );

      messageApi.open({
        type: "success",
        content: "Datos médicos guardados exitosamente",
      });
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error("Error guardando datos médicos:", error);
      messageApi.open({
        type: "error",
        content: "Error al guardar los datos médicos",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {contextHolder}
      {/* Sección: Información Profesional Requerida */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <SectionTitle
          title="Información Profesional Requerida"
          icon={<IdcardOutlined className="text-indigo-600" />}
        />
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <Form form={form} layout="vertical">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label={
                  <span className="text-sm font-medium">
                    Cédula Profesional
                  </span>
                }
                name="cedula"
                rules={[
                  {
                    required: true,
                    message: "La cédula profesional es requerida",
                  },
                ]}
              >
                <Input placeholder="Ej: 1234567" className="rounded" />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-sm font-medium">Especialidad</span>
                }
                name="especialidad"
                rules={[
                  { required: true, message: "La especialidad es requerida" },
                ]}
              >
                <Input
                  placeholder="Ej: Gastroenterología"
                  className="rounded"
                />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-sm font-medium">
                    Número de Registro
                  </span>
                }
                name="numeroRegistro"
                rules={[
                  {
                    required: true,
                    message: "El número de registro es requerido",
                  },
                ]}
              >
                <Input placeholder="Ej: REG-2024-001" className="rounded" />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-sm font-medium">
                    Institución de Formación
                  </span>
                }
                name="institucionFormacion"
              >
                <Input
                  placeholder="Ej: Universidad Nacional Autónoma de México"
                  className="rounded"
                />
              </Form.Item>
            </div>
          </Form>
        </div>
      </div>

      {/* Sección: Información de Contacto */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <SectionTitle
          title="Información de Contacto"
          icon={<PhoneOutlined className="text-indigo-600" />}
        />
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
          <Form form={form} layout="vertical">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label={
                  <span className="text-sm font-medium">
                    Teléfono de Contacto
                  </span>
                }
                name="telefonoContacto"
              >
                <Input placeholder="Ej: +502 7777-7777" className="rounded" />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-sm font-medium">Email Profesional</span>
                }
                name="emailProfesional"
                rules={[{ type: "email", message: "Email inválido" }]}
              >
                <Input
                  placeholder="Ej: doctor@hospital.com"
                  className="rounded"
                />
              </Form.Item>
            </div>
          </Form>
        </div>
      </div>

      {/* Sección: Información Adicional */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <SectionTitle
          title="Información Adicional"
          icon={<InfoCircleOutlined className="text-indigo-600" />}
        />
        <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
          <Form form={form} layout="vertical">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Form.Item
                label={
                  <span className="text-sm font-medium">
                    Años de Experiencia
                  </span>
                }
                name="aniosExperiencia"
              >
                <Input type="number" placeholder="Ej: 10" className="rounded" />
              </Form.Item>

              <Form.Item
                label={
                  <span className="text-sm font-medium">
                    Consultorio / Clínica
                  </span>
                }
                name="consultorio"
              >
                <Input placeholder="Ej: Clínica Central" className="rounded" />
              </Form.Item>
            </div>
          </Form>
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
        Guardar Datos Médicos
      </Button>
    </div>
  );
};

export default DatosMedicoDoctor;
