# Requerimientos del Proyecto — Sistema de Inspección Sointer Ltda.
**Versión:** 2.0 · **Fecha:** 2026-07-31

---

## 1. Descripción General

Sistema web PWA para digitalizar el proceso de inspección técnica de vehículos contratistas realizado por **Sointer Ltda.** bajo el formato estándar FO-M4-P13-96. El sistema reemplaza las planillas físicas, garantizando trazabilidad completa, seguimiento de hallazgos y aprobación formal auditable.

---

## 2. Partes Interesadas

| Rol del sistema | Descripción operativa |
|---|---|
| `tecnico_inspector` | Técnico de Sointer que realiza la inspección en campo |
| `jefe_inspeccion` | Responsable de supervisar, aprobar y exportar reportes |
| `administrador` | Gestiona usuarios, catálogos y empresas contratistas |

---

## 3. Requerimientos Funcionales

### RF-01 · Autenticación y Sesión
- RF-01.1: Login con email y contraseña (Argon2id).
- RF-01.2: Sesión persistida via JWT en cookie `httpOnly + Secure + SameSite=Strict`.
- RF-01.3: Logout real con invalidación del token en Redis (blacklist).
- RF-01.4: Expiración por inactividad (TTL Redis) y expiración absoluta del token.
- RF-01.5: Rate limiting por IP y por usuario (protección fuerza bruta).
- RF-01.6: No existe registro público; los usuarios son creados solo por el `administrador`.

### RF-02 · Gestión de Empresas Contratistas
- RF-02.1: Crear, listar, editar y desactivar empresas contratistas (solo `administrador`).
- RF-02.2: Campos: nombre, RUT, contacto, activo.

### RF-03 · Gestión de Vehículos (Alta Dinámica)
- RF-03.1: Los vehículos **no se pre-registran**; se crean al registrar la primera inspección.
- RF-03.2: La placa es el identificador único. Si ya existe, la nueva inspección se vincula al registro existente.
- RF-03.3: Campos del vehículo: placa, empresa contratista, marca, modelo, año, tipo, número interno, color, equipo auxiliar, área a transitar, kilometraje.
- RF-03.4: El `administrador` puede editar datos del vehículo independientemente de inspecciones.

### RF-04 · Catálogo de Sistemas e Ítems
- RF-04.1: El catálogo contiene 9 sistemas fijos según FO-M4-P13-96.
- RF-04.2: Cada sistema tiene un conjunto de ítems con código y descripción técnica.
- RF-04.3: El catálogo es editable solo por el `administrador`.
- RF-04.4: Los ítems pueden marcarse como `activo/inactivo` (no se eliminan).

### RF-05 · Creación de Inspección
- RF-05.1: Solo el `tecnico_inspector` puede crear inspecciones.
- RF-05.2: La inspección registra: empresa contratista, vehículo (por placa), kilometraje, hora, área a transitar, N° de inspección (auto-generado correlativo).
- RF-05.3: El formulario presenta los 9 sistemas con expand/collapse por sistema.
- RF-05.4: Cada ítem se evalúa como E / S / N/A, con campo de comentario opcional por ítem.
- RF-05.5: Los ítems `S` generan hallazgos automáticamente.
- RF-05.6: El técnico logueado firma digitalmente dentro del formulario.
- RF-05.7: El técnico puede agregar hasta 2 técnicos adicionales (máximo 3 en total) con nombre de texto libre.
- RF-05.8: Se pueden adjuntar evidencias fotográficas por inspección o por ítem.
- RF-05.9: El sistema soporta operación **offline** (PWA): los datos se guardan localmente y se sincronizan al recuperar conexión con idempotency key.
- RF-05.10: El dictamen general (aprobado/con hallazgos) es calculado automáticamente.

### RF-06 · Gestión de Hallazgos
- RF-06.1: Los hallazgos son visibles para `tecnico_inspector` y `jefe_inspeccion`.
- RF-06.2: El técnico puede marcar un hallazgo como "atendido" con fecha.
- RF-06.3: No se puede aprobar una inspección con hallazgos sin atender.

### RF-07 · Aprobación Final
- RF-07.1: Solo el `jefe_inspeccion` puede aprobar una inspección.
- RF-07.2: La aprobación solo está habilitada si la inspección está en estado `pendiente_aprobacion` y todos los hallazgos están atendidos.
- RF-07.3: El jefe firma digitalmente al aprobar.
- RF-07.4: Al aprobar, se genera automáticamente el sello digital (empresa, fecha, hora, "APROBADO", firma del jefe).
- RF-07.5: Se calcula y persiste la fecha de próxima revisión (+ 6 meses).
- RF-07.6: El estado `aprobado` es irreversible salvo intervención del `administrador` con registro de auditoría.

### RF-08 · Segunda Revisión
- RF-08.1: El `jefe_inspeccion` puede solicitar una segunda revisión.
- RF-08.2: La segunda revisión crea una **nueva inspección** vinculada a la original (`inspeccion_previa_id`).
- RF-08.3: La inspección original queda intacta como registro histórico.
- RF-08.4: El número de inspección de la segunda revisión es un nuevo correlativo.

