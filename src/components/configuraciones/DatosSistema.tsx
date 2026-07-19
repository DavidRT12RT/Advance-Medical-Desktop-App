import React from 'react';
import { Form, Input, Row, Col, Button } from 'antd';

interface DatosSistemaProps {
  form: any;
  initialValues?: any;
  onSave: () => void;
  loading?: boolean;
}

const DatosSistema: React.FC<DatosSistemaProps> = ({ form, initialValues, onSave, loading }) => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              label="Empresa"
              name="empresa"
              rules={[{ required: true, message: 'Por favor ingrese el nombre de la empresa' }]}
            >
              <Input placeholder="ADVANCE" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="Nombre del Responsable"
              name="nombreResponsable"
              rules={[{ required: true, message: 'Por favor ingrese el nombre del responsable' }]}
            >
              <Input placeholder="RAFAEL MARTINEZ GODINEZ" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="Calle y número del domicilio"
              name="domicilio"
            >
              <Input placeholder="MD 130" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Colonia"
              name="colonia"
            >
              <Input placeholder="NUEVA SANTA MARIA" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="Teléfono consultorio o casa"
              name="telefono"
            >
              <Input placeholder="50564620" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ type: 'email', message: 'Por favor ingrese un email válido' }]}
            >
              <Input placeholder="ALEJANDROEG88@GMAIL.COM" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="No. Serie del Producto"
              name="serieProducto"
            >
              <Input placeholder="VACAMED211212" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item
              label="No. Serie del equipo"
              name="serieEquipo"
            >
              <Input placeholder="HBYBL13ICNQMK00360FD" />
            </Form.Item>
          </Col>

          <Col span={24}>
            <Form.Item
              label="Anotar la clave enviada del registro del sistema"
              name="claveRegistro"
            >
              <Input.Password placeholder="Ingrese la clave de registro" />
            </Form.Item>
          </Col>

          <Col span={24} style={{ textAlign: 'center', marginTop: '24px' }}>
            <Button
              type="primary"
              size="large"
              onClick={onSave}
              loading={loading}
              style={{ 
                minWidth: '200px',
                height: '50px',
                backgroundColor: '#ff4d4f',
                borderColor: '#ff4d4f',
                fontSize: '18px',
                fontWeight: 500
              }}
            >
              Registrar Sistema
            </Button>
          </Col>
        </Row>
      </Form>
    </div>
  );
};

export default DatosSistema;