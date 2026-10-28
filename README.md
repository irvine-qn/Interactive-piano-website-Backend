# Piano Web - Backend

Backend API for the Interactive Piano Web project.

This project is built with **Node.js + Express.js**.

---

## 1. Tech Stack

* Node.js
* Express.js
* CORS
* dotenv
* PostgreSQL 16 (Docker for local development)
* Prisma ORM 7 (`prisma-client-js` + `@prisma/adapter-pg`)
* JWT Authentication *(planned)*

---

## 2. Project Structure

```text
piano-backend/
│
├── public/
├── src/
│   ├── config/
│   │   └── env.js
│   │
│   ├── common/
│   │   ├── constants/
│   │   │   ├── piano.constants.js
│   │   │   └── sheet.constants.js
│   │   ├── exceptions/
│   │   ├── middlewares/
│   │   └── utils/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── collections/
│   │   ├── workspace/
│   │   │   ├── workspace.controller.js
│   │   │   ├── workspace.service.js
│   │   │   └── workspace.routes.js
│   │   └── sheets/
│   │       ├── sheets.repository.js
│   │       ├── sheets.schema.js
│   │       ├── sheets.controller.js
│   │       ├── sheets.service.js
│   │       └── sheets.routes.js
│   │
│   ├── data/
│   │   └── sheets/
│   │
│   ├── lib/
│   │   └── prisma.js
│   ├── types/
│   ├── app.js
│   └── server.js
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── .env
├── .env.example
├── .gitignore
├── docker-compose.yml
├── prisma.config.js
├── package-lock.json
├── package.json
└── README.md
```

### Folder Description

| Folder/File                  | Description                                                        |
| ---------------------------- | ------------------------------------------------------------------ |
| `src/server.js`              | Main entry point, starts the server                                |
| `src/app.js`                 | Creates the Express app, registers middleware and routes           |
| `src/config/`                | System configuration (environment variables, database, CORS)       |
| `src/common/constants/`      | Shared constants (piano note range, BPM limits, keyboard mapping, sheet difficulties, pagination) |
| `src/common/exceptions/`     | Custom error classes                                               |
| `src/common/middlewares/`    | Shared middleware (authentication, rate limit, error handler)      |
| `src/common/utils/`          | Shared helper functions                                            |
| `src/features/<feature>/`    | One folder per feature: routes, controller, service, model         |
| `src/features/workspace/`    | Virtual piano configuration for the Home page (`/api/v1/piano`, `/api/v1/frequencies`) |
| `src/features/sheets/`       | Sheet data for the Workspace page (`/api/v1/sheets`)                  |
| `src/data/sheets/`           | Sample sheet source data (MIDI, catalog, note JSON) loaded by `npm run db:seed` |
| `src/lib/`                   | Third-party integrations (storage, mailer, cache)                  |
| `src/lib/prisma.js`          | Shared Prisma client (connects through the `pg` driver adapter)    |
| `prisma/schema.prisma`       | Database models                                                    |
| `prisma/migrations/`         | Migration history (one migration per schema change)                |
| `prisma.config.js`           | Prisma CLI config (schema path, migrations path, `DATABASE_URL`)   |
| `src/types/`                 | Shared type definitions                                            |
| `.env`                       | Environment variables (local only, not committed)                  |
| `.env.example`               | Template for `.env`                                                |
| `docker-compose.yml`         | Local PostgreSQL container                                         |
| `.gitignore`                 | Files ignored by Git                                               |
| `package.json`               | Project information and dependencies                               |
| `package-lock.json`          | Locks dependency versions                                          |

> Folders without files (for example `features/auth/`, `lib/`) are not tracked by Git until a file is added to them.

---

# 3. Requirements

Before running the project, make sure you have:

* Node.js
* npm
* Git
* Docker Desktop (runs the local PostgreSQL database)

Check your versions:

```bash
node -v
npm -v
git --version
docker compose version
```

---

# 4. Clone the Repository

Clone the repository:

```bash
git clone <REPOSITORY_URL>
```

Move into the backend directory:

```bash
cd piano-backend
```

---

# 5. Install Dependencies

After cloning the project, run:

```bash
npm install
```

This will read `package.json` and `package-lock.json` and automatically create:

```text
node_modules/
```

You do **not** need to clone or manually create `node_modules`.

---

# 6. Environment Variables

Copy `.env.example` to `.env` in the root directory:

