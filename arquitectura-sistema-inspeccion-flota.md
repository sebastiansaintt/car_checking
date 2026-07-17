# Documento de Arquitectura y Planificación — Sistema de Inspección de Flota

Versión 1.0 · Piloto interno (MVP)

-----

## 1. Resumen ejecutivo

Digitalización del proceso de inspección de flota (12 camionetas: Amarok, Hilux, BT-50). El proceso de inspección física ya es eficiente; el cuello de botella es el registro en planillas físicas y la ausencia de auditoría. Este sistema reemplaza la planilla por una PWA con backend en FastAPI, orientada a velocidad de desarrollo, seguridad real y trazabilidad persistente.

**Objetivo del MVP**: validar con un coordinador y un gerente antes de escalar a más zonas/usuarios.

-----

## 2. Alcance

|Ítem |Definición |
|--------------|------------------------------------------------------------------------|
|Vehículos |Máx. 12, modelos fijos (Amarok, Hilux, BT-50) |
|Usuarios |2 roles: Coordinador (CRUD), Gerente (solo lectura + export + auditoría)|
|Autenticación |Credenciales precreadas, sin registro público |
|Conectividad |Offline-first (PWA), sincroniza al recuperar red |
|Notificaciones|Email (Gmail API) en eventos clave |

-----

## 3. Arquitectura general — Monolito en Capas (MVC)

```
┌─────────────────────────────────────────┐
│ Presentación (Frontend) │
│ Vite + React + TS · PWA · Tailwind │
└─────────────────┬─────────────────────────┘
│ HTTP (JSON, cookies httpOnly)
┌─────────────────▼─────────────────────────┐
│ Negocio (Backend) │
│ FastAPI · Pydantic · Uvicorn · uv │
│ Routers → Services → Repositories │
│ Auth como dependency (no capa lineal) │
└─────────────────┬─────────────────────────┘
│ ORM
┌─────────────────▼─────────────────────────┐
│ Datos │
│ PostgreSQL · SQLAlchemy · Alembic │
│ Redis (cache/rate-limit/sesiones) │
│ S3/R2 (firmas y fotos) │
└─────────────────────────────────────────────┘
```

**Por qué monolito y no microservicios**: 2 usuarios, 12 vehículos, bajo volumen. Microservicios agregarían complejidad operacional sin beneficio real en esta escala. El diseño en capas permite escalar horizontalmente después si el piloto se aprueba, sin reescritura completa.

**Por qué PWA y no apps nativas separadas**: necesidad de offline, instalación sin app store (clave para un piloto discreto), un solo código para escritorio (gerente) y celular (coordinador en terreno).

-----

## 4. Arquitectura del Backend (detalle)

```
API (routers/) → define endpoints, valida con Pydantic, no contiene lógica de negocio
↓ llama a
SERVICES (services/) → lógica de negocio pura (ej. calcular apto/no_apto, validar km)
↓ llama a
REPOSITORIES (repositories/) → queries SQLAlchemy, aislado del resto
↓ usa
DATABASE (models/) → modelos SQLAlchemy + Alembic para migraciones

AUTH → no es un paso secuencial, es un Depends() inyectado
en cada router que lo requiera
Depends(get_current_user)
Depends(require_role("coordinador"))

CACHE (Redis) → rate limiting (token bucket), idempotency keys,
blacklist de tokens invalidados (logout real)

STORAGE (S3/R2) → firmas (PNG/SVG) y fotos, nunca como blob en DB
```

### Estructura de carpetas propuesta (backend)

```
backend/
├── app/
│ ├── main.py
│ ├── core/
│ │ ├── config.py # variables de entorno (pydantic-settings)
│ │ ├── security.py # argon2, jwt, tokens
│ │ └── rate_limit.py # token bucket con Redis
│ ├── models/ # SQLAlchemy models
│ │ ├── vehiculo.py
│ │ ├── inspeccion.py
│ │ ├── usuario.py
│ │ └── audit_log.py
│ ├── schemas/ # Pydantic schemas (request/response)
│ ├── routers/ # FastAPI routers (capa API)
│ │ ├── auth.py
│ │ ├── vehiculos.py
│ │ ├── inspecciones.py
│ │ └── export.py
│ ├── services/ # lógica de negocio
│ ├── repositories/ # acceso a datos
│ └── deps.py # dependencies compartidas (auth, db session)
├── alembic/ # migraciones
├── tests/
├── pyproject.toml # gestionado con uv
└── docker-compose.yml
```

