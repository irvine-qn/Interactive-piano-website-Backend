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
├── src/
│   ├── controllers/
│   │
│   ├── middleware/
│   │
│   ├── models/
│   │
│   ├── routes/
│   │
│   └── server.js
│
├── .env
├── .gitignore
├── package-lock.json
├── package.json
└── README.md
```

### Folder Description

| Folder/File         | Description                          |
| ------------------- | ------------------------------------ |
| `src/server.js`     | Main entry point of the backend      |
| `src/routes/`       | Define API endpoints                 |
| `src/controllers/`  | Handle API logic                     |
| `src/models/`       | Database models                      |
| `src/middleware/`   | Authentication and other middleware  |
| `.env`              | Environment variables                |
| `.gitignore`        | Files ignored by Git                 |
| `package.json`      | Project information and dependencies |
| `package-lock.json` | Locks dependency versions            |

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

1. Check the current route.
2. Check the controller.
3. Check the model.
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
