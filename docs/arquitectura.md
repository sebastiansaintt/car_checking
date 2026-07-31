# Arquitectura del Sistema — Sointer Ltda. Sistema de Inspección
**Versión:** 2.0 · **Fecha:** 2026-07-31

---

## 1. Visión Macro

El sistema es un **monolito en capas** con principios de **Domain-Driven Design (DDD)** aplicados al núcleo de negocio. No es una arquitectura de microservicios: el volumen operativo no lo justifica y el monolito permite iteración rápida sin overhead distribuido. El diseño en capas garantiza que escalar o migrar componentes individuales (p.ej. pasar a S3 real, añadir colas de mensajes) no requiera reescritura.

```
┌────────────────────────────────────────────────────────┐
│                  CLIENTE (PWA)                         │
│         React + TypeScript + Vite + Tailwind           │
│         Service Worker · IndexedDB (offline)           │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTPS · JSON · Cookies httpOnly
┌──────────────────────────▼─────────────────────────────┐
│                  API GATEWAY (FastAPI)                  │
│     Routers · Pydantic · Rate Limiting · Auth           │
│     Middleware: CORS · CSP · Security Headers           │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│               CAPA DE SERVICIOS / DOMINIO               │
│   Services (orquestación) · Domain (lógica pura)        │
│   CalculadorDictamen · MáquinaEstado · GeneradorNumero  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│               CAPA DE PERSISTENCIA                      │
│   Repositories · SQLAlchemy ORM · Alembic               │
└──────────────┬───────────────────────────────┬─────────┘
               │                               │
   ┌───────────▼──────────┐     ┌──────────────▼──────────┐
   │     PostgreSQL        │     │          Redis           │
   │  Datos transaccionales│     │  JWT Blacklist · Cache   │
   │  Sequences · JSONB    │     │  Rate Limit · Idempotency│
   └──────────────────────┘     └─────────────────────────┘
                           │
               ┌───────────▼──────────┐
               │  Storage Estático    │
               │  /static/uploads     │
               │  (→ S3/R2 en prod)   │
               └──────────────────────┘
```

---

## 2. Stack Tecnológico

### Backend
| Componente | Tecnología | Justificación |
|---|---|---|
| Framework | FastAPI 0.11+ | Async, tipado, Pydantic nativo, OpenAPI gratis |
| ORM | SQLAlchemy 2.x | Queries tipadas, migrations via Alembic |
| Validación | Pydantic v2 | Esquemas request/response, settings |
| Auth | JWT + Argon2id | Argon2id: memory-hard, resistente a timing attacks |
| Sesiones | Redis | Blacklist real de tokens, rate limiting, idempotency |
| Servidor | Uvicorn | ASGI, performance real en FastAPI |
| Migrations | Alembic | Versionado de esquema BD |
| Gestión deps | uv | Más rápido que pip/poetry |

### Base de Datos
| Componente | Tecnología |
|---|---|
| BD principal | PostgreSQL 16+ |
| Tipos especiales | JSONB (AuditLog diff), BIGSERIAL (correlativo inspección) |
| Cache / Sesiones | Redis 7+ |
| Almacenamiento de archivos | Local `/static/uploads` (dev) → S3/R2 (prod) |

### Frontend
| Componente | Tecnología | Justificación |
|---|---|---|
| Framework | React 18 + TypeScript | Ecosistema maduro, tipado estático |
| Build | Vite | HMR rápido, bundle optimizado |
| Estilos | Tailwind CSS | Utilidades rápidas, consistencia visual |
| Estado global | Context API + Hooks | Suficiente para la escala actual |
| Formularios | React controlled + Zod | Validación espejada con Pydantic del backend |
| Canvas firma | react-signature-canvas | Captura de firma digital en campo |
| PWA | Vite PWA plugin + Workbox | Service Worker, manifest, offline cache |
| Offline storage | IndexedDB (idb) | Cola de inspecciones pendientes de sincronización |
| HTTP client | fetch wrapper (`apiFetch`) | Manejo centralizado de cookies, errores, base URL |

### Infraestructura / DevOps
| Componente | Tecnología |
|---|---|
| Contenedores | Docker + docker-compose |
| CI/CD target | Render (backend) + Vercel (frontend) |
| Reverse proxy | Nginx (en prod, maneja HTTPS y archivos estáticos) |

---

## 3. Arquitectura del Backend (Capas)