```bash
cp .env.example .env
```

```env
PORT=5000

POSTGRES_USER=fiano
POSTGRES_PASSWORD=fiano
POSTGRES_DB=fiano
POSTGRES_PORT=5432

DATABASE_URL=postgresql://fiano:fiano@localhost:5432/fiano?schema=public
```

> Do not commit `.env` to GitHub because it may contain sensitive information.

If port `5432` is already used by another PostgreSQL on your machine, change `POSTGRES_PORT` and the port inside `DATABASE_URL` to the same free port (for example `5433`).

## 6.1 Start the Database

Open Docker Desktop, then run from the backend directory:

```bash
docker compose up -d
```

Check that the container is healthy:

```bash
docker compose ps
```

The `fiano-postgres` container should show `healthy`. Data is kept in the Docker volume `fiano-pgdata`.

| Command | Purpose |
| --- | --- |
| `docker compose up -d` | Start PostgreSQL in the background |
| `docker compose stop` | Stop it (data is kept) |
| `docker compose down` | Remove the container (data is kept in the volume) |
| `docker compose down -v` | Remove the container **and delete all data** |

## 6.2 Prisma

`npm install` runs `prisma generate` automatically (`postinstall`), so the Prisma Client is ready after installing.

After the database is running, apply all migrations and load the sample sheets:

```bash
npm run db:migrate
npm run db:seed
```

| Command | Purpose |
| --- | --- |
| `npm run db:migrate` | Apply migrations, then regenerate the Prisma Client automatically (`postdb:migrate`). After editing `schema.prisma`, create a new one with `npm run db:migrate -- --name <change_name>` |
| `npm run db:seed` | Load the sheets listed in `src/data/sheets/catalog.json` into the database. Safe to run again: existing sheets are updated, `views`/`likes` are kept |
| `npm run db:generate` | Regenerate the Prisma Client after pulling schema changes |
| `npm run db:studio` | Open Prisma Studio in the browser to view/edit data |

> `npx prisma migrate reset` drops all data and re-applies migrations, but **Prisma 7 does not run the seed automatically** (older versions did). Run `npm run db:seed` again afterwards.

### Adding a new sample sheet

1. Put the `.mid` file in `src/data/sheets/midi/`.
2. Check its tracks: `node scripts/midi-to-sheet.mjs src/data/sheets/midi/<file>.mid --inspect`.
3. Add an entry to `src/data/sheets/catalog.json` (with the piano `tracks` to use).
4. Run `npm run sheets:build`, then `npm run db:seed`.

Use the shared client in code:

```js
const prisma = require("../../lib/prisma");
```

---

# 7. Run the Backend

Start the development server:

```bash
npm start
```

The server should run at:

```text
http://localhost:5000
```

You should see:

```text
Server is running on http://localhost:5000
```

---

# 8. Test the Backend

Open the following URL in your browser:

```text
http://localhost:5000
```

Expected response:

```json
{
  "message": "Piano Backend is running!"
}
```

---

# 9. Available API

## Health Check

### GET `/`

Check whether the backend is running.

**Request:**

```http
GET /
```

**Response:**

```json
{
  "message": "Piano Backend is running!"
}
```

## Piano Frequencies

### GET `/api/v1/frequencies`

Returns the note frequencies shown on the piano: from `C1` through `C7`, including sharp notes. Each value is in Hz and rounded to one decimal place. The response contains only these notes.

**Request:**

```http
GET /api/v1/frequencies
```

**Example response:**

```json
{
  "C1": 32.7,
  "C#1": 34.6,
  "D1": 36.7,
  "D#1": 38.9,
  "E1": 41.2
}
```

## Virtual Piano Configuration

### GET `/api/v1/piano`

Returns the note range, keyboard mapping, note frequencies, and metronome BPM limits used by the Home virtual piano.

**Response:**

```json
{
  "minBpm": 30,
  "maxBpm": 240,
  "defaultBpm": 120,
  "minMidiNote": 24,
  "maxMidiNote": 96,
  "notes": [
    {
      "midi": 24,
      "name": "C1",
      "frequency": 32.7,
      "keyboardKey": "1"
    }
  ]
}
```

Notes without a computer-keyboard mapping have `"keyboardKey": null`. The existing `/api/v1/frequencies` response remains unchanged.

## Sheets (Sheet Library & Workspace pages)

