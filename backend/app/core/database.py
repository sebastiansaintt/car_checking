from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# pool_pre_ping=True ayuda a evitar errores de conexiones caídas (liveness checks)
# effective_database_url convierte automático 'postgres://' (usado por Render) a 'postgresql://'
engine = create_engine(settings.effective_database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependencia para obtener la sesión de la base de datos
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
