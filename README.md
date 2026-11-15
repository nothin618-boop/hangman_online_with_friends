# Whisper Game (Cyber Rescue & Linguistic Disguise)

An interactive, cybernetic multiplayer web game built with Next.js, React, Tailwind CSS, TypeScript, Web Audio API, and real-time WebSockets.

## 🚀 Features

- **Multiplayer & Solo Modes**: Quick-play lobby, private room codes, and single-player practice modes.
- **Real-Time Synchronization**: Native WebSocket communication with automatic HTTP/SSE fallback.
- **Procedural Audio**: Web Audio API sound effects generated at runtime with zero external audio assets.
- **Modern Responsive UI**: Cyberpunk-inspired aesthetic featuring glowing accents, interactive keyboards, and responsive layouts.
- **Zero-Config Deployment**: Optimized for deployment on modern cloud platforms such as Vercel and Render.

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Frontend**: React 18, Tailwind CSS, Lucide Icons, Framer Motion
- **Language**: TypeScript
- **Realtime**: WebSocket (`ws`) & Server-Sent Events (SSE)
- **Audio**: Web Audio API

## 📦 Getting Started

### Prerequisites

- Node.js (v18.18 or higher)
- pnpm (recommended) or npm

### Installation

```bash
git clone https://github.com/<your-username>/whisper-game.git
cd whisper-game
pnpm install
```

### Running Locally

To start the development server:

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

The WebSocket multiplayer server starts automatically on port 3001.

### Building for Production

```bash
pnpm run build
pnpm run start
```

## 🌐 Deploying Online (Free)

### Deploy to Vercel

1. Push this repository to your GitHub account.
2. Sign in to [Vercel](https://vercel.com) using your GitHub account.
3. Click **Add New Project** and select this repository.
4. Click **Deploy**. Vercel will automatically build and publish your game with a free HTTPS URL.

## 🤝 Contributing

Contributions are welcome! Please feel free to open issues or submit pull requests.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
