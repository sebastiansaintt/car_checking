from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth

app = FastAPI(title="Sistema de Inspección de Flota API", version="1.0.0")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # URL de desarrollo de Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "API de Inspección de Flota funcionando correctamente"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