```
HTTP Request
     │
     ▼
┌──────────────────────────────────────────────────────┐
│  ROUTERS (app/routers/)                              │
│  · Define endpoints y métodos HTTP                   │
│  · Valida request con Pydantic                       │
│  · Inyecta dependencias (auth, DB, Redis)            │
│  · NO contiene lógica de negocio                     │
│  Archivos: auth, vehiculos, inspecciones,            │
│            empresas_contratistas, export,             │
│            audit_log, mantenimientos,                 │
│            notificaciones, estadisticas              │
└──────────────────────┬───────────────────────────────┘
                       │ llama a
┌──────────────────────▼───────────────────────────────┐
│  SERVICES (app/services/)                            │
│  · Orquesta dominio + repositorios                   │
│  · Maneja transacciones y efectos secundarios        │
│    (email, notificaciones, audit log)                │
│  · NO accede a la BD directamente                    │
│  Archivos: inspeccion, mantenimiento, auth,          │
│            email, export, notificacion               │
└───────────┬──────────────────────────────────────────┘
            │ usa                      │ usa
┌───────────▼─────────────┐  ┌────────▼──────────────────┐
│  DOMAIN (app/domain/)   │  │  REPOSITORIES             │
│  · Lógica de negocio    │  │  (app/repositories/)      │
│    pura (sin FastAPI,   │  │  · Queries SQLAlchemy       │
│    sin SQLAlchemy)      │  │  · Aislados del resto       │
│  · Calculador Dictamen  │  │  · Retornan modelos ORM     │
│  · Máquina de Estado    │  │  Archivos: inspeccion,      │
│  · Generador Número     │  │    vehiculo, usuario,       │
│  · Lógica de sello      │  │    empresa_contratista,     │
└─────────────────────────┘  │    hallazgo, firma_tecnico, │
                             │    audit_log, mantenimiento │
                             └───────────────┬────────────┘
                                             │ usa
                             ┌───────────────▼────────────┐
                             │  MODELS (app/models/)       │
                             │  · SQLAlchemy ORM           │
                             │  · Tablas y relaciones      │
                             └────────────────────────────┘
```

### Transversal: Auth
```
Depends(get_current_user)      → verifica JWT + blacklist Redis
Depends(require_role([...]))   → verifica rol en backend
                                  (nunca solo en frontend)
```

---

## 4. DDD: Bounded Contexts y Aggregates

### 4.1 Contexto: Inspección *(Core Domain)*

Es el corazón del negocio. Toda la lógica compleja reside aquí.

```
InspeccionAggregate (Aggregate Root: Inspeccion)
├── Inspeccion (Entity)
│   ├── numero_inspeccion (correlativo)
│   ├── numero_revision (1 o 2)
│   ├── inspeccion_previa_id (referencia para trazabilidad)
│   ├── estado: EstadoInspeccion (enum)
│   └── sello: SellosAprobacion (Value Object, post-aprobación)
│
├── EvaluacionSistema[] (Value Object)
│   ├── sistema_id
│   ├── estado_sistema (aprobado / no_aprobado)
│   └── EvaluacionItem[] (Value Object)
│       ├── item_id, valor (E/S/NA), comentario
│
├── Hallazgo[] (Entity)
│   ├── descripcion, atendido, fecha_atencion
│
├── FirmaTecnico[] (Entity)
│   ├── usuario_id (técnico logueado) o nombre_texto (adicionales)
│   ├── es_aprobador (bool — para firma del jefe)
│   └── firma_url, signed_at
│
└── EvidenciaFotografica[] (Entity)
    ├── url, descripcion, checklist_item_id

Domain Services:
· CalculadorDictamen     — RN-04, RN-05 (cálculo de dictamen por sistema y general)
· GestorEstadoInspeccion — RN-07 (transiciones de estado, guarda de invariantes)
· GeneradorNumeroSerie   — RN-09, RN-12 (número correlativo vía secuencia PG)
· GestorSelloAprobacion  — RN-12 (genera sello: empresa, fecha, firma, "APROBADO")

Domain Events:
· InspeccionCreadaEvent
· HallazgoRegistradoEvent
· HallazgosAtendidosEvent
· InspeccionPendienteAprobacionEvent
· InspeccionAprobadaEvent
· SegundaRevisionSolicitadaEvent
```

### 4.2 Contexto: Flota *(Supporting Domain)*

```
Vehiculo (Entity)
├── placa (identificador único)
├── empresa_contratista_id (FK)
├── marca, modelo, año, tipo, numero_interno
├── color, equipo_auxiliar, area_transitar
└── kilometraje_actual

EmpresaContratista (Entity)
├── nombre, rut, contacto, activo

CatalogoSistema (Entity)
├── codigo, nombre, orden, activo

CatalogoItem (Entity)
├── sistema_id, codigo_item, descripcion, activo
```

