# TRANNING-APP

Training Platform — plataforma de entrenamiento, seguimiento y nutrición.

```
backend/   API NestJS + TypeORM + PostgreSQL + MinIO (S3 privado)
frontend/  SPA React 19 + Vite + TypeScript + TanStack (cliente generado con Orval)
docs/      Arquitectura, roadmap y fase actual del frontend
.cursor/   Reglas y skills para agentes de IA (ver AGENTS.md)
```

## Backend

Ver [`backend/README.md`](backend/README.md) para instalación, variables de entorno, migraciones y Docker Compose.

Inicio rápido:

```bash
cd backend
cp .env.example .env      # completar valores locales; nunca subir .env
docker compose up -d      # PostgreSQL 5432, MinIO 9100 / consola 9101
npm install
npm run migration:run
npm run start:dev         # API en http://localhost:3000, Swagger en /api/docs
```

## Frontend

Ver [`frontend/README.md`](frontend/README.md).

Inicio rápido (con el backend corriendo):

```bash
cd frontend
cp .env.example .env      # VITE_API_URL = origen del backend (ej. http://localhost:3000)
npm install
npm run dev               # http://localhost:5173
```

`src/generated/` lo genera Orval desde el OpenAPI del backend: no se edita a mano, se regenera con `npm run api:generate`.

## Ramas

- `main` — rama estable
- `ronny` — trabajo de Ronny
- `Eli` — trabajo de Eli

Trabajen en su rama y abran un Pull Request hacia `main`.

## Trabajo con IA

Las reglas del proyecto están en `.cursor/rules/` (Cursor las carga solo). Para otros agentes (Claude Code, Codex, Copilot…) el punto de entrada es [`AGENTS.md`](AGENTS.md). La fase actual está en [`docs/frontend/current-task.md`](docs/frontend/current-task.md).