### RF-09 · Visualización y Trazabilidad
- RF-09.1: El `jefe_inspeccion` y el `administrador` pueden ver todas las inspecciones con filtros.
- RF-09.2: El `tecnico_inspector` ve solo las inspecciones en las que participó.
- RF-09.3: La vista de trazabilidad muestra la cadena completa: inspección original → hallazgos → segunda revisión → aprobación.
- RF-09.4: Los filtros disponibles son: empresa contratista, placa, estado, técnico, rango de fechas.

### RF-10 · Exportación
- RF-10.1: El `jefe_inspeccion` puede exportar inspecciones a **Excel (.xlsx)** y **PDF**.
- RF-10.2: El PDF debe ser fiel al formato visual de la planilla FO-M4-P13-96 de Sointer.
- RF-10.3: El PDF incluye el sello digital de aprobación cuando aplica.
- RF-10.4: Toda exportación queda registrada en el AuditLog.

### RF-11 · Notificaciones In-App
- RF-11.1: Al crear una inspección, notificación al `jefe_inspeccion`.
- RF-11.2: Al registrar hallazgos, notificación al `jefe_inspeccion`.
- RF-11.3: Al pasar a `pendiente_aprobacion`, notificación al `jefe_inspeccion`.
- RF-11.4: Al aprobar, notificación al `tecnico_inspector` responsable.
- RF-11.5: Al solicitar segunda revisión, notificación al `tecnico_inspector`.
- RF-11.6: Al eliminar una inspección, notificación por email al `jefe_inspeccion`.

### RF-12 · Auditoría
- RF-12.1: Toda acción de escritura queda en `AuditLog` (crear, editar, aprobar, eliminar, exportar, login, logout).
- RF-12.2: El AuditLog es visible solo por `jefe_inspeccion` y `administrador`.
- RF-12.3: El AuditLog es inmutable.

### RF-13 · Gestión de Usuarios
- RF-13.1: Solo el `administrador` puede crear, editar y desactivar usuarios.
- RF-13.2: Roles disponibles: `tecnico_inspector`, `jefe_inspeccion`, `administrador`.
- RF-13.3: Cada usuario tiene: nombre, email, cargo, rol, contraseña (hash Argon2id), URL de firma, activo.

---

## 4. Requerimientos No Funcionales

### RNF-01 · Seguridad
| Riesgo | Mitigación |
|--------|------------|
| XSS | Sanitización de inputs + escape en output + CSP headers |
| Inyección SQL | SQLAlchemy con queries parametrizadas exclusivamente |
| Fuerza bruta | Rate limiting token bucket via Redis (por IP y usuario) |
| Tokens predecibles | `secrets.token_urlsafe` |
| Sesión indebida | Expiración por inactividad + expiración absoluta |
| Passwords débiles | Argon2id (memory-hard) |
| Timing attacks | Delegado a la librería Argon2 |
| Robo de token via JS | Cookie httpOnly, nunca localStorage |
| CSRF | SameSite=Strict + CSRF token en mutaciones sensibles |
| Doble envío | Idempotency keys en endpoints de creación |
| Escalamiento privilegios | Rol verificado en backend, nunca solo en UI |

### RNF-02 · Disponibilidad Offline (PWA)
- La aplicación debe funcionar sin conexión para el flujo de creación de inspecciones.
- Los datos se almacenan en IndexedDB y se sincronizan al recuperar red.
- El service worker gestiona la cola de sincronización.
- Las inspecciones offline usan idempotency key para evitar duplicados al sincronizar.

### RNF-03 · Rendimiento
- Paginación en todos los listados (máx. 100 por página por defecto).
- Lazy loading de imágenes y firmas desde almacenamiento estático/S3.
- Índices de BD en columnas de búsqueda frecuente.

### RNF-04 · Escalabilidad
- Arquitectura en capas desacopladas; escalable horizontalmente sin reescritura.
- Variables de entorno para configuración de entornos (dev, staging, prod).

### RNF-05 · Usabilidad
- Interfaz responsive: funcional en móvil (técnico en campo) y escritorio (jefe).
- Formulario de inspección con expand/collapse por sistema para reducir carga visual.
- Retroalimentación visual inmediata en estados de carga, error y éxito.

### RNF-06 · Integridad de Datos
- Toda eliminación es lógica (soft delete con `deleted_at`).
- El número de inspección es generado por secuencia de PostgreSQL (atómico, sin gaps).
- El dictamen general y por sistema es siempre calculado, nunca ingresado.

---

## 5. Restricciones y Supuestos

- La empresa Sointer Ltda. administra el sistema: ningún externo (empresa contratista) tiene acceso.
- Las credenciales de usuario se crean manualmente por el administrador (no hay registro público).
- El almacenamiento de imágenes y firmas es local en MVP (simulación de S3); en producción se migra a S3/R2.
- El sistema opera principalmente en Colombia (zona horaria `America/Bogota`).
- El idioma del sistema es español (es-CO).
