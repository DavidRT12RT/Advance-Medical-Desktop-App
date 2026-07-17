import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { jwtDecode } from 'jwt-decode';
import { app } from '../firebaseConfig';
import { Button, Modal } from 'antd';
import logo from "../assets/logo.png";
import FirebaseLicense from '../features/FirebaseLicense';
import { registrarUsuarioDesdeMaquina } from '../features/FirebaseRegistro';
import { useElectronStore } from '../hooks/useElectronStore';
import { useNavigate } from 'react-router-dom';
import AppVersion from './AppVersion';

export default function Login() {
  const auth = getAuth(app);
  const { setUser, licenseData, setLicenseData } = useElectronStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unlinking, setUnlinking] = useState(false);
  // Modal.confirm estático no funciona con React 19 + antd 5 (el modal nunca
  // se monta); hay que usar el hook con su contextHolder
  const [modal, contextHolder] = Modal.useModal();

  // Modo de la pantalla: iniciar sesión o crear cuenta (self-service en
  // máquinas con licencia vinculada)
  const [modo, setModo] = useState('login'); // 'login' | 'registro'
  const [regNombre, setRegNombre] = useState('');
  const [regTelefono, setRegTelefono] = useState('');
  const [regEspecialidad, setRegEspecialidad] = useState('');
  const [regPassword2, setRegPassword2] = useState('');

  const cambiarModo = (nuevo) => {
    setModo(nuevo);
    setError('');
  };

  const handleRegistro = async (e) => {
    e.preventDefault();
    setError('');

    if (!regNombre.trim()) {
      setError('Ingresa tu nombre completo');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== regPassword2) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      // 1. Crear cuenta de Auth + perfil en la organización de la licencia
      const perfil = await registrarUsuarioDesdeMaquina(
        {
          nombre: regNombre,
          email,
          password,
          telefono: regTelefono,
          especialidad: regEspecialidad,
        },
        licenseData,
      );

      // 2. Continuar con el mismo flujo post-login que un usuario normal
      const idEmpresa = perfil.idEmpresa;
      const idOrganizacion = perfil.idOrganizacion;

      const organizacion = await FirebaseLicense.obtenerOrganizacion(idEmpresa, idOrganizacion);
      const empresa = await FirebaseLicense.obtenerEmpresa(idEmpresa);

      if (!organizacion || !empresa) {
        setError('Cuenta creada, pero no se pudieron cargar los datos de la organización. Intenta iniciar sesión.');
        return;
      }

      await setUser({
        usuarioDetail: {
          ...perfil,
          id: perfil.id,
          firebaseUID: perfil.firebaseUID,
          idOrganizacion,
        },
        organizacion,
        empresa,
        uid: perfil.firebaseUID,
        firebaseUID: perfil.firebaseUID,
      });

      navigate('/');
    } catch (e2) {
      console.error(e2);
      setError(e2?.message || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const handleDesvincularLicencia = () => {
    modal.confirm({
      title: 'Desvincular licencia',
      content: 'Se desvinculará la licencia de esta computadora y podrás vincular otra. ¿Deseas continuar?',
      okText: 'Sí, desvincular',
      cancelText: 'Cancelar',
      okButtonProps: { danger: true },
      onOk: async () => {
        setUnlinking(true);
        setError('');
        try {
          // Liberar la licencia en Firestore para que pueda vincularse de nuevo
          if (licenseData?.id) {
            await FirebaseLicense.desvincularLicencia(licenseData.id);
          }
        } catch (e) {
          console.error('Error al desvincular la licencia en remoto:', e);
          // Continuamos: aunque falle el remoto, liberamos esta máquina localmente
        } finally {
          // Limpiar licencia local: Root volverá a mostrar LicenseGate
          try { localStorage.removeItem('licenseInfo'); } catch { }
          await setLicenseData({});
          setUnlinking(false);
        }
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await signInWithEmailAndPassword(auth, email, password);

      // Obtener el token del usuario
      const idToken = resp.user.stsTokenManager.accessToken;
      const decodedToken = jwtDecode(idToken);

      // Extraer datos del JWT. Los usuarios registrados desde esta máquina
      // (self-service) no tienen custom claims: se resuelve empresa y
      // organización desde la licencia vinculada a la máquina.
      const firebaseUID = resp.user.uid;
      const idEmpresa = decodedToken.idEmpresa || licenseData?.idEmpresa;
      const idOrganizacion = decodedToken.idOrganizacion || licenseData?.organizacion;


      // Obtener el perfil desde la estructura de organizaciones
      // El usuario DEBE estar en el perfil de la organización para poder iniciar sesión
      if (!idEmpresa || !idOrganizacion) {
        setError('El usuario NO esta en una organizacion medica (NO tiene un perfil registrado dentro de la organizacion)');
        setLoading(false);
        return;
      }

      const perfil = await FirebaseLicense.obtenerPerfilDelUsuarioPorUID(
        firebaseUID,
        idEmpresa,
        idOrganizacion
      );

      if (!perfil) {
        setError('Usuario no encontrado en la organización. Contacta al administrador.');
        setLoading(false);
        return;
      }

      //Checar si la licencia actual de la maquina es compatible con la organizacion del usuario que quiere logearse
      if (licenseData?.organizacion !== idOrganizacion) {
        setError('La licencia actual de la máquina no es compatible con la organización del usuario.');
        setLoading(false);
        return;
      }

      // Obtener datos completos de la organización y empresa
      const organizacion = await FirebaseLicense.obtenerOrganizacion(idEmpresa, idOrganizacion);
      const empresa = await FirebaseLicense.obtenerEmpresa(idEmpresa);

      if (!organizacion || !empresa) {
        setError('Error al cargar datos de la organización o empresa.');
        setLoading(false);
        return;
      }

      // Guardar usuario en Electron Store con datos completos
      const userData = {
        usuarioDetail: {
          ...perfil,
          id: perfil.id,
          firebaseUID: firebaseUID,
          idOrganizacion
        },
        organizacion: organizacion, // Objeto completo de la organización
        empresa: empresa, // Objeto completo de la empresa
        uid: firebaseUID,
        firebaseUID: firebaseUID,
      };

      await setUser(userData);
      console.log("Usuario guardado en Electron Store:", userData);
      navigate("/");

    } catch (e) {
      console.error(e);
      setError('Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100vh] w-full bg-gray-50 flex flex-col items-center justify-center p-6 gap-5">
      {contextHolder}
      <img src={logo} alt="Logo" width={200} height={200} />
      <div className="w-full max-w-md bg-white shadow-lg border border-gray-200 rounded-xl p-6 mx-auto">
        <h2 className="text-xl font-semibold text-gray-900">
          {modo === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {modo === 'login'
            ? 'Ingresa tus credenciales para continuar.'
            : 'Tu cuenta quedará registrada en la organización de esta máquina.'}
        </p>

        {modo === 'login' ? (
          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-700">Correo</label>
              <input
                type="email"
                className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#009b9b] focus:border-[#009b9b]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@dominio.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700">Contraseña</label>
              <input
                type="password"
                className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#009b9b] focus:border-[#009b9b]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                required
              />
            </div>
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            <div className="mt-2">
              <Button type="primary" htmlType="submit" loading={loading} className="w-full">
                Ingresar
              </Button>
            </div>
            <Button type="link" size="small" onClick={() => cambiarModo('registro')}>
              ¿Nuevo en el equipo? Crea tu cuenta aquí
            </Button>
          </form>
        ) : (
          <form onSubmit={handleRegistro} className="mt-5 flex flex-col gap-3">
            <div>
              <label className="block text-sm text-gray-700">Nombre completo *</label>
              <input
                type="text"
                className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#009b9b] focus:border-[#009b9b]"
                value={regNombre}
                onChange={(e) => setRegNombre(e.target.value)}
                placeholder="Dr. Juan Pérez"
                required
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-700">Teléfono</label>
                <input
                  type="tel"
                  className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#009b9b] focus:border-[#009b9b]"
                  value={regTelefono}
                  onChange={(e) => setRegTelefono(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-700">Especialidad</label>
                <input
                  type="text"
                  className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#009b9b] focus:border-[#009b9b]"
                  value={regEspecialidad}
                  onChange={(e) => setRegEspecialidad(e.target.value)}
                  placeholder="General"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-700">Correo *</label>
              <input
                type="email"
                className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#009b9b] focus:border-[#009b9b]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@dominio.com"
                required
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm text-gray-700">Contraseña *</label>
                <input
                  type="password"
                  className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#009b9b] focus:border-[#009b9b]"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm text-gray-700">Confirmar *</label>
                <input
                  type="password"
                  className="mt-1 w-full border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#009b9b] focus:border-[#009b9b]"
                  value={regPassword2}
                  onChange={(e) => setRegPassword2(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                />
              </div>
            </div>
            {error ? <div className="text-sm text-red-600">{error}</div> : null}
            <div className="mt-2">
              <Button type="primary" htmlType="submit" loading={loading} className="w-full">
                Crear cuenta e ingresar
              </Button>
            </div>
            <Button type="link" size="small" onClick={() => cambiarModo('login')}>
              ¿Ya tienes cuenta? Inicia sesión
            </Button>
          </form>
        )}

        <div className="mt-4 pt-4 border-t border-gray-200 flex flex-col items-center gap-1">
          <p className="text-xs text-gray-500">
            Licencia vinculada: <span className="font-mono">{licenseData?.claveLicencia || '—'}</span>
          </p>
          <Button type="link" size="small" danger loading={unlinking} onClick={handleDesvincularLicencia}>
            Desvincular licencia de esta computadora
          </Button>
        </div>
      </div>

      <AppVersion style={{ marginTop: '16px' }} />
    </div>
  );
}
