# Web FFmpeg Studio 🎬

A powerful, browser-based media conversion and processing tool powered by FFmpeg WebAssembly (`@ffmpeg/ffmpeg`). Complete with video/audio transcoding, GIF generation, metadata editing, and advanced video processing, all running securely and entirely client-side. No installation, no server uploads required!

## 🚀 Features

- **Video/Audio Converter:** Transcode between multiple formats (MP4, WebM, MKV, AVI, MOV, FLV, MP3, WAV, OGG, FLAC, AAC, etc.).
- **Advanced Processing:** 
   - Trim video/audio by start and end times.
   - Scale and resize (1080p, 720p, 480p, or custom resolutions).
   - Crop video area (1:1, 16:9, 4:3, or custom dimensions).
   - Video stabilization (Deshake filter).
- **GIF Maker:** 
   - Create high-quality animated GIFs with advanced options.
   - Configure frame rate (FPS), custom scale, duration, and start times.
   - Advanced dithering algorithms (Sierra2 4A, Floyd Steinberg, Bayer, etc.) and optimized color palettes.
- **Metadata Editor:** Edit title, artist, and auth metadata directly without re-encoding (stream copy).
- **Custom Terminal:** Write arbitrary FFmpeg CLI commands in a web-native terminal.
- **Localization (i18n):** Supports English, Russian, Spanish, and Chinese!

## 💻 Tech Stack

- **Framework:** React 18 & Vite
- **Styling:** Tailwind CSS & shadcn/ui
- **Engine:** `@ffmpeg/ffmpeg` (WASM)
- **i18n:** `i18next` & `react-i18next`

## 🛠️ Usage

### Desktop Application (Electron)

You can package and run this tool as a standalone desktop application (no local server needed). This turns it into an `.exe`, `.dmg`, or `AppImage` file for your platform.

1. Ensure dependencies are installed:
```bash
npm install
```

2. Run in development mode (spawns the app window):
```bash
npm run electron:dev
```

3. **Build the standalone installer for your current OS:**
```bash
npm run electron:dist
```
The compiled program (installer and portable executable) will be placed in the `release/` folder.

### Web Browser Usage

Make sure your development server serves up the correct Cross-Origin header requirements for WebAssembly SharedArrayBuffer to work:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: require-corp`

### Installation

1. Clone the repository.
2. Install dependencies:
```bash
npm install
```
3. Start the development server:
```bash
npm run dev
```

### Production Build

```bash
npm run build
```
This generates the optimized static assets in the `dist` folder.

## 🌍 Localization

Web FFmpeg Studio natively supports multiple languages. You can easily switch between:
- English
- Russian (Русский)
- Spanish (Español)
- Chinese (中文)

Translations can be expanded or updated by editing the configuration within `src/i18n.ts`.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📜 License

This project is licensed under the MIT License.
