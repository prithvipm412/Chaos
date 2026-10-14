# CHAOS boilerplate

React + Vite + Tailwind CSS v4 frontend and FastAPI backend. No product features.

Run these commands from the repository root in separate terminals.

## Backend

```sh
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.txt
backend/.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```

## Frontend

```sh
cd frontend
npm install
npm run dev -- --host localhost --port 5173 --strictPort
```

Open http://localhost:5173. The card checks http://localhost:8000/api/health with a three-second timeout.

## Verify

```sh
curl --max-time 3 http://localhost:8000/api/health
npm --prefix frontend run build
```

Stop either development server with Ctrl+C in its terminal.
