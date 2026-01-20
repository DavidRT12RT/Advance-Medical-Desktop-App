import React, { useEffect, useRef } from 'react';
import { app } from './firebaseConfig';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { useElectronStore } from './hooks/useElectronStore';
import LicenseGate from './components/LicenseGate';
import Login from './components/Login';
import App from './App';
import { ConfigProvider } from 'antd';
import FirebaseLicense from './features/FirebaseLicense';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';

export default function Root() {
  const auth = getAuth(app); // <- Aqui inicializamos Firebase!!!!
  const firestore = getFirestore(app);
  const navigate = useNavigate();
  const userListenerRef = useRef(null); // Ref para guardar el unsubscribe del listener

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
        // Si el usuario ya está en el Electron Store, no hacer nada
        // El Login ya guardó el usuario con el perfil completo
        if (user && user.firebaseUID === firebaseUser.uid) {
          console.log("Usuario ya está autenticado en Electron Store");
          return;
        }

        // Si no está en el Electron Store, obtener información del usuario
        // (esto ocurre cuando se recarga la página)
        // El usuario DEBE estar en el perfil de la organización
        try {
          const idToken = firebaseUser.stsTokenManager.accessToken;
          const decodedToken = jwtDecode(idToken);

          const firebaseUID = firebaseUser.uid;
          const idEmpresa = decodedToken.idEmpresa;
          const idOrganizacion = decodedToken.idOrganizacion;

          if (!idEmpresa || !idOrganizacion) {
            await logout();
            return;
          }

          // Validar que la licencia actual sea compatible con la organización del usuario
          if (licenseData?.organizacion !== idOrganizacion) {
            console.error("La licencia actual no es compatible con la organización del usuario");
            await logout();
            return;
          }

          const perfil = await FirebaseLicense.obtenerPerfilDelUsuarioPorUID(
            firebaseUID,
            idEmpresa,
            idOrganizacion
          );

          if (!perfil) {
            await logout();
            return;
          }

          // Obtener datos completos de la organización y empresa
          const organizacion = await FirebaseLicense.obtenerOrganizacion(idEmpresa, idOrganizacion);
          const empresa = await FirebaseLicense.obtenerEmpresa(idEmpresa);

          if (!organizacion || !empresa) {
            console.error("Error al cargar datos de la organización o empresa");
            await logout();
            return;
          }

          // Guardar usuario en Electron Store con datos completos
          await setUser({
            usuarioDetail: {
              ...perfil,
              id: perfil.id,
              firebaseUID: firebaseUID,
              idOrganizacion,
            },
            organizacion: organizacion, // Objeto completo de la organización
            empresa: empresa, // Objeto completo de la empresa
            uid: firebaseUID,
            firebaseUID: firebaseUID,
          });

          navigate("/");
        } catch (error) {
          console.error("Error en autenticación:", error);
          await logout();
        }
      } else {
        // User logged out
        await logout();
      }
    });

    return () => unsub();
  }, [auth, setUser, logout, user]);

  // Real-time listener para observar cambios en el perfil del usuario
  useEffect(() => {
    // Solo establecer listener si el usuario está autenticado
    if (!user || !user.usuarioDetail?.id || !user.empresa?.id || !user.usuarioDetail?.idOrganizacion) {
      return;
    }

    const idEmpresa = user.empresa.id;
    const idOrganizacion = user.usuarioDetail.idOrganizacion;
    const idUsuario = user.usuarioDetail.id;

    // Referencia al documento del perfil del usuario
    const perfilRef = doc(
      firestore,
      'empresas',
      idEmpresa,
      'organizaciones',
      idOrganizacion,
      'perfiles',
      idUsuario
    );

    // Establecer listener en tiempo real
    const unsubscribe = onSnapshot(
      perfilRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const perfilActualizado = docSnapshot.data();

          // Actualizar Electron Store con los nuevos datos del perfil
          // Mantener objetos completos de organización y empresa
          setUser({
            ...user,
            usuarioDetail: {
              ...user.usuarioDetail,
              ...perfilActualizado,
              id: idUsuario,
              firebaseUID: user.firebaseUID,
              idOrganizacion: idOrganizacion,
            },
            // Mantener organizacion y empresa completas
            organizacion: user.organizacion,
            empresa: user.empresa,
          });
        }
      },
      (error) => {
        console.error("Error en listener del perfil del usuario:", error);
      }
    );

    // Guardar el unsubscribe en el ref
    userListenerRef.current = unsubscribe;

    // Cleanup: desuscribirse cuando el componente se desmonte o cambie el usuario
    return () => {
      if (userListenerRef.current) {
        console.log("Desconectando listener del perfil del usuario");
        userListenerRef.current();
        userListenerRef.current = null;
      }
    };
  }, [user?.usuarioDetail?.id, user?.empresa?.id, user?.usuarioDetail?.idOrganizacion, firestore, setUser]);

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

  console.log("User desde el ROOT:", user);

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
  // content = <App />;

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
