# Reglas de Negocio — Sistema de Inspección Sointer Ltda.
**Código:** RN · **Versión:** 2.0 · **Fecha:** 2026-07-31

---

## Contexto Operativo

Sointer Ltda. es una empresa **interventora contratista**: no posee la flota vehicular inspeccionada. Recibe vehículos de empresas contratistas externas (p.ej. Epromecánica, proveedores de Cerrejón), los somete a revisión técnica estandarizada según formato **FO-M4-P13-96**, y emite un dictamen de aprobación o rechaza el equipo hasta que cumpla los estándares.

El sistema digitaliza este proceso garantizando **trazabilidad, seguimiento y aprobación real y verificable**.

---

## Reglas de Dominio

### RN-01 · Empresa Contratista (Origen del Vehículo)

- Todo vehículo inspeccionado pertenece a una **empresa contratista externa**.
- La empresa contratista debe estar registrada en el sistema antes de registrar una inspección.
- Un vehículo **no puede existir en el sistema sin estar vinculado a una empresa contratista**.

---

### RN-02 · Registro de Vehículos (Alta Dinámica por Placa)

- **No existe una lista fija de vehículos**. Los vehículos se crean en el momento de la primera inspección.
- La **placa** es el identificador único de un vehículo.
- Si al registrar una inspección la placa ya existe, el sistema **vincula la nueva inspección al vehículo existente** sin crear un duplicado.
- Si la placa no existe, se crea un nuevo registro de vehículo en ese momento.
- Los campos mínimos requeridos al crear/identificar un vehículo son: `placa`, `empresa_contratista_id`, `marca`, `modelo`, `año`, `tipo_vehiculo`, `numero_interno`, `color`, `equipo_auxiliar`, `area_transitar`.

---

### RN-03 · Estructura de la Planilla (Sistemas e Ítems)

- La inspección evalúa **9 sistemas técnicos** según la planilla FO-M4-P13-96:

| # | Sistema |
|---|---------|
| 1 | Sistema de Dirección |
| 2 | Sistema de Potencia (Motor) |
| 3 | Sistema de Transmisión y Diferenciales |
| 4 | Sistema Chasis – Cabina / Seguridad Pasiva–Activa |
| 5 | Sistema Eléctrico / Aire Acondicionado |
| 6 | Sistema de Frenos |
| 7 | Sistema de Suspensión |
| 8 | Equipo Auxiliar |
| 9 | Rines y Llantas |

- Cada sistema contiene **ítems individuales** con descripción técnica específica.
- Cada ítem se evalúa con uno de tres estados:
  - **E — Estándar**: cumple el requisito.
  - **S — Subestándar**: no cumple; genera un hallazgo.
  - **N/A — No Aplica**: el ítem no corresponde a este vehículo.

---

### RN-04 · Dictamen por Sistema

- Un sistema queda **APROBADO** si todos sus ítems son `E` o `N/A`.
- Un sistema queda **NO APROBADO** si al menos un ítem es `S`.
- El estado por sistema es **calculado automáticamente** por el dominio; no es ingresado manualmente.

---

### RN-05 · Dictamen General de la Inspección

- La inspección queda **APROBADA** solo si **todos los sistemas evaluados están aprobados**.
- Si al menos un sistema está "No Aprobado", la inspección queda en estado **CON HALLAZGOS**.
- El dictamen general es **calculado automáticamente** a partir de los dictámenes por sistema.
- El dictamen general nunca es ingresado manualmente por el técnico.

---

### RN-06 · Hallazgos

- Cada ítem evaluado como `S` genera automáticamente un **hallazgo** en la inspección.
- Los hallazgos se registran en la sección "HALLAZGOS" de la planilla, con columna de estado de atención (`A`) y fecha de atención.
- Un hallazgo puede marcarse como **atendido** una vez que el defecto fue corregido.
- **Todos los hallazgos deben estar atendidos** antes de que el Jefe de Inspección pueda emitir la aprobación final.

---

### RN-07 · Máquina de Estados de la Inspección

La inspección sigue el siguiente ciclo de vida:

