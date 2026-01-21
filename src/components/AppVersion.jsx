import React, { useState, useEffect } from 'react';

/**
 * Componente para mostrar la versión de la aplicación
 * Se puede usar en cualquier pantalla
 */
export default function AppVersion({ style = {}, className = '' }) {
  const [version, setVersion] = useState('');

  useEffect(() => {
    const getVersion = async () => {
      try {
        const ver = await window.updater?.getCurrentVersion();
        if (ver) {
          setVersion(ver);
        }
      } catch (error) {
        console.error('Error getting version:', error);
      }
    };
    getVersion();
  }, []);

  if (!version) return null;

  return (
    <div
      className={`app-version ${className}`}
      style={{
        fontSize: '12px',
        color: '#999',
        textAlign: 'center',
        ...style
      }}
    >
      v{version}
    </div>
  );
}
