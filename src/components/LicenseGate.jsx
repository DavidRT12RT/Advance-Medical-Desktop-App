import React, { useEffect, useState } from 'react';
import { firestore, FIREBASE_TARGET } from '../firebaseConfig';
import { ejecutarDiagnostico } from '../utils/diagnosticoConexion';
import { doc, getDoc } from 'firebase/firestore';
import { Button, Tooltip } from 'antd';
import logo from "../assets/logo.png";
import FirebaseLicense from '../features/FirebaseLicense';
import AppVersion from './AppVersion';

export default function LicenseGate({ machineId, onLicensed }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [segments, setSegments] = useState(['', '', '']); // 3 grupos de 4
  const [diagResultados, setDiagResultados] = useState(null);
  const [diagLoading, setDiagLoading] = useState(false);

  const handleDiagnostico = async () => {
    setDiagLoading(true);
    setDiagResultados(null);
    try {
      const resultados = await ejecutarDiagnostico();
      setDiagResultados(resultados);
      console.log('[Diagnóstico]', resultados);
    } finally {
      setDiagLoading(false);
    }
  };
  // No usamos el hook de electron store aquí para evitar instancias separadas del estado

  useEffect(() => {
    const stored = localStorage.getItem('licenseInfo');
    if (stored) {
      const { licenseId } = JSON.parse(stored);
      if (licenseId) {
        revalidateExisting(licenseId).catch(() => { });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId]);

  const revalidateExisting = async (licenseId) => {
    try {
      if (!licenseId) return;
      setLoading(true);
      const ref = doc(firestore, 'licencias', licenseId);
      const snap = await getDoc(ref);
      if (!snap.exists()) throw new Error('La licencia local no existe');
      const lic = { id: snap.id, ...snap.data() };
      const today = new Date().toISOString().slice(0, 10);
      const boundMachineId = lic?.machineInfo?.machineId || lic?.machineId;
      const isActive = lic.estado === 'activa' && (!lic.fechaExpiracion || lic.fechaExpiracion >= today);

      if (isActive && boundMachineId && boundMachineId === machineId) {
        // Ya está vinculada a esta máquina, es válida
        localStorage.setItem('licenseInfo', JSON.stringify({ licenseId: lic.id }));
        onLicensed?.(lic);
        setError('');
      } else if (isActive && !boundMachineId) {
        // No la vinculamos automáticamente. Requiere que el usuario ingrese la clave para vincularla.
        setError('Esta licencia no está vinculada a esta máquina. Ingrese la clave para vincularla.');
      } else {
        setError('La licencia ya no es válida para esta máquina');
      }
    } catch (e) {
      console.error(e);
      // fall back to manual input
    } finally {
      setLoading(false);
    }
  };

  // Helpers de input segmentado (XXXX-XXXX-XXXX)
  const setSegmentValue = (index, value) => {
    setSegments((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSegmentChange = (e, index) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const value = raw.slice(0, 4);
    setSegmentValue(index, value);

    if (value.length === 4) {
      const nextInput = document.getElementById(`license-seg-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleSegmentKeyDown = (e, index) => {
    if (e.key === 'Backspace' && segments[index].length === 0) {
      const prevInput = document.getElementById(`license-seg-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    const text = (e.clipboardData.getData('text') || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!text) return;
    const chunked = [text.slice(0, 4), text.slice(4, 8), text.slice(8, 12)].map((s) => s || '');
    setSegments(chunked);
    // Enfocar el último que esté incompleto o el siguiente después del completado
    const idx = chunked.findIndex((s) => s.length < 4);
    const targetIdx = idx === -1 ? 2 : idx;
    const target = document.getElementById(`license-seg-${targetIdx}`);
    if (target) target.focus();
  };

  const licenseKey = `${segments[0]}-${segments[1]}-${segments[2]}`;

  const handleRegisterLicenseWithComputer = async () => {
    // Get electron store helpers
    // electron store helpers are initialized at component level
    try {
      setError('');
      if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(licenseKey)) {
        setError('Ingrese una clave con formato XXXX-XXXX-XXXX');
        return;
      }
      setLoading(true);
      console.log('[Licencia] Intentando vincular:', {
        clave: licenseKey,
        machineId,
        proyecto: FIREBASE_TARGET.projectId,
        db: FIREBASE_TARGET.database,
        version: navigator?.userAgent,
        timestamp: new Date().toISOString(),
      });
      // Recopilar informacion detallada de la computadora desde el proceso principal
      const deviceInfo = await (window.device?.getAllDeviceInfo?.() || Promise.resolve({}));
      const licencia = await FirebaseLicense.vincularComputadoraConLicencia(licenseKey, machineId, deviceInfo);
      console.log('[Licencia] Vinculación exitosa:', licencia?.claveLicencia, '→ doc', licencia?.id);

      try {
        if (licencia?.id) {
          localStorage.setItem('licenseInfo', JSON.stringify({ licenseId: licencia.id }));
        }
      } catch { }
      const enriched = {
        ...licencia,
        isValid: true,
        machineInfo: { ...(licencia?.machineInfo || {}), machineId },
      };
      onLicensed?.(enriched);
    } catch (e) {
      console.error(e);
      // Mostrar la causa real (ej. "La licencia no existe", "ya está vinculada",
      // o errores de conexión/permisos de Firebase) para poder diagnosticar
      setError(e?.message || 'Error al registrar la licencia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100vh] w-full bg-gray-50 flex flex-col items-center justify-center p-6 gap-5">
      <img src={logo} alt="Logo" width={200} height={200} />
      <div className="w-full max-w-md bg-white shadow-lg border border-gray-200 rounded-xl p-6 mx-auto">
        <h2 className="text-xl font-semibold text-gray-900">Vincular licencia</h2>
        <p className="text-sm text-gray-600 mt-1">
          Necesitamos validar y vincular una licencia con esta máquina antes de continuar.
        </p>

        <div className="mt-5 flex flex-col items-center gap-2">
          <div className="mt-2 flex items-center justify-center w-full gap-2" onPaste={handlePaste}>
            <input
              id="license-seg-0"
              inputMode="latin"
              className="w-16 text-center uppercase tracking-widest border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#009b9b] focus:border-[#009b9b]"
              placeholder="XXXX"
              value={segments[0]}
              onChange={(e) => handleSegmentChange(e, 0)}
              onKeyDown={(e) => handleSegmentKeyDown(e, 0)}
              maxLength={4}
              autoFocus
            />
            <span className="text-gray-400 select-none">-</span>
            <input
              id="license-seg-1"
              inputMode="latin"
              className="w-16 text-center uppercase tracking-widest border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#009b9b] focus:border-[#009b9b]"
              placeholder="XXXX"
              value={segments[1]}
              onChange={(e) => handleSegmentChange(e, 1)}
              onKeyDown={(e) => handleSegmentKeyDown(e, 1)}
              maxLength={4}
            />
            <span className="text-gray-400 select-none">-</span>
            <input
              id="license-seg-2"
              inputMode="latin"
              className="w-16 text-center uppercase tracking-widest border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-[#009b9b] focus:border-[#009b9b]"
              placeholder="XXXX"
              value={segments[2]}
              onChange={(e) => handleSegmentChange(e, 2)}
              onKeyDown={(e) => handleSegmentKeyDown(e, 2)}
              maxLength={4}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">Formato: XXXX-XXXX-XXXX</p>
          <Button className="mt-2" type="primary" onClick={handleRegisterLicenseWithComputer} loading={loading}>
            Validar licencia
          </Button>
        </div>

        {error ? (
          <div className="mt-3 text-sm text-red-600">{error}</div>
        ) : null}

        <div className="mt-4 flex flex-col items-center gap-2">
          <Button size="small" onClick={handleDiagnostico} loading={diagLoading}>
            Diagnóstico de conexión
          </Button>
          {diagResultados ? (
            <div className="w-full mt-1 text-xs bg-gray-50 border border-gray-200 rounded-md p-3 flex flex-col gap-1">
              {diagResultados.map((r) => (
                <div key={r.nombre} className={r.ok ? 'text-green-700' : 'text-red-600'}>
                  {r.ok ? '✓' : '✗'} <span className="font-medium">{r.nombre}</span>
                  {': '}{r.detalle} <span className="text-gray-400">({r.ms}ms)</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-5 text-xs text-gray-500 flex flex-col items-center">
          <p>Machine ID:</p>
          <Tooltip title={`Este es el codigo identificador de esta computadora: ${machineId}`}>
            <code className="text-gray-700">{machineId?.slice(0, 30) + '…'}</code>
          </Tooltip>
          <Tooltip title="Proyecto de Firebase y base de datos a la que apunta este build">
            <code className="text-gray-400 mt-1">
              {FIREBASE_TARGET.projectId} · db: {FIREBASE_TARGET.database}
            </code>
          </Tooltip>
        </div>
      </div>

      <AppVersion style={{ marginTop: '16px' }} />
    </div>
  );
}