```
en_revision
    │
    ├─── (todos E/NA) ──────────────────► pendiente_aprobacion
    │                                             │
    └─── (algún S) ──► con_hallazgos             │ (Jefe aprueba)
                            │                    ▼
                            ├─ (hallazgos        aprobado  ◄── (inmutable)
                            │   atendidos)
                            │
                            └─ (segunda revisión solicitada)
                                        │
                                        ▼
                               nueva_inspeccion (RN-08)
```

- El estado `aprobado` es **inmutable**: solo el `administrador` puede reabrir una inspección aprobada, con registro de auditoría obligatorio.
- Un vehículo **no puede circular** hasta tener una inspección en estado `aprobado`.

---

### RN-08 · Segunda Revisión (Re-inspección)

- Si la primera inspección tiene hallazgos no resolubles in situ, el Jefe de Inspección puede solicitar una **segunda revisión**.
- La segunda revisión genera una **nueva entidad `Inspeccion`** con:
  - `numero_revision = 2`
  - `inspeccion_previa_id` referenciando a la inspección original
  - Un nuevo número de inspección correlativo
- La inspección original **no se modifica**: queda como registro histórico (auditabilidad).
- La planilla física indica: *"El servicio contempla un segundo chequeo. Si en el primero los resultados no fueron satisfactorios."*

---

### RN-09 · Número de Inspección Correlativo

- Cada inspección recibe un **número correlativo único** (`numero_inspeccion`), gestionado por una secuencia de PostgreSQL.
- El número es ascendente, sin gaps visibles al usuario, y nunca se reutiliza (ni en eliminaciones).

---

### RN-10 · Técnicos Firmantes

- **Solo el técnico autenticado** (logueado) puede firmar una inspección.
- El técnico logueado es automáticamente el primer firmante.
- Durante el llenado del formulario, el técnico puede **agregar hasta 2 técnicos adicionales** (máximo 3 firmantes en total por inspección), especificando sus nombres.
- Los técnicos adicionales **no necesitan estar logueados**; su nombre se registra como texto (representan a los técnicos que actuaron físicamente).
- La firma del técnico logueado es **capturada digitalmente** dentro del formulario.
- El Jefe de Inspección tiene una **firma separada** al momento de aprobar (no forma parte de los 3 técnicos).

---

### RN-11 · Aprobación Final por el Jefe de Inspección

- Solo el rol `jefe_inspeccion` puede emitir la aprobación final.
- Para aprobar, deben cumplirse las siguientes precondiciones:
  1. La inspección está en estado `pendiente_aprobacion` (todos los sistemas aprobados).
  2. Todos los hallazgos están marcados como atendidos.
- Al aprobar, el sistema registra:
  - La firma digital del jefe.
  - La fecha y hora exacta de aprobación.
  - El estado cambia a `aprobado` (irreversible salvo acción de `administrador`).

---

### RN-12 · Sello de Aprobación (Estampado Digital)

- Al ser aprobada una inspección, el sistema genera automáticamente un **sello digital** que incluye:
  - Nombre de la empresa: **Sointer Ltda.**
  - Fecha y hora de creación de la inspección.
  - Fecha y hora de aprobación.
  - Texto: **APROBADO**
  - Firma del Jefe de Inspección.
- Este sello es parte del registro persistido y aparece en la exportación PDF/Excel.

---

### RN-13 · Fecha de Próxima Revisión

- Al ser aprobada una inspección, se calcula automáticamente la **fecha de próxima revisión** como `fecha_aprobacion + 6 meses`.
- Esta fecha queda asociada al vehículo y visible en el panel del Jefe de Inspección.

---

### RN-14 · Kilometraje

- El kilometraje registrado en la inspección **no puede ser menor** al último kilometraje registrado para ese vehículo.
- Al crear una inspección, el kilometraje actual del vehículo se actualiza con el valor ingresado.

---

### RN-15 · Eliminación Lógica (Soft Delete)

- Los registros de inspección **nunca se eliminan físicamente**.
- La eliminación es lógica (`deleted_at` timestamp).
- Toda eliminación genera un evento en el `AuditLog` y una notificación al `jefe_inspeccion`.

---

### RN-16 · Auditoría Obligatoria

- Toda acción de creación, modificación, aprobación, solicitud de segunda revisión o eliminación de una inspección queda registrada en `AuditLog` con:
  - Usuario responsable, acción, entidad, timestamp, IP, diff antes/después.
- El AuditLog es **inmutable**: ningún rol puede modificarlo ni eliminarlo.
