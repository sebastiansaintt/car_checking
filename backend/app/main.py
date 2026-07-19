import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.routers import auth, vehiculos, inspecciones, export

# Asegurar que el directorio de subidas estáticas exista
os.makedirs("static/uploads", exist_ok=True)

app = FastAPI(title="Sistema de Inspección de Flota API", version="1.0.0")

# Configuración de CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5174", "http://localhost:5173"],  # URLs de desarrollo de Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Montar directorio estático para servir imágenes/firmas (simulación de S3)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Incluir routers
app.include_router(auth.router, prefix="/api")
app.include_router(vehiculos.router, prefix="/api")
app.include_router(inspecciones.router, prefix="/api")
app.include_router(export.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "API de Inspección de Flota funcionando correctamente"}

@app.get("/health")
def health_check():
    return {"status": "ok"}
