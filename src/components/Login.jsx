import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { app } from '../firebaseConfig';
import { Button } from 'antd';
import logo from "../assets/logo.png";

export default function Login({ onLoggedIn }) {
  const auth = getAuth(app);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (onLoggedIn) onLoggedIn();
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
