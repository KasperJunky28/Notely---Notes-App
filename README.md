# Notely

A personal notes app. Users sign up, log in, and manage their own notes (title, content, category, completed state) and a profile picture.

The backend is a [FastAPI](https://fastapi.tiangolo.com/) app that exposes a JSON API **and** serves the frontend, so a single server runs everything.

## How it works

```
Browser ──► FastAPI (uvicorn, port 8000)
              ├── /                   static frontend (frontend/)
              ├── /profile_pictures   uploaded profile images
              ├── /login, /users...   users API
              ├── /notes...           notes API (login required)
              └── /docs               interactive API docs (Swagger UI)
                        │
                        ▼
                  SQLite (notes.db) via async SQLAlchemy
```

- **Frontend** (`frontend/`): plain HTML/CSS/JS. `index.html` + `login.js` handle sign-up and login, `notes.html` + `notes.js` handle the notes screen. The JS calls the API at `http://127.0.0.1:8000`.
- **Authentication**: a user logs in with email and password (`POST /login`) and receives a JWT access token (valid for 30 minutes). The frontend sends it as `Authorization: Bearer <token>`. Passwords are stored hashed with Argon2. Signing the tokens requires the `JWT_SECRET_KEY` environment variable (see below).
- **Notes**: every note belongs to a user, and `/notes` endpoints require a valid token.
- **Profile pictures**: uploaded via `POST /users/me/profile-picture`. Only JPEG, PNG and WebP are accepted, up to 2 MB. Files are stored in `profile_pictures/`, and new users get `default.png`.
- **Database**: SQLite file `notes.db` in the project folder. Tables are created automatically on startup.

### Project layout

| Path | Purpose |
| --- | --- |
| `main.py` | App setup: routers, static files, startup |
| `routers/users.py`, `routers/notes.py` | API endpoints |
| `auth.py` | Password hashing, JWT creation and verification |
| `models.py`, `schemas.py`, `database.py` | DB models, request/response schemas, DB engine |
| `image_utils.py` | Profile picture validation and storage |
| `frontend/` | The web UI |

## Requirements

- [uv](https://docs.astral.sh/uv/) (installs Python and dependencies for you)
- Python 3.14 or newer (uv will fetch it automatically if missing)

## Setup

### 1. Install dependencies

From the project folder:

```bash
uv sync
```

This creates the `.venv` virtual environment and installs everything listed in `pyproject.toml` / `uv.lock`.

### 2. Create the `.env` file

The app refuses to start without a secret key for signing login tokens. Create a file named `.env` in the project root (next to `main.py`):

```env
JWT_SECRET_KEY=put-a-long-random-string-here
```

Generate a strong random value with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

and paste the output after `JWT_SECRET_KEY=`.

Notes:

- `.env` is loaded automatically at startup (via `python-dotenv`), so you don't need to export anything by hand.
- `.env` is listed in `.gitignore`. **Never commit it or share the key.**
- If you change the key, all existing login tokens become invalid and users must log in again.

### Setting it as an environment variable instead

Instead of (or in addition to) the `.env` file, you can set `JWT_SECRET_KEY` as a regular environment variable. A value already set in the environment takes priority over the one in `.env`.

Linux / macOS / WSL, for the current terminal session:

```bash
export JWT_SECRET_KEY="put-a-long-random-string-here"
```

To keep it across sessions, add that line to `~/.bashrc` (or `~/.zshrc`) and reload the shell.

Windows PowerShell, for the current session:

```powershell
$env:JWT_SECRET_KEY = "put-a-long-random-string-here"
```

## Running

```bash
uv run uvicorn main:app --reload
```

Then open **http://127.0.0.1:8000** in your browser.

- Use `127.0.0.1`, not `localhost`: the frontend calls the API at `127.0.0.1:8000`, and mixing hosts makes the browser treat requests as cross-origin.
- `--reload` restarts the server when you edit the code. Leave it out in production.
- API documentation is available at http://127.0.0.1:8000/docs.

## Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `RuntimeError: JWT_SECRET_KEY environment variable is missing` | The `.env` file is missing, empty, or not in the project root. See step 2. |
| Page shows `{"detail":"Not Found"}` | The frontend isn't being served. Make sure `main.py` mounts `frontend/` **last**, after the routers. |
| Login or notes requests fail in the browser | You opened the app through `localhost` instead of `127.0.0.1`, or the server isn't running. |
| `401 Unauthorized` on `/notes` | Expected when not logged in. Log in first, or the token expired (30 minutes). |
