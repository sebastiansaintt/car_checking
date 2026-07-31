# Casos de Uso, Secuencias y Flujos — Sistema de Inspección Sointer Ltda.
**Versión:** 2.0 · **Fecha:** 2026-07-31

---

## Actores del Sistema

| Actor | Descripción |
|---|---|
| **Técnico Inspector** (`tecnico_inspector`) | Realiza inspecciones en campo |
| **Jefe de Inspección** (`jefe_inspeccion`) | Supervisa, aprueba y exporta |
| **Administrador** (`administrador`) | Gestiona usuarios, catálogos y empresas |
| **Sistema** | Procesa reglas automáticas (dictamen, sello, fecha próxima revisión) |

---

## CU-01 · Login

**Actor:** Cualquier usuario registrado

**Flujo principal:**
1. Usuario ingresa email y contraseña.
2. Sistema verifica credenciales contra hash Argon2id.
3. Sistema genera JWT con `jti` único y lo setea como cookie `httpOnly`.
4. Sistema registra login en AuditLog.
5. Sistema redirige al dashboard según el rol del usuario.

**Flujos alternativos:**
- `A1` Credenciales incorrectas → mensaje de error genérico (no revela si email o password falló). Incrementa contador de intentos.
- `A2` Más de 5 intentos fallidos en 15 min → rate limiter bloquea la IP temporalmente.
- `A3` Token previo en blacklist → acceso denegado, debe hacer login nuevamente.

---

## CU-02 · Crear Inspección (flujo principal del sistema)

**Actor:** Técnico Inspector  
**Precondición:** Usuario autenticado con rol `tecnico_inspector`.

### Flujo Principal (online)

```
Técnico                  Frontend                   Backend               BD / Redis
   │                        │                           │                      │
   │── Selecciona "Nueva"──►│                           │                      │
   │                        │── GET /inspecciones/      │                      │
   │                        │   checklist-catalog ─────►│                      │
   │                        │◄─ lista de sistemas/ítems ─│                      │
   │                        │                           │                      │
   │── Ingresa placa ───────►│                           │                      │
   │                        │── GET /vehiculos/by-placa►│                      │
   │                        │◄─ vehiculo existente o    │                      │
   │                        │   null (alta al crear) ───│                      │
   │                        │                           │                      │
   │── Completa formulario  │                           │                      │
   │   (sistema por sistema,│                           │                      │
   │   E/S/N/A por ítem) ──►│                           │                      │
   │                        │                           │                      │
   │── Agrega técnicos     ─►│ (máximo 2 adicionales)   │                      │
   │── Captura firma ───────►│ (Canvas → base64/URL)    │                      │
   │── Adjunta fotos ───────►│ POST /mock-s3-upload ───►│                      │
   │                        │◄─ {file_url} ─────────────│                      │
   │                        │                           │                      │
   │── Envía formulario ────►│                           │                      │
   │                        │── POST /inspecciones ────►│                      │
   │                        │   {X-Idempotency-Key}     │── Verifica key ─────►│
   │                        │                           │◄─ (nueva) ───────────│
   │                        │                           │                      │
   │                        │                           │── Busca vehículo     │
   │                        │                           │   por placa ────────►│
   │                        │                           │◄─ existente/null ────│
   │                        │                           │                      │
   │                        │                           │── (si null) crea     │
   │                        │                           │   vehículo ─────────►│
   │                        │                           │                      │
   │                        │                           │── Genera número      │
   │                        │                           │   correlativo ──────►│
   │                        │                           │                      │
   │                        │                           │── [Dominio]          │
   │                        │                           │   CalculaDictamen    │
   │                        │                           │   por sistema        │
   │                        │                           │   y general          │
   │                        │                           │                      │
   │                        │                           │── Guarda atómica-    │
   │                        │                           │   mente: inspección, │
   │                        │                           │   evaluaciones,      │
   │                        │                           │   hallazgos, firma  ►│
   │                        │                           │                      │
   │                        │                           │── Actualiza km del   │
   │                        │                           │   vehículo ─────────►│
   │                        │                           │                      │
   │                        │                           │── AuditLog ─────────►│
   │                        │                           │── Notifica jefe ─────│
   │                        │                           │── Guarda idempotency►│
   │                        │◄── InspeccionResponse ────│                      │
   │◄── Toast "Registrada" ─│                           │                      │
```

