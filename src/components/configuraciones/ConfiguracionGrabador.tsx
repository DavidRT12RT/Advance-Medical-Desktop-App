import React from 'react';
import { Form, InputNumber, Button, Row, Col, Space, Select, Switch } from 'antd';

interface ConfiguracionGrabadorProps {
  form: any;
  initialValues?: any;
  onSave: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const ConfiguracionGrabador: React.FC<ConfiguracionGrabadorProps> = ({ 
  form, 
  initialValues, 
  onSave, 
  onCancel,
  loading 
}) => {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{
        border: '1px solid #d9d9d9',
        borderRadius: '8px',
        padding: '32px',
        backgroundColor: '#fafafa'
      }}>

        <Form form={form} layout="vertical" initialValues={initialValues}>
          <Row gutter={16}>

            {/* Sección de Grabador */}
            <Col span={24}>
            <h4 style={{ marginBottom: '16px', color: '#262626', fontWeight: 600 }}>Grabador de Video</h4>
            </Col>

            <Col span={24}>
              <Form.Item
                label="Cuadros por segundo"
                name="fps"
                rules={[{ required: true, message: 'Por favor ingrese los cuadros por segundo' }]}
              >
                <InputNumber
                  min={1}
                  max={120}
                  style={{ width: '100%' }}
                  placeholder="30"
                />
              </Form.Item>
            </Col>

            {/* Sección de IA */}
            <Col span={24} style={{ marginTop: '24px' }}>
              <h4 style={{ marginBottom: '16px', color: '#262626', fontWeight: 600 }}>Configuración de IA</h4>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Proveedor de IA"
                name="proveedorIA"
                rules={[{ required: true, message: 'Por favor seleccione un proveedor' }]}
              >
                <Select placeholder="Seleccione un proveedor">
                  <Select.Option value="openai">OpenAI (GPT-4)</Select.Option>
                  <Select.Option value="anthropic">Anthropic (Claude)</Select.Option>
                  <Select.Option value="google">Google (Gemini)</Select.Option>
                  <Select.Option value="local">Modelo Local</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Habilitar IA"
                name="habilitarIA"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Modelo"
                name="modelo"
              >
                <Select placeholder="Seleccione un modelo">
                  <Select.Option value="gpt-4-turbo">GPT-4 Turbo</Select.Option>
                  <Select.Option value="gpt-4">GPT-4</Select.Option>
                  <Select.Option value="gpt-3.5-turbo">GPT-3.5 Turbo</Select.Option>
                  <Select.Option value="claude-3-opus">Claude 3 Opus</Select.Option>
                  <Select.Option value="claude-3-sonnet">Claude 3 Sonnet</Select.Option>
                  <Select.Option value="gemini-pro">Gemini Pro</Select.Option>
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label="Idioma de respuesta"
                name="idioma"
              >
                <Select placeholder="Seleccione un idioma">
                  <Select.Option value="es">Español</Select.Option>
                  <Select.Option value="en">Inglés</Select.Option>
                  <Select.Option value="pt">Portugués</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Temperatura"
                name="temperatura"
                tooltip="Controla la creatividad de las respuestas (0-1)"
              >
                <InputNumber
                  min={0}
                  max={1}
                  step={0.1}
                  style={{ width: '100%' }}
                  placeholder="0.7"
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Max Tokens"
                name="maxTokens"
                tooltip="Número máximo de tokens en la respuesta"
              >
                <InputNumber
                  min={100}
                  max={8000}
                  style={{ width: '100%' }}
                  placeholder="2000"
                />
              </Form.Item>
            </Col>

            <Col span={24} style={{ textAlign: 'center', marginTop: '24px' }}>
              <Space size="middle">
                <Button
                  type="primary"
                  onClick={onSave}
                  loading={loading}
                  style={{ 
                    minWidth: '120px',
                    backgroundColor: '#722ed1',
                    borderColor: '#722ed1'
                  }}
                >
                  Guardar
                </Button>
                <Button
                  onClick={onCancel}
                  style={{ minWidth: '120px' }}
                >
                  Cerrar
                </Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </div>
    </div>
  );
};

export default ConfiguracionGrabador;