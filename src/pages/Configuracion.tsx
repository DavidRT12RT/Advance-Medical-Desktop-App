import React, { useState } from 'react';
import { Form, message, Tabs } from 'antd';
import { SettingOutlined, VideoCameraOutlined } from '@ant-design/icons';
import DatosSistema from '../components/configuraciones/DatosSistema';
import ConfiguracionGrabador from '../components/configuraciones/ConfiguracionGrabador';

const Configuracion = () => {
  const [formSistema] = Form.useForm();
  const [formGrabador] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('sistema');

  const handleSaveSistema = async () => {
    try {
      const values = await formSistema.validateFields();
      setLoading(true);

      // Simular guardado
      setTimeout(() => {
        console.log('Datos del sistema:', values);
        message.success('Sistema registrado exitosamente');
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleSaveGrabador = async () => {
    try {
      const values = await formGrabador.validateFields();
      setLoading(true);

      // Simular guardado
      setTimeout(() => {
        console.log('Configuración de grabador e IA:', values);
        message.success('Configuración guardada exitosamente');
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancelGrabador = () => {
    formGrabador.resetFields();
    message.info('Cambios descartados');
  };

  const tabItems = [
    {
      key: 'sistema',
      label: (
        <span>
          <SettingOutlined />
          Datos del Sistema
        </span>
      ),
      children: (
        <DatosSistema
          form={formSistema}
          onSave={handleSaveSistema}
          loading={loading}
          initialValues={{
            empresa: 'ADVANCE',
            nombreResponsable: 'RAFAEL MARTINEZ GODINEZ',
            domicilio: 'MD 130',
            colonia: 'NUEVA SANTA MARIA',
            telefono: '50564620',
            email: 'ALEJANDROEG88@GMAIL.COM',
            serieProducto: 'VACAMED211212',
            serieEquipo: 'HBYBL13ICNQMK00360FD',
          }}
        />
      ),
    },
    {
      key: 'grabador',
      label: (
        <span>
          <VideoCameraOutlined />
          Configuración de Grabador
        </span>
      ),
      children: (
        <ConfiguracionGrabador
          form={formGrabador}
          onSave={handleSaveGrabador}
          onCancel={handleCancelGrabador}
          loading={loading}
          initialValues={{
            fps: 30,
            proveedorIA: 'openai',
            modelo: 'gpt-4-turbo',
            temperatura: 0.7,
            maxTokens: 2000,
            habilitarIA: true,
            idioma: 'es',
          }}
        />
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '16px' }}>
        Configuraciones del Sistema
      </h1>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginTop: '24px' }}
      />
    </div>
  );
};

export default Configuracion;