### Estructura de carpetas propuesta (frontend)

```
frontend/
├── src/
│ ├── components/
│ │ ├── ui/ # shadcn/ui
│ │ └── inspeccion/
│ │ ├── ChecklistForm.tsx
│ │ └── SignatureCanvas.tsx
│ ├── pages/ (o routes/)
│ ├── lib/
│ │ ├── api-client.ts # fetch wrapper, maneja cookies
│ │ └── validators.ts # esquemas Zod
│ ├── hooks/
│ ├── state/ # estado global (zustand o context)
│ └── service-worker.ts # offline sync
├── public/manifest.json # PWA manifest
└── vite.config.ts
```

-----

## 5. Modelo de datos

### Vehiculo

```
id, patente, marca, modelo, año, kilometraje_actual,
estado (activo/inactivo), fecha_ultimo_mantenimiento,
fecha_proximo_mantenimiento
```

### Inspeccion

```
id, vehiculo_id (FK), coordinador_id (FK), fecha (timestamp servidor),
kilometraje, resultado_general (apto/no_apto),
mantenimiento_recomendado (text, nullable), firma_url (S3),
observaciones, created_at, updated_at, deleted_at (soft delete)
```

### ChecklistItem

```
id, inspeccion_id (FK), item_nombre, valor (bueno/regular/malo)
```

Ítems provisionales: neumáticos, frenos, luces, niveles de fluidos, batería, correas, suspensión, carrocería, vidrios/espejos, cinturones, elementos de seguridad, documentación, A/C, sistema eléctrico. *(Validar con el coordinador antes de fijar el set final.)*

### EvidenciaFotografica

```
id, inspeccion_id (FK), url (S3/R2), item_relacionado (nullable, FK a ChecklistItem
si la foto documenta un ítem específico), descripcion (text, opcional), created_at
```

Permite adjuntar una o más fotos por inspección (ej. daño puntual, estado general del vehículo). Subida directa a S3/R2 desde el frontend (presigned URL), nunca como blob en la base de datos.

### Usuario

```
id, nombre, email, password_hash (argon2id), rol (coordinador/gerente),
activo, created_at
```

### AuditLog

```
id, usuario_id (FK), accion (crear/editar/eliminar/exportar/login/logout),
entidad, entidad_id, timestamp, ip, detalle (JSONB con diff antes/después)
```

**Relaciones**: `Vehiculo 1—N Inspeccion`, `Inspeccion 1—N ChecklistItem`, `Usuario 1—N Inspeccion (como autor)`, `Usuario 1—N AuditLog`.

**Índices recomendados**: `inspeccion(vehiculo_id, fecha)`, `audit_log(usuario_id, timestamp)`.

-----

## 6. Flujos principales (lógica)

### Flujo: crear inspección (coordinador, offline-first)

1. Coordinador completa formulario en el celular (puede estar sin conexión)
1. Frontend valida con Zod, guarda en cola local (IndexedDB) si no hay red
1. Al recuperar conexión, service worker sincroniza con el backend
1. Backend recibe con **idempotency key** (evita duplicados si el request se reintenta)
1. Backend valida con Pydantic, guarda en Postgres vía repository
1. Se registra en AuditLog

### Flujo: notificación por email (Gmail)

Se dispara **únicamente** en dos eventos, ambos con acción explícita del coordinador (no automatizado por reglas de negocio):

1. **Edición de un reporte** → email a gerente con diff antes/después
1. **Eliminación de un reporte** (soft delete) → email a gerente con detalle del reporte eliminado

No hay notificación automática por vencimiento de mantenimiento: esa decisión depende del criterio del coordinador (kilómetros recorridos y tiempo transcurrido desde la última inspección), no de una regla fija del sistema.