### Flujo Alternativo: Offline (PWA)

```
Técnico          Frontend (SW + IndexedDB)          Backend (cuando hay red)
   │                        │                                │
   │── Completa formulario ─►│                               │
   │                        │── (sin red)                   │
   │                        │── Guarda en IndexedDB ─────────│ (local)
   │                        │   con idempotency_key          │
   │◄── Toast "Guardada    ─│                               │
   │    offline"            │                               │
   │                        │                               │
   │  (Recupera conexión)   │                               │
   │                        │── SW detecta red              │
   │                        │── Lee cola IndexedDB          │
   │                        │── POST /inspecciones ────────►│
   │                        │   {X-Idempotency-Key}         │── (procesa igual)
   │◄── Toast "Sincronizada"─│                               │
```

### Post-Condiciones
- Inspección creada con estado `en_revision` (si hay ítems S) o `pendiente_aprobacion`.
- Hallazgos generados automáticamente por cada ítem S.
- Kilometraje del vehículo actualizado.
- Notificación enviada al Jefe de Inspección.

---

## CU-03 · Gestión de Hallazgos

**Actor:** Técnico Inspector  
**Precondición:** Inspección con estado `con_hallazgos`.

**Flujo:**
1. Técnico accede a la inspección con hallazgos desde su panel.
2. Sistema muestra la lista de hallazgos pendientes.
3. Técnico selecciona un hallazgo y lo marca como "atendido", ingresando fecha de atención.
4. Sistema actualiza el hallazgo. Si todos los hallazgos están atendidos, el estado de la inspección cambia automáticamente a `pendiente_aprobacion`.
5. Sistema notifica al Jefe de Inspección que la inspección está lista para aprobación.

---

## CU-04 · Aprobación Final

**Actor:** Jefe de Inspección  
**Precondición:** Inspección en estado `pendiente_aprobacion`, todos los hallazgos atendidos.

```
Jefe                     Frontend                   Backend               BD
  │                         │                           │                   │
  │── Abre panel pendientes─►│                          │                   │
  │                         │── GET /inspecciones?      │                   │
  │                         │   estado=pendiente_apro. ►│                   │
  │                         │◄─ lista ──────────────────│                   │
  │                         │                           │                   │
  │── Selecciona inspección ►│                          │                   │
  │                         │── GET /inspecciones/{id}─►│                   │
  │                         │◄─ detalle completo ────────│                   │
  │                         │   (sistemas, hallazgos,   │                   │
  │                         │    técnicos, evidencias)  │                   │
  │                         │                           │                   │
  │── Revisa y captura      │                           │                   │
  │   firma de aprobación ─►│                           │                   │
  │                         │                           │                   │
  │── Confirma aprobación ─►│                           │                   │
  │                         │── POST /inspecciones/     │                   │
  │                         │   {id}/aprobar ──────────►│                   │
  │                         │   {firma_url}             │── [Dominio]       │
  │                         │                           │   Verifica prec.  │
  │                         │                           │   Cambia estado──►│
  │                         │                           │── Genera sello────►│
  │                         │                           │   (Sointer, fecha,│
  │                         │                           │   hora, APROBADO) │
  │                         │                           │── fecha_próxima   │
  │                         │                           │   (+ 6 meses) ───►│
  │                         │                           │── AuditLog ───────►│
  │                         │                           │── Notifica técnico─│
  │                         │◄── InspeccionAprobada ────│                   │
  │◄── Sello visible en UI ─│                           │                   │
```

---

## CU-05 · Solicitar Segunda Revisión

**Actor:** Jefe de Inspección  
**Precondición:** Inspección con hallazgos que no pueden atenderse sin regresar el vehículo.

**Flujo:**
1. Jefe revisa la inspección con hallazgos.
2. Jefe selecciona "Solicitar Segunda Revisión" con observaciones.
3. Sistema crea una **nueva inspección** con:
   - `inspeccion_previa_id` = ID de la inspección actual.
   - `numero_revision = 2`.
   - Nuevo número correlativo.
   - Estado inicial: `en_revision`.
4. La inspección original queda en estado `segunda_revision_solicitada` (inmutable).
5. Sistema notifica al Técnico Inspector responsable.
6. El Técnico realiza la segunda inspección siguiendo el flujo CU-02.

