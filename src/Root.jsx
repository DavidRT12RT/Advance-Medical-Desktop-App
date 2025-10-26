import React, { useEffect } from 'react';
import { app } from './firebaseConfig';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useElectronStore } from './hooks/useElectronStore';
import LicenseGate from './components/LicenseGate';
import Login from './components/Login';
import App from './App';
import { ConfigProvider } from 'antd';

export default function Root() {
  const auth = getAuth(app); // <- Aqui inicializamos Firebase!!!!

  // Electron Store with local state
  const {
    loading,
    user,
    isAuthenticated,
    licenseData,
    isLicenseValid,
    setUser,
    logout,
    machineId,
    setMachineId,
    setLicenseData
  } = useElectronStore();

  //Conseguimos el ID unico de la maquina
  useEffect(() => {
    const initializeMachine = async () => {
      try {
        const id = await window.device.getMachineId();
        await setMachineId(id);
      } catch (error) {
        console.error('Error initializing machine:', error);
      }
    };

    initializeMachine();
  }, [setMachineId]);

  // Watch Firebase auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User logged in - save to Electron Store
        await setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
        });
      } else {
        // User logged out
        await logout();
      }
    });

    return () => unsub();
  }, [auth, setUser, logout]);

  const handleLicensed = async (lic) => {
    try {
      // Ensure the saved license includes validity and machineId for immediate UI update
      await setLicenseData({
        ...lic,
        isValid: true,
        machineInfo: { ...(lic?.machineInfo || {}), machineId },
      });
    } catch (e) {
      console.error('Error setting license data from Root:', e);
    }
  };

  let content = null;
  if (loading) {
    content = (
      <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>Cargando…</div>
    );
  } else if (!isLicenseValid) {
    // Check license validity
    content = <LicenseGate machineId={machineId} onLicensed={handleLicensed} />;
  } else if (!isAuthenticated) {
    content = <Login />;
  } else {
    content = <App />;
  }
  
  content = <App />;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#009b9b',
        },
      }}
    >
      {content}
    </ConfigProvider>
  );
}
