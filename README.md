# TryQuest

TryQuest est un outil desktop open source pour PostgreSQL avec IA intégrée. Utilisez l'IA locale via Ollama (hors‑ligne, privée) ou vos propres clés cloud (OpenAI, Anthropic, Google Gemini, xAI). 

Site: https://tryquest.servel.ink

## Features

- **Sécurité & Open Source**
  - Code ouvert
  - Secrets chiffrés (connexions, clés utilisateur)
  - Gestion des clés IA utilisateur (OpenAI, Anthropic, Google, xAI) stockées chiffrées (Drizzle + `ENCRYPTION_SECRET`)

- **IA Locale (Ollama)**
  - Installation guidée (auto Linux, ouverture page macOS/Windows)
  - Démarrage/arrêt du service depuis l'app, statut/versions
  - Téléchargement de modèles avec progression (profils: Rapide 3B, Équilibré 7B, Performant 14B — Qwen2.5‑Coder)
  - Fonctionne hors‑ligne, données privées par défaut
  - Fallback auto vers le cloud si nécessaire

- **IA Cloud & Fallback intelligent**
  - Sélection dynamique du modèle via `@ai-sdk/*` (OpenAI, Anthropic, Google, xAI)
  - Priorité: clés utilisateur > clés système > Gemini par défaut
  - Tracing optionnel via PostHog (`withPosthog`)

- **Envoi d’emails (Resend)**
  - Rotation automatique entre 2 clés Resend (100/j chacune)
  - Compteurs quotidiens via Redis, logs détaillés

- **Uploads d’images**
  - Upload vers storage S3/R2 (ex: Cloudflare R2) et retour d’URL publique
  - Fallback base64 si le storage n’est pas configuré

- **Desktop & Build**
  - Electron (Linux AppImage/deb, Windows NSIS)
  - Deep‑linking (`tryquest://`), icônes configurées
  - Scripts d’auto‑update et publication GitHub configurables

## Stack

- React with TypeScript
- Electron
- TailwindCSS and shadcn/ui
- Vite
- TanStack Start/Router/Query/Form/Virtual
- Arktype
- Bun
- Hono
- oRPC
- Drizzle ORM
- Better Auth
- AI SDK with Anthropic, OpenAI, Gemini and XAI (avec `withPosthog`)
- Supabase
- Railway
- PostHog
- Loops

## Development Setup

- **📦 Package Installation**
  ```bash
  pnpm install
  ```

- **🐳 Start Database with Docker Compose**

  This will start the PostgreSQL database & Redis in the background.
  ```bash
  pnpm run docker:start
  ```

- **🗄️ Prepare Database**

  This will run database migrations to set up the required tables and schema.
  ```bash
  pnpm run drizzle:migrate
  ```

- **🚀 Run the Project**

  This will start all development servers using Turbo.
  ```bash
  pnpm run dev
  ```

## Testing

- **Unit Tests**
  ```bash
  pnpm run test:unit
  ```

> Before running E2E tests, make sure to start the test server: `pnpm run test:start` and db `postgresql://postgres:postgres@localhost:5432/conar`

- **E2E Tests**
  ```bash
  pnpm run test:e2e
  ```

## License

This project is licensed under the Apache-2.0 License — see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Built with ❤️</sub>
</div>

## Origin

Ce dépôt est un fork de Conar.app. Merci aux auteurs originaux.

- Site original: https://conar.app
- Dépôt source: https://github.com/wannabespace/conar
