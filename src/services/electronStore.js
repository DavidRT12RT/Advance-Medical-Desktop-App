import Store from 'electron-store';

const DEFAULTS = {
  auth: {
    user: null,
    isAuthenticated: false,
    machineId: null,
    lastUpdatedAt: null,
    lastMachineIdSync: null,
  },
  license: {
    isValid: false,
    expiryDate: null,
    features: [],
    gracePeriodDays: 3,
    lastValidatedAt: null,
    raw: null,
  },
};

const store = new Store({
  name: 'advance-medical-desktop',
  defaults: DEFAULTS,
});

const safeMerge = (defaults, value) => ({
  ...defaults,
  ...(value || {}),
});

const getAuthData = () => safeMerge(DEFAULTS.auth, store.get('auth'));

const setAuthData = (auth) => {
  store.set('auth', auth);
  return auth;
};

const getLicenseData = () => safeMerge(DEFAULTS.license, store.get('license'));

const setLicenseState = (license) => {
  store.set('license', license);
  return license;
};

const setUser = (user) => {
  const auth = getAuthData();
  return setAuthData({
    ...auth,
    user: user || null,
    isAuthenticated: !!user,
    lastUpdatedAt: new Date().toISOString(),
  });
};

const logout = () => {
  const auth = getAuthData();
  return setAuthData({
    user: null,
    isAuthenticated: false,
    machineId: auth.machineId,
    lastUpdatedAt: new Date().toISOString(),
    lastMachineIdSync: auth.lastMachineIdSync,
  });
};

const setMachineId = (machineId) => {
  const auth = getAuthData();
  return setAuthData({
    ...auth,
    machineId: machineId || null,
    lastMachineIdSync: new Date().toISOString(),
  });
};

const setLicenseData = (licenseData = {}) => {
  // Objeto vacío/null = limpiar la licencia local por completo (logout de
  // licencia, desvinculación o invalidación remota). Sin esto, el merge de
  // abajo conservaba isValid/organizacion viejos en disco y la "limpieza"
  // no limpiaba nada.
  if (!licenseData || Object.keys(licenseData).length === 0) {
    return setLicenseState({ ...DEFAULTS.license });
  }
  const license = getLicenseData();
  return setLicenseState({
    ...license,
    ...licenseData,
    raw: licenseData,
  });
};

const setLicenseValid = (isValid, expiryDate, features) => {
  const license = getLicenseData();
  return setLicenseState({
    ...license,
    isValid: !!isValid,
    expiryDate: expiryDate || null,
    features: Array.isArray(features) ? features : license.features,
    lastValidatedAt: new Date().toISOString(),
  });
};

const isLicenseActiveWithGrace = () => {
  const license = getLicenseData();

  if (!license.isValid) {
    return false;
  }

  if (!license.expiryDate) {
    return true;
  }

  const expiry = new Date(license.expiryDate);
  if (Number.isNaN(expiry.getTime())) {
    return license.isValid;
  }

  const now = new Date();
  if (expiry >= now) {
    return true;
  }

  const graceDays = Number.isFinite(license.gracePeriodDays)
    ? license.gracePeriodDays
    : DEFAULTS.license.gracePeriodDays;

  if (!graceDays) {
    return false;
  }

  const graceExpiry = new Date(expiry);
  graceExpiry.setDate(graceExpiry.getDate() + graceDays);

  return graceExpiry >= now;
};

const getAllData = () => ({
  auth: getAuthData(),
  license: getLicenseData(),
});

export {
  getAllData,
  getAuthData,
  getLicenseData,
  isLicenseActiveWithGrace,
  logout,
  setLicenseData,
  setLicenseState,
  setLicenseValid,
  setMachineId,
  setUser,
};
