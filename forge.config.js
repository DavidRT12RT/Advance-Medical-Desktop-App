const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  //Configuracion del empaquetado basico
  packagerConfig: {
    asar: true,
    appBundleId: 'com.scaleflow.aim-desktop',
    appCategoryType: 'public.app-category.medical',
    appCopyright: 'Copyright © 2026 ScaleFlow',
    darwinDarkModeSupport: true,
    icon: 'assets/icon',
    extraResource: [
      'assets'
    ],
    // Permisos para macOS - Acceso a cámara y micrófono
    osxSign: {
      identity: null, // Para desarrollo sin firma
      hardenedRuntime: true,
      entitlements: 'entitlements.plist',
      'entitlements-inherit': 'entitlements.plist',
    },
    osxNotarize: false,
    // Información adicional para macOS
    extendInfo: {
      NSCameraUsageDescription: 'AIM Desktop necesita acceso a la cámara para realizar detecciones asistidas por IA durante procedimientos médicos (colonoscopías y endoscopías).',
      NSMicrophoneUsageDescription: 'AIM Desktop puede necesitar acceso al micrófono para grabar notas de voz durante los procedimientos.',
      NSAppleEventsUsageDescription: 'AIM Desktop necesita este permiso para funcionar correctamente.',
    },
  },
  rebuildConfig: {},
  //Configuracion de los instaladores (Windows, MAC y LINUX)
  makers: [
    //Windows - Instalador automático con Squirrel
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        authors: 'ScaleFlow',
        description: 'AIM Desktop - Sistema de Gestión Médica',
        name: 'AdvanceInteligentSystem',
        setupExe: 'AIM-Desktop-Setup.exe',
        setupIcon: 'assets/icon.ico',
        iconUrl: 'https://raw.githubusercontent.com/scaleflow/aim-desktop/main/assets/icon.ico',
        loadingGif: 'assets/transparent.gif',
        noMsi: true,
        remoteReleases: false,
      },
    },
    // macOS - ZIP para desarrollo (mantener para compatibilidad)
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    // macOS - DMG con instalación automática
    {
      name: '@electron-forge/maker-dmg',
      config: {
        format: 'UDZO',
        icon: 'assets/icon.icns',
      },
    },
    // Linux - DEB (Ubuntu/Debian)
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'ScaleFlow',
          homepage: 'https://scaleflow.com',
          icon: 'assets/icon.png'
        }
      },
    },
    // Linux - RPM (Fedora/RedHat)
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
        // If you are familiar with Vite configuration, it will look really familiar.
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
            entry: 'src/main.js',
            config: 'vite.main.config.mjs',
            target: 'main',
          },
          {
            entry: 'src/preload.js',
            config: 'vite.preload.config.mjs',
            target: 'preload',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