### Flujo: autenticación

1. Login con email/password → verificación Argon2id (resistente a timing attacks por diseño de la librería)
1. Si válido: se genera JWT, se setea como cookie **httpOnly + Secure + SameSite=Strict**
1. Redis guarda estado de sesión (permite invalidar en logout real, no solo borrar cookie del cliente)
1. Cada request protegido pasa por `Depends(get_current_user)` → valida JWT + verifica que no esté en blacklist de Redis
1. Expiración: por inactividad (TTL en Redis que se refresca) y expiración absoluta del token (independiente de la actividad)

### Flujo: exportación

1. Gerente aplica filtros → endpoint de export genera `.xlsx` (`openpyxl`)
1. Toda exportación queda registrada en AuditLog
1. Envío por Gmail API (OAuth2, nunca password plano) reservado a las notificaciones de edición/eliminación definidas arriba

-----

## 7. Seguridad (checklist técnico)

|Riesgo |Mitigación |
|------------------------------|-----------------------------------------------------------------------------------|
|XSS |Sanitización de inputs + escape en output + CSP headers |
|Inyección SQL |SQLAlchemy con queries parametrizadas (nunca raw SQL con f-strings) |
|Fuerza bruta / abuso de API |Rate limiting token bucket vía Redis, por IP y por usuario |
|Tokens predecibles |`secrets.token_urlsafe`, nunca `random` |
|Sesión persistente indebida |Expiración por inactividad + expiración absoluta |
|Passwords débiles al filtrarse|Argon2id (memory-hard) |
|Timing attacks en login |Delegado a la librería de Argon2 (comparación no depende del tiempo de entrada) |
|Robo de token vía JS |Cookie httpOnly, nunca localStorage |
|CSRF |SameSite=Strict + CSRF token en mutaciones sensibles si se requiere |
|Logout inefectivo |Blacklist de tokens en Redis, invalidación real en servidor |
|Doble envío de datos |Idempotency keys en endpoints de creación |
|Autenticación débil a futuro |Passkeys (WebAuthn) como opción adicional, no reemplazo inmediato |
|Escalamiento de privilegios |Rol verificado en backend (`Depends(require_role(...))`), nunca solo ocultado en UI|

-----

## 8. No funcional

- **Idempotencia**: idempotency key en creación de inspecciones (Redis, TTL corto)
- **Escalabilidad**: capas desacopladas; si el piloto se aprueba, escalar Postgres/Redis sin tocar lógica de negocio
- **Rendimiento**: paginación en listados, lazy loading de firmas/fotos desde S3, índices en columnas de búsqueda frecuente
- **Ligereza**: uv para gestión de dependencias (más rápido que pip/poetry), Vite para build rápido en frontend

-----

## 9. Roadmap de construcción (orden sugerido para el LLM)

1. `docker-compose.yml` con Postgres + Redis + backend + frontend
1. Modelos SQLAlchemy + primera migración Alembic
1. Auth completo (registro manual de usuarios vía seed, login, JWT, cookies, Redis blacklist)
1. CRUD de Inspección (coordinador) con validación Pydantic + Zod espejado, incluyendo carga de evidencia fotográfica (presigned URL a S3/R2)
1. Vista de solo lectura + filtros (gerente)
1. Exportación a Excel
1. Notificaciones por email (Gmail API) — solo edición y eliminación de reportes
1. PWA: manifest, service worker, cola offline
1. Endurecer seguridad (rate limiting, CSP, headers con `secure` middleware)
1. AuditLog transversal (idealmente como middleware/decorator, no repetido en cada endpoint)

-----

## 10. Instrucción para el LLM que construya el código

> Usa este documento como fuente de verdad. Sigue el orden del roadmap (sección 9). Respeta la separación de capas (routers no contienen lógica de negocio; services no acceden a la DB directamente, solo vía repositories). Todo endpoint de escritura debe validar rol en el backend, no solo en el frontend. Trata cada punto de la sección 7 (seguridad) como tarea explícita al implementar auth, no como algo implícito. No implementes localStorage para tokens bajo ninguna circunstancia.