---

## CU-06 · Visualización de Trazabilidad

**Actor:** Jefe de Inspección, Administrador  
**Descripción:** Vista que muestra la cadena completa de vida de un vehículo/inspección.

```
Placa: NYP058
└─ Inspección #4791 (30/07/26 - en_revision)
   ├─ Sistema 1: Dirección ✓ Aprobado
   ├─ Sistema 2: Motor ✗ No Aprobado
   │   └─ Hallazgo: "Correa desgastada" → Atendido: 31/07/26
   └─ Segunda Revisión solicitada
       └─ Inspección #4792 (31/07/26 - aprobado)
           ├─ Todos los sistemas: Aprobados
           ├─ Técnicos: Jhon R., Eduardo B.
           ├─ Aprobado por: Jefe García · 31/07/26 14:30
           └─ Próxima revisión: 31/01/27
```

---

## CU-07 · Exportar Reporte

**Actor:** Jefe de Inspección  
**Flujo:**
1. Jefe aplica filtros (empresa, placa, estado, fechas).
2. Jefe selecciona formato: PDF o Excel.
3. Sistema genera el documento (PDF fiel al FO-M4-P13-96 con sello de aprobación si aplica).
4. Sistema registra la exportación en AuditLog.
5. El archivo se descarga en el navegador del usuario.

---

## CU-08 · Gestión de Usuarios (Administrador)

**Actor:** Administrador

| Acción | Endpoint | Restricción |
|--------|----------|-------------|
| Crear usuario | POST /usuarios | Solo admin |
| Editar usuario | PUT /usuarios/{id} | Solo admin |
| Desactivar usuario | PATCH /usuarios/{id}/desactivar | Solo admin; no puede desactivarse a sí mismo |
| Listar usuarios | GET /usuarios | Admin y Jefe |

---

## CU-09 · Gestión de Empresas Contratistas (Administrador)

**Actor:** Administrador  
**Flujo estándar CRUD:** Crear, listar, editar, desactivar empresas contratistas.  
**Restricción:** Solo el `administrador` puede realizar estas operaciones.

---

## Secuencia: Flujo Completo de Aprobación (Happy Path)

```
Técnico crea inspección
        │
        ▼
[Sistema calcula dictamen]
        │
        ├── Todos E/NA ──────────► Estado: pendiente_aprobacion
        │                                 │
        │                                 ▼
        │                       Jefe revisa y aprueba
        │                                 │
        │                                 ▼
        │                       Estado: aprobado ──► Sello generado
        │                                            Próxima revisión calculada
        │
        └── Algún S ───────────► Estado: con_hallazgos
                │                         │
                │                         ▼
                │               Técnico atiende hallazgos
                │                         │
                │                    (¿todos atendidos?)
                │                    ├── SÍ ──► Estado: pendiente_aprobacion
                │                    │                   (vuelve al camino arriba)
                │                    │
                │                    └── NO ──► Jefe solicita 2da revisión
                │                                         │
                │                                         ▼
                └───────────────────────────► Nueva inspección creada
                                              (inspeccion_previa_id referencia
                                               la inspección original)
```

---

## Diagrama de Estados: Inspección

```
                    ┌──────────────┐
                    │  en_revision  │ ◄─── (creación)
                    └──────┬───────┘
                           │
               ┌───────────┴────────────┐
               │                        │
          (algún S)                 (todos E/NA)
               │                        │
               ▼                        ▼
    ┌────────────────────┐   ┌──────────────────────┐
    │  con_hallazgos     │   │  pendiente_aprobacion │
    └──────────┬─────────┘   └───────────┬──────────┘
               │                         │
    (hallazgos atendidos)        (jefe aprueba)
               │                         │
               ▼                         ▼
    ┌──────────────────────┐    ┌─────────────────┐
    │pendiente_aprobacion  │    │    aprobado      │ (inmutable)
    └──────────────────────┘    └─────────────────┘
               │
    (2da revisión solicitada)
               │
               ▼
    ┌──────────────────────────────┐
    │ segunda_revision_solicitada  │ (inmutable)
    └──────────────────────────────┘
               │
               ▼
    Nueva Inspección (numero_revision = 2)
```