### 4.3 Contexto: Identidad *(Generic Domain)*

```
Usuario (Entity)
├── nombre, email, cargo, password_hash
├── rol: Rol (enum: tecnico_inspector | jefe_inspeccion | administrador)
├── firma_url (firma digital del técnico/jefe)
└── activo
```

### 4.4 Contexto: Auditoría *(Generic Domain)*

```
AuditLog (Entity — inmutable)
├── usuario_id, accion, entidad, entidad_id
├── timestamp, ip
└── detalle: JSONB (diff antes/después)

Notificacion (Entity)
├── usuario_id, tipo, titulo, mensaje
├── referencia_id, referencia_tipo
└── leida, created_at
```

---

## 5. Arquitectura del Frontend

```
src/
├── pages/                        # Vistas por rol
│   ├── LoginPage.tsx
│   ├── TecnicoInspectorDashboard.tsx
│   ├── JefeInspeccionDashboard.tsx
│   └── AdministradorDashboard.tsx
│
├── components/
│   ├── planilla/                 # Formulario de inspección
│   │   ├── SistemaChecklist.tsx  # Un sistema con expand/collapse + ítems E/S/NA
│   │   ├── HallazgosPanel.tsx    # Lista de hallazgos con acciones
│   │   ├── FirmasTecnicosPanel.tsx # Firma del logueado + agregar adicionales
│   │   ├── SelloAprobacion.tsx   # Muestra el sello post-aprobación
│   │   └── AprobacionFinalPanel.tsx # Solo jefe: firma y botón aprobar
│   ├── vehiculo/
│   ├── empresa/
│   ├── analytics/
│   ├── mantenimiento/
│   └── ui/                       # Design system: Button, Badge, Modal, etc.
│
├── context/
│   └── AuthContext.tsx            # Usuario autenticado, rol, logout
│
├── hooks/
│   ├── useOfflineSync.ts          # Cola IndexedDB + sincronización SW
│   └── useInspecciones.ts
│
├── lib/
│   ├── api.ts                     # fetch wrapper (base URL, cookies, errores)
│   └── validators.ts              # Esquemas Zod espejados con Pydantic
│
├── types/                         # Tipos TypeScript del dominio
│   ├── inspeccion.ts
│   ├── vehiculo.ts
│   ├── empresa.ts
│   └── usuario.ts
│
└── sw/
    └── service-worker.ts          # Workbox: cache, cola offline
```

---

## 6. Modelo de Datos (Esquema Relacional)

```
empresas_contratistas
  id, nombre, rut, contacto, activo, created_at

vehiculos
  id, placa (UNIQUE), empresa_contratista_id (FK), marca, modelo, año
  tipo_vehiculo, numero_interno, color, equipo_auxiliar
  area_transitar, kilometraje_actual, created_at

catalogo_sistemas
  id, codigo, nombre, orden, activo

catalogo_checklist                       ← ítems del checklist
  id, sistema_id (FK), codigo_item, nombre, descripcion, activo

usuarios
  id, nombre, email, cargo, password_hash, rol, firma_url, activo, created_at

inspecciones
  id, numero_inspeccion (BIGSERIAL), numero_revision (INT, default 1)
  inspeccion_previa_id (FK self, nullable)
  vehiculo_id (FK), empresa_contratista_id (FK)
  creado_por_id (FK → usuarios)
  fecha, hora_inspeccion, kilometraje
  area_transitar, equipo_auxiliar (snapshot del vehículo al momento)
  estado (enum: en_revision | con_hallazgos | pendiente_aprobacion |
                segunda_revision_solicitada | aprobado)
  dictamen_general (aprobado | con_hallazgos — calculado)
  hallazgos_texto (TEXT — campo libre para resumen)
  fecha_aprobacion (nullable), aprobado_por_id (FK → usuarios, nullable)
  fecha_proxima_revision (DATE, nullable — calculada post-aprobación)
  sello_url (TEXT, nullable — URL del sello generado)
  observaciones, created_at, updated_at, deleted_at

evaluaciones_sistema                     ← dictamen por sistema (calculado)
  id, inspeccion_id (FK), sistema_id (FK)
  estado_sistema (aprobado | no_aprobado | na)

checklist_items                          ← respuesta por ítem
  id, inspeccion_id (FK), catalogo_id (FK)
  valor (estandar | subestandar | na), comentario (nullable)

hallazgos
  id, inspeccion_id (FK), item_checklist_id (FK, nullable)
  descripcion, atendido (BOOL), fecha_atencion (DATE, nullable)
  created_at, updated_at

firmas_tecnicos
  id, inspeccion_id (FK)
  usuario_id (FK → usuarios, nullable — logueado)
  nombre_adicional (TEXT, nullable — técnicos sin login)
  es_aprobador (BOOL — true = firma del jefe al aprobar)
  firma_url (TEXT), signed_at

evidencias_fotograficas
  id, inspeccion_id (FK), checklist_item_id (FK, nullable)
  url, descripcion, created_at

mantenimientos
  id, vehiculo_id (FK), creado_por_id (FK), inspeccion_origen_id (FK, nullable)
  hallazgo_id (FK, nullable)
  tipo (preventivo | correctivo), descripcion, fecha_limite
  fecha_completado, kilometraje_al_crear, kilometraje_al_completar
  estado (pendiente | en_progreso | completado | vencido)
  observaciones, created_at, updated_at

notificaciones
  id, usuario_id (FK), tipo, titulo, mensaje
  referencia_id, referencia_tipo, leida, created_at

audit_logs
  id, usuario_id (FK), accion, entidad, entidad_id
  timestamp, ip, detalle (JSONB)
```

