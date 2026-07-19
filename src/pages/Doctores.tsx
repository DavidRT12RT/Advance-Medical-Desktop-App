import React, { useState } from "react";
import { Form, message, Modal } from "antd";
import SearchDoctores from "../components/doctores/SearchDoctores";
import DoctorList from "../components/doctores/DoctoresList";
import DoctorForm from "../components/doctores/DoctorForm";
import DoctorAccion from "../components/doctores/DoctorAccion";

interface Doctor {
  id: string;
  nombreCompleto: string;
  cedula: string;
  password: string;
  nombreReporte: string;
  especialidad: string;
  almaMater: string;
  nombreConsultorio: string;
  domicilio: string;
  colonia: string;
  codigoPostal: string;
  ciudad: string;
  telefonoConsultorio: string;
  celular: string;
  email: string;
  encabezadoReporte: string;
  photoUrl?: string;
}

const Doctores = () => {
  const [form] = Form.useForm();
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const [searchText, setSearchText] = useState("");
  const [doctors, setDoctors] = useState<Doctor[]>([
    {
      id: "1",
      nombreCompleto: "Hector A Ruiz Cruz",
      cedula: "123456",
      password: "******",
      nombreReporte: "Hector Ruiz",
      especialidad: "Cirugía",
      almaMater: "Tec de Mty",
      nombreConsultorio: "Hospital Angeles",
      domicilio: "Ave todos los Santos 9022",
      colonia: "Cumbre del Pacifico",
      codigoPostal: "22644",
      ciudad: "Tijuana",
      telefonoConsultorio: "6644046297",
      celular: "6643640728",
      email: "hectorarcz@hotmail.com",
      encabezadoReporte: "Medicine",
    },
  ]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(false);

  // Filtrar doctores basado en el texto de búsqueda
  const filteredDoctors = doctors.filter((doctor) => {
    const searchLower = searchText.toLowerCase();
    return (
      doctor.nombreCompleto.toLowerCase().includes(searchLower) ||
      doctor.cedula.toLowerCase().includes(searchLower) ||
      doctor.especialidad.toLowerCase().includes(searchLower) ||
      doctor.ciudad.toLowerCase().includes(searchLower) ||
      doctor.email.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setMode("edit");
    form.setFieldsValue(doctor);
  };

  const handleNew = () => {
    setMode("create");
    setSelectedDoctor(null);
    form.resetFields();
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      // Simular guardado
      setTimeout(() => {
        if (mode === "create") {
          const newDoctor: Doctor = {
            ...values,
            id: Date.now().toString(),
          };
          setDoctors([...doctors, newDoctor]);
          message.success("Doctor creado exitosamente");
        } else {
          const updatedDoctors = doctors.map((doc) =>
            doc.id === selectedDoctor?.id ? { ...doc, ...values } : doc
          );
          setDoctors(updatedDoctors);
          message.success("Doctor actualizado exitosamente");
        }
        setMode("view");
        setSelectedDoctor(null);
        form.resetFields();
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Validation failed:", error);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: "¿Está seguro de eliminar este doctor?",
      content: "Esta acción no se puede deshacer",
      okText: "Sí, eliminar",
      cancelText: "Cancelar",
      okButtonProps: { danger: true },
      onOk: () => {
        setLoading(true);
        setTimeout(() => {
          const updatedDoctors = doctors.filter(
            (doc) => doc.id !== selectedDoctor?.id
          );
          setDoctors(updatedDoctors);
          message.success("Doctor eliminado exitosamente");
          setMode("view");
          setSelectedDoctor(null);
          form.resetFields();
          setLoading(false);
        }, 1000);
      },
    });
  };

  const handleCancel = () => {
    setMode("view");
    setSelectedDoctor(null);
    form.resetFields();
  };

  return (
    <div>
      <h1 style={{ fontSize: "28px", fontWeight: 600, marginBottom: "16px" }}>
        Gestión de Doctores
      </h1>

      {mode === "view" ? (
        <>
          <SearchDoctores value={searchText} onChange={setSearchText} />
          <DoctorList
            // @ts-ignore
            doctors={filteredDoctors}
            loading={loading}
            // @ts-ignore
            onSelectDoctor={handleSelectDoctor}
            selectedDoctorId={selectedDoctor?.id}
          />
        </>
      ) : (
        <DoctorForm
          form={form}
          onFinish={handleSave}
          initialValues={selectedDoctor || undefined}
          photoUrl={selectedDoctor?.photoUrl}
        />
      )}

      <DoctorAccion
        mode={mode}
        onNew={handleNew}
        onSave={handleSave}
        onDelete={handleDelete}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  );
};

export default Doctores;
