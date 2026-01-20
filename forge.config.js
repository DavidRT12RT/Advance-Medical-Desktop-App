const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    //Windows - Instalador automático con wizard
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // setupIcon:"assets/icon.ico",
        // iconUrl: 'file://' + require('path').resolve(__dirname, 'assets/icon.ico'),
        // loadingGif: 'assets/loading.gif', // Opcional: GIF durante instalación
        // Comentados hasta que existan los archivos de assets
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
        format: 'ULFO',
        // No especificar icon ni background si no existen
        // icon: 'assets/icon.icns',
        // background: 'assets/dmg-background.png',
      },
    },
    // Linux - DEB (Ubuntu/Debian)
    {
      name: '@electron-forge/maker-deb',
      config: {
        options: {
          maintainer: 'David Melgarejo',
          homepage: 'https://advance-intelligence.com'
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