**Índices clave:**
```sql
INDEX idx_inspecciones_vehiculo_fecha    ON inspecciones(vehiculo_id, fecha)
INDEX idx_inspecciones_estado            ON inspecciones(estado)
INDEX idx_inspecciones_numero            ON inspecciones(numero_inspeccion)
INDEX idx_vehiculos_placa                ON vehiculos(placa)
INDEX idx_audit_usuario_ts               ON audit_logs(usuario_id, timestamp)
INDEX idx_notif_usuario_leida            ON notificaciones(usuario_id, leida, created_at)
```

---

## 7. Comunicación y Flujo de Datos

### Autenticación
```
Login → POST /api/auth/login
      → JWT en cookie httpOnly (nunca en JS/localStorage)
      → Cada request: middleware extrae cookie → valida JWT → verifica blacklist Redis
      → Logout: PUT /api/auth/logout → agrega jti a blacklist Redis con TTL
```

### Idempotencia (Offline Sync)
```
POST /api/inspecciones
  Header: X-Idempotency-Key: <uuid-v4>
  → Backend verifica key en Redis
  → Si existe: retorna respuesta cacheada (200, no duplica)
  → Si no: procesa normalmente, guarda key en Redis con TTL 5min
```

### Almacenamiento de Archivos
```
Frontend → POST /api/inspecciones/presigned-url {filename}
         ← {upload_url, file_url}
Frontend → PUT <upload_url> (archivo binario)
         → file_url se usa como referencia en la inspección
```
*(En producción: `upload_url` apunta a S3/R2 presigned URL; en dev: endpoint local mock)*

### Rate Limiting
```
SlowAPI (token bucket) por IP real (X-Forwarded-For)
Default: 100 req/min global
Login endpoint: 10 req/min (más restrictivo)
```

---

## 8. Seguridad en Capas

```
Nivel 1 — Red:      HTTPS obligatorio, HSTS, Secure cookies
Nivel 2 — API:      CORS estricto, CSP headers, X-Frame-Options
Nivel 3 — Auth:     JWT httpOnly, Redis blacklist, Argon2id, rate limit
Nivel 4 — Backend:  Roles verificados en cada endpoint (Depends)
                    SQLAlchemy parameterizado (sin raw SQL)
                    Pydantic valida todos los inputs
Nivel 5 — Datos:    Soft delete, AuditLog inmutable, JSONB diff
```

---

## 9. PWA y Estrategia Offline

```
Service Worker (Workbox)
├── Cache-First:  assets estáticos (JS, CSS, fuentes)
├── Network-First: API calls en online
└── Background Sync: cola de inspecciones offline

IndexedDB (idb)
└── Tabla: pending_inspections
    ├── idempotency_key (PK)
    ├── payload (JSON completo de la inspección)
    └── created_at

Sync flow:
  offline → save IndexedDB
  online  → SW detecta conexión
          → itera pending_inspections
          → POST /api/inspecciones con idempotency_key
          → (si 200 o 409) elimina de IndexedDB
          → actualiza UI
```

---

## 10. Convenciones de Código

| Aspecto | Convención |
|---|---|
| Idioma del código | Inglés (variables, funciones, clases) |
| Idioma de la UI / Docs | Español (es-CO) |
| Backend endpoints | snake_case, REST puro |
| Schemas Pydantic | CamelCase (class), snake_case (fields) |
| Frontend componentes | PascalCase |
| Frontend hooks | camelCase con prefijo `use` |
| Tests backend | `pytest`, un archivo por módulo en `tests/` |
| Migraciones | Una por cambio de esquema, nombre descriptivo |
