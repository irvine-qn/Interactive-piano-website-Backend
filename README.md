# Piano Web - Backend

Backend API for the Interactive Piano Web project.

This project is built with **Node.js + Express.js**.

---

## 1. Tech Stack

* Node.js
* Express.js
* CORS
* dotenv
* MongoDB *(planned)*
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
│   │   │   └── piano.constants.js
│   │   ├── exceptions/
│   │   ├── middlewares/
│   │   └── utils/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── sheets/
│   │   ├── collections/
│   │   └── workspace/
│   │       ├── workspace.controller.js
│   │       ├── workspace.service.js
│   │       └── workspace.routes.js
│   │
│   ├── lib/
│   ├── types/
│   ├── app.js
│   └── server.js
│
├── .env
├── .gitignore
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
| `src/common/constants/`      | Shared constants (piano note range, BPM limits, keyboard mapping)  |
| `src/common/exceptions/`     | Custom error classes                                               |
| `src/common/middlewares/`    | Shared middleware (authentication, rate limit, error handler)      |
| `src/common/utils/`          | Shared helper functions                                            |
| `src/features/<feature>/`    | One folder per feature: routes, controller, service, model         |
| `src/features/workspace/`    | Virtual piano configuration (`/api/piano`, `/api/frequencies`)     |
| `src/lib/`                   | Third-party integrations (storage, mailer, cache)                  |
| `src/types/`                 | Shared type definitions                                            |
| `.env`                       | Environment variables                                              |
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

Check your versions:

```bash
node -v
npm -v
git --version
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

Create a `.env` file in the root directory:

```text
piano-backend/
├── src/
├── .env
├── package.json
└── README.md
```

For the current development version:

```env
PORT=5000
```

> Do not commit `.env` to GitHub because it may contain sensitive information.

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

### GET `/api/frequencies`

Returns the note frequencies shown on the piano: from `C1` through `C7`, including sharp notes. Each value is in Hz and rounded to one decimal place. The response contains only these notes.

**Request:**

```http
GET /api/frequencies
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

### GET `/api/piano`

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

Notes without a computer-keyboard mapping have `"keyboardKey": null`. The existing `/api/frequencies` response remains unchanged.

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
* [ ] MongoDB connection
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
MongoDB
```

---

# 13. API Development Convention

API endpoints should follow this structure:

```text
/api/<resource>
```

Examples:

```text
/api/auth
/api/users
/api/sheets
```

Example endpoints:

```text
POST   /api/auth/register
POST   /api/auth/login

GET    /api/sheets
POST   /api/sheets
GET    /api/sheets/:id
DELETE /api/sheets/:id
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
