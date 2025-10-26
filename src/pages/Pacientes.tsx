import React, { useState } from 'react';
import { Form, message, Modal, Tabs, Row, Col } from 'antd';
import SearchPacientes from '../components/pacientes/SearchPacientes';
import PacientesList from '../components/pacientes/PacientesList';
import DatosPaciente from '../components/pacientes/DatosPaciente';
import AntecedentePaciente from '../components/pacientes/AntecedentePaciente';
import AccionesPaciente from '../components/pacientes/AccionesPaciente';


interface Paciente {
  id: string;
  nombreCompleto: string;
  fechaNacimiento?: string;
  sexo?: string;
  domicilio?: string;
  telefonoCasa?: string;
  celular?: string;
  email?: string;
  cedula?: string;
  familiarResponsable?: string;
  seguro?: string;
  antecedentesPatologicos?: string;
  antecedentesNoPatologicos?: string;
  antecedentesHeredoFamiliares?: string;
  alergias?: string;
  medicamentosActuales?: string;
  cirugiasPrevias?: string;
}

const Pacientes = () => {
  const [formDatosGenerales] = Form.useForm();
  const [formAntecedentes] = Form.useForm();
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('datosGenerales');
  const [pacientes, setPacientes] = useState<Paciente[]>([
    {
      id: '1',
      nombreCompleto: 'ENRIQUE PABLOS',
      fechaNacimiento: '09/07/2025',
      sexo: 'M',
      domicilio: 'AVE TODOS LOS SANTOS 9022',
      telefonoCasa: '6644046297',
      celular: '6643640728',
      email: 'ENRIQUE@SCALEFLOW.TECH',
      familiarResponsable: 'ESTEBAN PABLOS',
      seguro: 'GNP',
    },
  ]);
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [loading, setLoading] = useState(false);

  const filteredPacientes = pacientes.filter((paciente) => {
    const searchLower = searchText.toLowerCase();
    return (
      paciente.nombreCompleto.toLowerCase().includes(searchLower) ||
      paciente.cedula?.toLowerCase().includes(searchLower) ||
      paciente.email?.toLowerCase().includes(searchLower) ||
      paciente.celular?.toLowerCase().includes(searchLower)
    );
  });

  const handleSelectPaciente = (paciente: Paciente) => {
    setSelectedPaciente(paciente);
    setMode('edit');
    formDatosGenerales.setFieldsValue(paciente);
    formAntecedentes.setFieldsValue(paciente);
  };

  const handleNew = () => {
    setMode('create');
    setSelectedPaciente(null);
    formDatosGenerales.resetFields();
    formAntecedentes.resetFields();
    setActiveTab('datosGenerales');
  };

  const handleSave = async () => {
    try {
      const datosGenerales = await formDatosGenerales.validateFields();
      const antecedentes = await formAntecedentes.validateFields();
      const values = { ...datosGenerales, ...antecedentes };
      setLoading(true);

      setTimeout(() => {
        if (mode === 'create') {
          const newPaciente: Paciente = {
            ...values,
            id: Date.now().toString(),
          };
          setPacientes([...pacientes, newPaciente]);
          message.success('Paciente creado exitosamente');
        } else {
          const updatedPacientes = pacientes.map((pac) =>
            pac.id === selectedPaciente?.id ? { ...pac, ...values } : pac
          );
          setPacientes(updatedPacientes);
          message.success('Paciente actualizado exitosamente');
        }
        setMode('view');
        setSelectedPaciente(null);
        formDatosGenerales.resetFields();
        formAntecedentes.resetFields();
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: '¿Está seguro de eliminar este paciente?',
      content: 'Esta acción no se puede deshacer',
      okText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: () => {
        setLoading(true);
        setTimeout(() => {
          const updatedPacientes = pacientes.filter((pac) => pac.id !== selectedPaciente?.id);
          setPacientes(updatedPacientes);
          message.success('Paciente eliminado exitosamente');
          setMode('view');
          setSelectedPaciente(null);
          formDatosGenerales.resetFields();
          formAntecedentes.resetFields();
          setLoading(false);
        }, 1000);
      },
    });
  };

  const handleCancel = () => {
    setMode('view');
    setSelectedPaciente(null);
    formDatosGenerales.resetFields();
    formAntecedentes.resetFields();
  };

  const tabItems = [
    {
      key: 'datosGenerales',
      label: 'Datos Generales',
      children: <DatosPaciente form={formDatosGenerales} initialValues={selectedPaciente || undefined} />,
    },
    {
      key: 'antecedentes',
      label: 'Antecedentes',
      children: <AntecedentePaciente form={formAntecedentes} initialValues={selectedPaciente || undefined} />,
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>
        Gestión de Pacientes
      </h1>

      <Row gutter={24}>
        {/* Lista de pacientes (lado izquierdo) */}
        <Col xs={24} md={8}>
          <SearchPacientes value={searchText} onChange={setSearchText} />
          <PacientesList
            pacientes={filteredPacientes}
            loading={loading}
            onSelectPaciente={handleSelectPaciente}
            selectedPacienteId={selectedPaciente?.id}
          />
          <div style={{ marginTop: '12px', textAlign: 'center', color: '#8c8c8c' }}>
            Id del Paciente: {selectedPaciente?.id || '00001'}
          </div>
        </Col>

        {/* Formulario con tabs (lado derecho) */}
        <Col xs={24} md={16}>
          {mode === 'view' && !selectedPaciente ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#8c8c8c' }}>
              Seleccione un paciente de la lista o cree uno nuevo
            </div>
          ) : (
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              style={{ marginTop: mode === 'view' ? '0' : '0' }}
            />
          )}
        </Col>
      </Row>

      <AccionesPaciente
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

export default Pacientes;