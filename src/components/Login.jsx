import { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { jwtDecode } from 'jwt-decode';
import { app } from '../firebaseConfig';
import { Button } from 'antd';
import logo from "../assets/logo.png";
import FirebaseLicense from '../features/FirebaseLicense';
import { useElectronStore } from '../hooks/useElectronStore';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const auth = getAuth(app);
  const { setUser, licenseData } = useElectronStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const resp = await signInWithEmailAndPassword(auth, email, password);

      // Obtener el token del usuario
      const idToken = resp.user.stsTokenManager.accessToken;
      const decodedToken = jwtDecode(idToken);

      // Extraer datos del JWT
      const firebaseUID = resp.user.uid;
      const idEmpresa = decodedToken.idEmpresa;
      const idOrganizacion = decodedToken.idOrganizacion;



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
      <img src={logo} alt="Logo" width={200} height={200} />
      <div className="w-full max-w-md bg-white shadow-lg border border-gray-200 rounded-xl p-6 mx-auto">
        <h2 className="text-xl font-semibold text-gray-900">Iniciar sesión</h2>
        <p className="text-sm text-gray-600 mt-1">Ingresa tus credenciales para continuar.</p>
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
        </form>
      </div>
    </div>
  );
}
