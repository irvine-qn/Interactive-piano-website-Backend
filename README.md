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
* JWT authentication (`jsonwebtoken`) + password hashing (`bcryptjs`)

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
│   │   │   ├── auth.constants.js
│   │   │   ├── piano.constants.js
│   │   │   └── sheet.constants.js
│   │   ├── exceptions/
│   │   ├── middlewares/
│   │   └── utils/
│   │
│   ├── features/
│   │   ├── auth/
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.schema.js
│   │   │   └── auth.service.js
│   │   ├── users/
│   │   │   └── users.repository.js
│   │   ├── uploads/
│   │   │   ├── midiToSheet.js
│   │   │   ├── sheetSuggestions.js
│   │   │   ├── uploads.controller.js
│   │   │   ├── uploads.routes.js
│   │   │   ├── uploads.schema.js
│   │   │   └── uploads.service.js
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
│   │   ├── prisma.js
│   │   └── fileStorage.js
│   ├── types/
│   ├── app.js
│   └── server.js
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.js
│   └── migrations/
│
├── scripts/
│   ├── midi-to-sheet.mjs       # MIDI -> sheet JSON (seed data), uses src/features/uploads/midiToSheet.js
│   ├── build-sheets.mjs        # npm run sheets:build
│   └── auth-regression.mjs     # Auth API regression test (record/compare)
│
├── docs/
│   ├── NOTES.md                # Technical notes for the team
│   └── CHANGELOG.md            # Dated log of important changes
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
| `src/features/sheets/`       | Sheet data for the Library and Workspace pages (`/api/v1/sheets`)  |
| `src/features/auth/`         | Register / login, password hashing, JWT (`/api/v1/auth`)           |
| `src/features/users/`        | `users` table access through Prisma (`users.repository.js`)        |
| `src/features/uploads/`      | MIDI to sheet engine (`midiToSheet.js`), shared by the seed tool and the upload feature |
| `src/data/sheets/`           | Sample sheet source data (MIDI, catalog, note JSON) loaded by `npm run db:seed` |
| `src/lib/`                   | Third-party integrations (storage, mailer, cache)                  |
| `src/lib/prisma.js`          | Shared Prisma client (connects through the `pg` driver adapter)    |
| `src/lib/fileStorage.js`     | Saves original MIDI files of uploaded sheets (`FILE_STORAGE`, now PostgreSQL table `sheet_files`) |
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

> Folders without files (for example `features/collections/`, `types/`) are not tracked by Git until a file is added to them.

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

JWT_SECRET=change-me-to-a-long-random-string
JWT_EXPIRES_IN=7d