Feature: `src/features/sheets/` (routes → controller → service → repository). Sheet data is read from the PostgreSQL table `sheets` through Prisma (`sheets.repository.js`). Run `npm run db:seed` first to load the sample sheets.

### GET `/api/v1/sheets`

List sheets (without `notes`).

| Query | Values | Default |
| --- | --- | --- |
| `q` | Search in title and composer (case-insensitive) | – |
| `difficulty` | `EASY` \| `MEDIUM` \| `HARD` \| `EXPERT` | – |
| `tag` | Exact tag name, case-sensitive (e.g. `Pop`, `Contemporary Classical`) | – |
| `sort` | `popular` (most views) \| `likes` (most likes) \| `newest` \| `title` (A→Z) | `popular` |
| `page` | Positive integer | `1` |
| `pageSize` | Positive integer, max 50 | `8` |

Filters can be combined, e.g. `/api/v1/sheets?tag=Classical&difficulty=EASY&sort=likes`.

```json
{
  "data": [
    {
      "id": "fur-elise",
      "title": "Für Elise",
      "subtitle": null,
      "composer": "Ludwig van Beethoven",
      "difficulty": "EASY",
      "tags": ["Classical"],
      "bpm": 120,
      "timeSignature": [3, 4],
      "keySignature": "C major",
      "durationSec": 33,
      "noteCount": 104,
      "views": 152300,
      "likes": 34100,
      "coverColor": "yellow",
      "createdAt": "2026-10-28T01:00:00.000Z"
    }
  ],
  "meta": { "page": 1, "pageSize": 8, "total": 9, "totalPages": 2 }
}
```

`subtitle` and `keySignature` can be `null`. `coverColor` is one of `yellow`, `pink`, `mint`, `lavender`.

### GET `/api/v1/sheets/:id`

Same fields as above plus `notes`, sorted by `time` (seconds): `{ midi, name, time, duration, velocity, hand }` where `hand` is `left` or `right`.

### Errors

All errors use `{ "error": { "code", "message", "details?" } }`: `422 VALIDATION_FAILED`, `404 SHEET_NOT_FOUND`, `404 NOT_FOUND`, `500 INTERNAL_ERROR`.

---

# 10. Development Workflow

Before starting work:

```bash
git pull origin main
```

Create a new branch:

```bash
git checkout -b feature/your-feature-name
```

Example:

```bash
git checkout -b feature/login
```

After making changes:

```bash
git add .
git commit -m "feat: add login API"
git push origin feature/login
```

Then create a Pull Request on GitHub.

---

# 11. Important Git Rules

Do **not** commit:

```text
node_modules/
.env
```

These files are already included in `.gitignore`.

The following files should be committed:

```text
package.json
package-lock.json
src/
README.md
.gitignore
```

---

# 12. Current Development Status

### Backend

* [x] Express.js setup
* [x] CORS setup
* [x] Environment variables
* [x] Basic API endpoint
* [x] PostgreSQL via Docker (local dev)
* [x] Prisma ORM connection
* [ ] User model
* [ ] Register API
* [ ] Login API
* [ ] JWT authentication
* [ ] Music sheet upload
* [ ] Music sheet database
* [ ] User's saved music sheets

### Frontend

The frontend will communicate with the backend through REST APIs.

Example:

```text
React Frontend
      │
      │ HTTP Request
      ↓
Express Backend
      │
      ↓
PostgreSQL
```

---

# 13. API Development Convention

API endpoints should follow this structure:

```text
/api/v1/<resource>
```

Examples:

```text
/api/v1/auth
/api/v1/users
/api/v1/sheets
```

Example endpoints:

```text
POST   /api/v1/auth/register
POST   /api/v1/auth/login

GET    /api/v1/sheets
POST   /api/v1/sheets
GET    /api/v1/sheets/:id
DELETE /api/v1/sheets/:id
```

---

# 14. Team Notes

Before modifying an existing API:

1. Check the current route in `src/features/<feature>/<feature>.routes.js`.
2. Check the controller in `src/features/<feature>/<feature>.controller.js`.
3. Check the service and model in the same feature folder.
4. Make sure your changes do not break existing APIs.
5. Test the API before creating a Pull Request.

If you add a new API, update the **Available API** section of this README.

---

# 15. Useful Commands

Install dependencies:

```bash
npm install
```

Start server:

```bash
npm start
```
