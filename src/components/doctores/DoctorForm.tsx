import React from 'react';
import { Form, Input, Select, Row, Col, Upload, Button, Avatar } from 'antd';
import { UserOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

interface DoctorFormProps {
  form: any;
  onFinish: (values: any) => void;
  initialValues?: any;
  photoUrl?: string;
  onPhotoChange?: (file: UploadFile) => void;
}

const DoctorForm: React.FC<DoctorFormProps> = ({
  form,
  onFinish,
  initialValues,
  photoUrl,
  onPhotoChange,
}) => {
  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={initialValues}
      style={{ marginTop: '24px' }}
    >
      <Row gutter={16}>
        {/* Sección de foto */}
        <Col span={24} style={{ marginBottom: '24px', textAlign: 'center' }}>
          <Avatar
            size={120}
            icon={<UserOutlined />}
            src={photoUrl}
            style={{ marginBottom: '12px' }}
          />
          <br />
          <Upload
            maxCount={1}
            beforeUpload={() => false}
            onChange={(info) => onPhotoChange?.(info.file)}
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />}>Cargar foto</Button>
          </Upload>
        </Col>

        {/* Información básica */}
        <Col xs={24} md={12}>
          <Form.Item
            label="Nombre completo del médico"
            name="nombreCompleto"
            rules={[{ required: true, message: 'Por favor ingrese el nombre completo' }]}
          >
            <Input placeholder="Hector A Ruiz Cruz" />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item
            label="Cédula"
            name="cedula"
            rules={[{ required: true, message: 'Por favor ingrese la cédula' }]}
          >
            <Input placeholder="123456" />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item
            label="Password (solo número)"
            name="password"
            rules={[{ required: true, message: 'Por favor ingrese el password' }]}
          >
            <Input.Password placeholder="******" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Nombre del médico para el reporte"
            name="nombreReporte"
            rules={[{ required: true, message: 'Por favor ingrese el nombre para reporte' }]}
          >
            <Input placeholder="Hector Ruiz" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Especialidad"
            name="especialidad"
            rules={[{ required: true, message: 'Por favor seleccione la especialidad' }]}
          >
            <Input placeholder="Cirugía" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Alma Máter"
            name="almaMater"
          >
            <Input placeholder="Tec de Mty" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Nombre del consultorio"
            name="nombreConsultorio"
          >
            <Input placeholder="Hospital Angeles" />
          </Form.Item>
        </Col>

        <Col xs={24}>
          <Form.Item
            label="Calle y número del domicilio"
            name="domicilio"
          >
            <Input placeholder="Ave todos los Santos 9022" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Colonia"
            name="colonia"
          >
            <Input placeholder="Cumbre del Pacifico" />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item
            label="CP"
            name="codigoPostal"
          >
            <Input placeholder="22644" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Ciudad"
            name="ciudad"
          >
            <Input placeholder="Tijuana" />
          </Form.Item>
        </Col>

        <Col xs={24} md={6}>
          <Form.Item
            label="Teléfono consultorio o casa"
            name="telefonoConsultorio"
          >
            <Input placeholder="6644046297" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Celular"
            name="celular"
            rules={[{ required: true, message: 'Por favor ingrese el celular' }]}
          >
            <Input placeholder="6643640728" />
          </Form.Item>
        </Col>

        <Col xs={24} md={12}>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Por favor ingrese el email' },
              { type: 'email', message: 'Por favor ingrese un email válido' },
            ]}
          >
            <Input placeholder="hectorarcz@hotmail.com" />
          </Form.Item>
        </Col>

        <Col xs={24}>
          <Form.Item
            label="Bajo anabezado de reporte"
            name="encabezadoReporte"
          >
            <Input placeholder="Medicine" />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  );
};

export default DoctorForm;