FILE_STORAGE=postgres
```

> Do not commit `.env` to GitHub because it may contain sensitive information. Set `JWT_SECRET` to your own long random string (it signs login tokens).

`FILE_STORAGE` chooses where original MIDI files of uploaded sheets are stored (`src/lib/fileStorage.js`). Only `postgres` (table `sheet_files`) exists for now; a cloud option will be added for deployment.

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
| `npm run db:deploy` | Apply pending migrations **without** drift checks (and regenerate the client). Use it once on an existing database, see 6.3 |
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

All tables (`sheets`, `users`, …) are created **only by Prisma migrations**. Do not create tables with SQL at server startup.

## 6.3 Updating an Existing Database After Pulling

The `users` table used to be created by the server at startup (raw SQL). It is now owned by the migration `20261104095754_add_users`. If your local database was created before that change, `npm run db:migrate` reports **"Drift detected … We need to reset the public schema … All data will be lost"**.

> ⚠️ **Never answer `y` to that prompt.** Pick the case that matches your database instead (all keep your data):

| Your local database | Commands (run once) |
| --- | --- |
| New / empty | `npm run db:migrate` then `npm run db:seed` |
| Has `sheets` (Prisma) **and** `users` (created by the old server) | `npm run db:deploy` |
| Has only `users` (never ran Prisma) | `npx prisma migrate resolve --applied 20261104095754_add_users`, then `npm run db:deploy`, then `npm run db:seed` |

Check with `npx prisma migrate status` → `Database schema is up to date!`. After that, `npm run db:migrate` works normally again.

---

# 7. Run the Backend

Make sure PostgreSQL is running and the database is migrated and seeded (sections 6.1 and 6.2). Then start the development server:

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
| `q` | Search in title and composer (case-insensitive, `%` and `_` are matched literally) | – |
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

### GET `/api/v1/sheets/tags`

All tags with the number of sheets using each one, most used first (then A→Z). Use `name` as the `tag` query of `GET /api/v1/sheets`.

```json
{
  "data": [
    { "name": "Contemporary Classical", "count": 3 },
    { "name": "Classical", "count": 2 },
    { "name": "Pop", "count": 2 }
  ]
}
```

### GET `/api/v1/sheets/:id`

Same fields as above plus `notes`, sorted by `time` (seconds): `{ midi, name, time, duration, velocity, hand }` where `hand` is `left` or `right`.

`GET /api/v1/sheets/:id` also returns `chords`: `[{ "index": 0, "time": 1, "octaves": { "left": 3, "right": 4 }, "notes": [{ "name": "E5", "hand": "right", "midi": 76, "duration": 0.236, "velocity": 0.5, "required": true }] }]`. Notes that start within 30 ms form one chord. `octaves` positions each hand's key zone from `GET /api/v1/piano` (`practiceKeys`). At most 4 notes per chord are `required`; Play mode sounds the others automatically. `shortcut` is the computer key for a required note. `zoneMoves` is how many octaves each zone moves from the previous chord.

### GET `/api/v1/sheets/:id/score`

Converts the sheet notes into staff positions, computed from each note's MIDI number by `sheets.score.js`. The result is not stored.

```json
{
  "beats": 3,
  "beatUnit": 4,
  "slotsPerMeasure": 12,
  "measureSeconds": 1.5,
  "measures": [
    {
      "index": 0,
      "treble": [
        {
          "slot": 8,
          "length": 2,
          "duration": "8",
          "isRest": false,
          "notes": [{ "midi": 76, "name": "E5", "key": "e/5", "accidental": null, "staffStep": 3 }]
        }
      ],
      "bass": []
    }
  ]
}
```

`slot` and `length` are counted in sixteenth notes. `staffStep` is the distance from the middle line of the staff, in lines and spaces.

### POST `/api/v1/sheets/:id/like`

Requires `Authorization: Bearer <token>`. Likes the sheet, or removes the like if the user already liked it.

```json
{ "liked": true, "likes": 1 }
```

Returns `401 UNAUTHORIZED` without a valid token and `404 SHEET_NOT_FOUND` if the sheet does not exist. `GET /api/v1/sheets` and `GET /api/v1/sheets/:id` also return `likedByMe`.

### POST `/api/v1/sheets/:id/view`

Add one view to a sheet (no auth, no request body). The increment is atomic, so concurrent requests are all counted. Returns the new total:

```json
{ "views": 45201 }
```

Returns `404 SHEET_NOT_FOUND` if the sheet does not exist. The Workspace page calls this once when a sheet is opened.

## Auth

Feature: `src/features/auth/` (routes → controller → schema → service) and `src/features/users/users.repository.js` (Prisma, table `users`). Passwords are hashed with bcrypt (10 rounds); responses never contain the hash. Tokens are JWT signed with `JWT_SECRET`, valid for `JWT_EXPIRES_IN` (default `7d`), payload `{ sub: userId, username, role }`.

Send the token on protected requests:

```http
Authorization: Bearer <accessToken>
```

### POST `/api/v1/auth/register`

```json
{ "displayName": "Minh Quan", "username": "quanpianist", "email": "quan@example.com", "password": "Password1" }
```

| Field | Rules |
| --- | --- |
| `displayName` | Required, max 100 characters (trimmed) |
| `username` | Required, lowercase letters and digits only, max 50 |
| `email` | Required, valid email, max 255, stored in lowercase |
| `password` | At least 8 characters, 1 uppercase letter and 1 digit |

Response `201`:

```json
{
  "accessToken": "<jwt>",
  "user": {
    "id": 1,
    "username": "quanpianist",
    "email": "quan@example.com",
    "displayName": "Minh Quan",
    "role": "user",
    "isVerified": false,
    "createdAt": "2026-11-04T09:33:41.615Z"
  }
}
```

Errors: `409 USERNAME_TAKEN`, `409 EMAIL_TAKEN`, `422 VALIDATION_FAILED` (message says which field).

### POST `/api/v1/auth/login`

```json
{ "identifier": "quanpianist", "password": "Password1" }
```

`identifier` is the username **or** the email (case-insensitive). Response `200` has the same shape as register. Wrong username/email or password: `401 INVALID_CREDENTIALS` (same message for both, so the API does not reveal which accounts exist).

### Regression test

After changing Auth code, compare responses with a baseline taken before the change (creates a few test accounts in the current database, dev only):

```bash
node scripts/auth-regression.mjs --record  baseline.json   # before the change
node scripts/auth-regression.mjs --compare baseline.json   # after the change
```

Options: `--base http://localhost:5000`, `--existing <username>:<password>` (also check an account that already exists).

