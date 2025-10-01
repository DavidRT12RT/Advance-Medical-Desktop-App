import { useEffect, useState, useCallback } from 'react';
import firebaseLicense from '../features/FirebaseLicense';

export const useElectronStore = () => {
  const [authData, setAuthData] = useState(null);
  const [licenseData, setLicenseData] = useState(null);
  const [loading, setLoading] = useState(true);

  //Aqui leemos los datos del disco y con esto podemos guardar persistencia de datos como licencia y usuario (perfil que es un doctor en si)
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true);
        const data = await window.electronStore.getAllData();
        // Validate license using FirebaseLicense service
        const isValid = await firebaseLicense.validateLicenseData(data.license);
        console.log('License validation result:', isValid);

        if (!isValid) {
          // Invalidate local license data
          await window.electronStore.setLicenseData({});
          setLicenseData(null);
        } else {
          setAuthData(data.auth);
          setLicenseData(data.license);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Helper functions with local state updates
  const electronStore = {
    // Auth methods
    setUser: useCallback(async (user) => {
      await window.electronStore.setUser(user);
      const updated = await window.electronStore.getAuthData();
      setAuthData(updated);
    }, []),

    logout: useCallback(async () => {
      await window.electronStore.logout();
      const updated = await window.electronStore.getAuthData();
      setAuthData(updated);
    }, []),

    setMachineId: useCallback(async (machineId) => {
      await window.electronStore.setMachineId(machineId);
      const updated = await window.electronStore.getAuthData();
      setAuthData(updated);
    }, []),

    // License methods
    setLicenseValid: useCallback(async (isValid, expiryDate, features) => {
      await window.electronStore.setLicenseValid(isValid, expiryDate, features);
      const updated = await window.electronStore.getLicenseData();
      setLicenseData(updated);
    }, []),

    setLicenseData: useCallback(async (licenseData) => {
      await window.electronStore.setLicenseData(licenseData);
      const updated = await window.electronStore.getLicenseData();
      setLicenseData(updated);
    }, []),

    // Utility methods
    isLicenseActiveWithGrace: useCallback(async () => {
      return await window.electronStore.isLicenseActiveWithGrace();
    }, []),

    getAllData: useCallback(async () => {
      return await window.electronStore.getAllData();
    }, [])
  };

  return {
    ...electronStore,
    // State
    authData,
    licenseData,
    loading,
    // Computed values
    user: authData?.user,
    isAuthenticated: authData?.isAuthenticated || false,
    machineId: authData?.machineId,
    isLicenseValid: licenseData?.isValid || false
  };
};