## Uploads

Feature: `src/features/uploads/` (routes → controller → schema → service). The MIDI engine is `midiToSheet.js`, file upload is handled by `src/common/middlewares/upload.middleware.js` (multer). Full request/response details: [`docs/api.md`](docs/api.md#uploads).

### POST `/api/v1/uploads/midi/analyze`

Requires a token. Send `multipart/form-data` with `file` (a `.mid`/`.midi` file, at most 1 MB) and optionally `tracks` (for example `0,1`). Reads the file and returns the tracks with a suggested selection, a suggested title (from the file name), a suggested difficulty, BPM, time and key signature, duration, note count and warnings. **Nothing is saved**: call it again with `tracks` when the user changes the selection.

### Errors

All errors use `{ "error": { "code", "message", "details?" } }`:

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_JSON` | Request body is not valid JSON |
| 400 | `FILE_REQUIRED` / `UNEXPECTED_FILE` / `INVALID_UPLOAD` | Upload without a file, with several files or a wrong field name, or a broken multipart request |
| 401 | `UNAUTHORIZED` | Missing or invalid token on a protected route |
| 401 | `INVALID_CREDENTIALS` | Login with a wrong username/email or password |
| 404 | `SHEET_NOT_FOUND` | Sheet id does not exist |
| 404 | `NOT_FOUND` | Route does not exist (also wrong HTTP method) |
| 409 | `USERNAME_TAKEN` / `EMAIL_TAKEN` | Register with an existing username / email |
| 413 | `FILE_TOO_LARGE` | Uploaded file is larger than 1 MB |
| 415 | `UNSUPPORTED_FILE` | Uploaded file is not a MIDI file |
| 422 | `VALIDATION_FAILED` | Invalid query parameter or request body |
| 422 | `INVALID_MIDI` / `INVALID_TRACKS` / `NO_NOTES` / `MIDI_TOO_LARGE` | Damaged MIDI file, wrong track selection, no playable notes, more than 20 000 notes or 20 minutes |
| 500 | `INTERNAL_ERROR` | Unexpected server error (e.g. database is down) |

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
scripts/
prisma/              (schema, migrations, seed)
prisma.config.js
docker-compose.yml
.env.example
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
* [x] Music sheet database (`sheets` table + sample seed)
* [x] Sheet Library API (list, search/filter/sort, tags, detail, view count)
* [x] User model (Prisma, migration `add_users`)
* [x] Register API
* [x] Login API
* [x] JWT authentication (token issued on register/login)
* [ ] Music sheet upload
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

Technical notes (big changes such as Auth moving from raw `pg` to Prisma, conventions, common local errors) are in [`docs/NOTES.md`](docs/NOTES.md), and the dated change log is in [`docs/CHANGELOG.md`](docs/CHANGELOG.md). Add an entry there when a change affects the rest of the team.

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

Database and data:

```bash
docker compose up -d        # start PostgreSQL
npm run db:migrate          # apply migrations (+ regenerate Prisma Client)
npm run db:deploy           # apply migrations without drift checks (existing DB, see 6.3)
npm run db:seed             # load sample sheets
npm run db:studio           # browse data in the browser
npm run sheets:build        # regenerate sheet JSON from MIDI (src/data/sheets/catalog.json)
```
