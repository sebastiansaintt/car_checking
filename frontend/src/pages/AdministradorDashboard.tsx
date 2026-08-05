import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, EmpresaContratista, CatalogoSistema } from '../types';
import { AuditLogItem } from '../types/auditLog';
import { apiFetch } from '../lib/api';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { ToastNotification } from '../components/ui/ToastNotification';
import { AppShell } from '../components/ui/AppShell';
import { NotificationCenter } from '../components/ui/NotificationCenter';
import {
  Users,
  Building2,
  Layers,
  ShieldAlert,
  PlusCircle,
  Edit3,
  RefreshCw,
  Code,
} from 'lucide-react';

type Tab = 'usuarios' | 'empresas' | 'catalogo' | 'auditoria';

const rolLabel: Record<string, string> = {
  administrador:     'Administrador',
  jefe_inspeccion:   'Jefe de Inspección',
  tecnico_inspector: 'Técnico Inspector',
  coordinador:       'Técnico Inspector',
  gerente:           'Jefe de Inspección',
};

export const AdministradorDashboard: React.FC = () => {
  useAuth();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
  const [sistemas, setSistemas] = useState<CatalogoSistema[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // User Modal
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [uNombre, setUNombre] = useState<string>('');
  const [uEmail, setUEmail] = useState<string>('');
  const [uPassword, setUPassword] = useState<string>('');
  const [uRol, setURol] = useState<string>('tecnico_inspector');
  const [uCargo, setUCargo] = useState<string>('');

  // Empresa Modal
  const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState<boolean>(false);
  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaContratista | null>(null);
  const [eNombre, setENombre] = useState<string>('');
  const [eRut, setERut] = useState<string>('');
  const [eContacto, setEContacto] = useState<string>('');

  // Audit detail
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uData, eData, sData, aData] = await Promise.all([
        apiFetch<User[]>('/usuarios').catch(() => []),
        apiFetch<EmpresaContratista[]>('/empresas-contratistas').catch(() => []),
        apiFetch<CatalogoSistema[]>('/inspecciones/sistemas-catalog').catch(() => []),
        apiFetch<AuditLogItem[]>('/audit-logs?limit=100').catch(() => []),
      ]);
      setUsuarios(uData);
      setEmpresas(eData);
      setSistemas(sData);
      setAuditLogs(aData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar los datos';
      setToast({ message: msg, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenUserModal = (u?: User) => {
    if (u) {
      setEditingUser(u); setUNombre(u.nombre); setUEmail(u.email);
      setUPassword(''); setURol(u.rol); setUCargo(u.cargo || '');
    } else {
      setEditingUser(null); setUNombre(''); setUEmail('');
      setUPassword(''); setURol('tecnico_inspector'); setUCargo('');
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        const body: Record<string, any> = { nombre: uNombre, email: uEmail, rol: uRol, cargo: uCargo };
        if (uPassword) body.password = uPassword;
        await apiFetch(`/usuarios/${editingUser.id}`, { method: 'PUT', body: JSON.stringify(body) });
        setToast({ message: 'Usuario actualizado.', type: 'success' });
      } else {
        if (!uPassword) { setToast({ message: 'Ingrese una contraseña.', type: 'error' }); return; }
        await apiFetch('/usuarios', {
          method: 'POST',
          body: JSON.stringify({ nombre: uNombre, email: uEmail, password: uPassword, rol: uRol, cargo: uCargo }),
        });
        setToast({ message: 'Usuario creado.', type: 'success' });
      }
      setIsUserModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el usuario';
      setToast({ message: msg, type: 'error' });
    }
  };

  const handleOpenEmpresaModal = (emp?: EmpresaContratista) => {
    if (emp) {
      setEditingEmpresa(emp); setENombre(emp.nombre); setERut(emp.rut || ''); setEContacto(emp.contacto || '');
    } else {
      setEditingEmpresa(null); setENombre(''); setERut(''); setEContacto('');
    }
    setIsEmpresaModalOpen(true);
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const body = { nombre: eNombre, rut: eRut, contacto: eContacto };
      if (editingEmpresa) {
        await apiFetch(`/empresas-contratistas/${editingEmpresa.id}`, { method: 'PUT', body: JSON.stringify(body) });
        setToast({ message: 'Empresa actualizada.', type: 'success' });
      } else {
        await apiFetch('/empresas-contratistas', { method: 'POST', body: JSON.stringify(body) });
        setToast({ message: 'Empresa registrada.', type: 'success' });
      }
      setIsEmpresaModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la empresa';
      setToast({ message: msg, type: 'error' });
    }
  };

  const navItems = [
    { id: 'usuarios',  label: `Usuarios (${usuarios.length})`,   icon: <Users className="w-4 h-4" /> },
    { id: 'empresas',  label: `Empresas (${empresas.length})`,   icon: <Building2 className="w-4 h-4" /> },
    { id: 'catalogo',  label: `Sistemas (${sistemas.length})`,   icon: <Layers className="w-4 h-4" /> },
    { id: 'auditoria', label: `Auditoría (${auditLogs.length})`, icon: <ShieldAlert className="w-4 h-4" /> },
  ];

  return (
    <>
      <ToastNotification
        message={toast?.message ?? null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />

      <AppShell
        navItems={navItems}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as Tab)}
        headerRight={<NotificationCenter />}
      >
        <div className="p-6 space-y-5">

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton h-8 rounded" />)}
            </div>
          ) : (
            <>
              {/* ── TAB: USUARIOS ───────────────────────────────── */}
              {activeTab === 'usuarios' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-base font-semibold text-[#111827]">Usuarios y Roles</h1>
                      <p className="text-sm text-[#6B7280]">Gestión de personal autorizado en la plataforma.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={loadData}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => handleOpenUserModal()}>
                        <PlusCircle className="w-3.5 h-3.5" /> Nuevo usuario
                      </Button>
                    </div>
                  </div>

                  <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="table-industrial">
                        <thead>
                          <tr>
                            <th>Nombre</th>
                            <th>Correo</th>
                            <th>Rol</th>
                            <th>Cargo</th>
                            <th>Estado</th>
                            <th className="text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usuarios.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="py-10 text-center text-[#9CA3AF] text-sm">
                                No hay usuarios registrados.
                              </td>
                            </tr>
                          ) : usuarios.map((u) => (
                            <tr key={u.id}>
                              <td className="font-medium text-[#111827]">{u.nombre}</td>
                              <td className="font-mono text-xs text-[#6B7280]">{u.email}</td>
                              <td className="text-xs text-[#374151]">{rolLabel[u.rol] ?? u.rol}</td>
                              <td className="text-xs text-[#6B7280]">{u.cargo || '—'}</td>
                              <td>
                                <Badge variant={u.activo ? 'apto' : 'no_apto'}>
                                  {u.activo ? 'Activo' : 'Inactivo'}
                                </Badge>
                              </td>
                              <td className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenUserModal(u)}>
                                  <Edit3 className="w-3.5 h-3.5" /> Editar
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: EMPRESAS ───────────────────────────────── */}
              {activeTab === 'empresas' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-base font-semibold text-[#111827]">Empresas Contratistas</h1>
                      <p className="text-sm text-[#6B7280]">Empresas propietarias de vehículos inspeccionados por Sointer.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={loadData}>
                        <RefreshCw className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="primary" size="sm" onClick={() => handleOpenEmpresaModal()}>
                        <PlusCircle className="w-3.5 h-3.5" /> Nueva empresa
                      </Button>
                    </div>
                  </div>

                  <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="table-industrial">
                        <thead>
                          <tr>
                            <th>Razón Social</th>
                            <th>RUT</th>
                            <th>Contacto</th>
                            <th>Estado</th>
                            <th className="text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {empresas.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-[#9CA3AF] text-sm">
                                No hay empresas registradas.
                              </td>
                            </tr>
                          ) : empresas.map((emp) => (
                            <tr key={emp.id}>
                              <td className="font-medium text-[#111827]">{emp.nombre}</td>
                              <td className="font-mono text-xs text-[#6B7280]">{emp.rut || '—'}</td>
                              <td className="text-xs text-[#6B7280]">{emp.contacto || '—'}</td>
                              <td>
                                <Badge variant={emp.activo ? 'apto' : 'no_apto'}>
                                  {emp.activo ? 'Activa' : 'Inactiva'}
                                </Badge>
                              </td>
                              <td className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => handleOpenEmpresaModal(emp)}>
                                  <Edit3 className="w-3.5 h-3.5" /> Editar
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB: CATÁLOGO 9 SISTEMAS ─────────────────────── */}
              {activeTab === 'catalogo' && (
                <div className="space-y-4">
                  <div>
                    <h1 className="text-base font-semibold text-[#111827]">Catálogo de 9 Sistemas</h1>
                    <p className="text-sm text-[#6B7280]">Estructura oficial planilla de interventoría FO-M4-P13-96.</p>
                  </div>
                  <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
                    <table className="table-industrial">
                      <thead>
                        <tr>
                          <th>Código</th>
                          <th>Sistema técnico</th>
                          <th>Orden</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sistemas.map((sys, idx) => (
                          <tr key={sys.id}>
                            <td className="font-mono text-xs font-semibold text-[#111827]">
                              {sys.codigo || String(idx + 1).padStart(2, '0')}
                            </td>
                            <td className="text-sm text-[#111827]">{sys.nombre}</td>
                            <td className="font-mono text-xs text-[#9CA3AF]">{sys.orden ?? idx + 1}</td>
                            <td><Badge variant="apto">Activo</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB: AUDITORÍA ──────────────────────────────── */}
              {activeTab === 'auditoria' && (
                <div className="space-y-4">
                  <div>
                    <h1 className="text-base font-semibold text-[#111827]">Bitácora de Auditoría</h1>
                    <p className="text-sm text-[#6B7280]">Registro de todas las acciones del sistema.</p>
                  </div>
                  <div className="border border-[#E5E7EB] rounded-container overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="table-industrial">
                        <thead>
                          <tr>
                            <th>Fecha / Hora</th>
                            <th>Acción</th>
                            <th>Entidad</th>
                            <th>IP</th>
                            <th className="text-right">Payload</th>
                          </tr>
                        </thead>
                        <tbody>
                          {auditLogs.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-10 text-center text-[#9CA3AF] text-sm">
                                Sin registros de auditoría.
                              </td>
                            </tr>
                          ) : auditLogs.map((log) => (
                            <tr key={log.id}>
                              <td className="font-mono text-xs text-[#6B7280]">
                                {new Date(log.timestamp).toLocaleString('es-CO')}
                              </td>
                              <td className="text-xs font-semibold uppercase tracking-wide">{log.accion}</td>
                              <td className="text-xs text-[#374151]">{log.entidad}</td>
                              <td className="font-mono text-xs text-[#9CA3AF]">{log.ip || '—'}</td>
                              <td className="text-right">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedAuditLog(log)}>
                                  <Code className="w-3.5 h-3.5" /> JSON
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Modal: Usuario ───────────────────────────────── */}
        <Modal
          isOpen={isUserModalOpen}
          onClose={() => setIsUserModalOpen(false)}
          title={editingUser ? `Editar: ${editingUser.nombre}` : 'Nuevo usuario'}
          description={editingUser ? `Modificando perfil — ${rolLabel[editingUser.rol] ?? editingUser.rol}` : 'Complete los campos del nuevo usuario.'}
          maxWidth="max-w-md"
          footer={
            <>
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsUserModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" type="submit" form="user-form">
                Guardar usuario
              </Button>
            </>
          }
        >
          <form id="user-form" onSubmit={handleSaveUser} className="flex flex-col gap-3">
            <Input label="Nombre completo" value={uNombre} onChange={(e) => setUNombre(e.target.value)} placeholder="Ej. Carlos Ruiz" required />
            <Input label="Correo electrónico" type="email" value={uEmail} onChange={(e) => setUEmail(e.target.value)} placeholder="usuario@sointer.com" required />
            <Input
              label={editingUser ? 'Nueva contraseña (dejar en blanco para mantener)' : 'Contraseña'}
              type="password" value={uPassword} onChange={(e) => setUPassword(e.target.value)}
              placeholder="••••••••" required={!editingUser}
            />
            <Select
              label="Rol"
              value={uRol}
              onChange={(e) => setURol(e.target.value)}
              options={[
                { value: 'tecnico_inspector', label: 'Técnico Inspector' },
                { value: 'jefe_inspeccion', label: 'Jefe de Inspección' },
                { value: 'administrador', label: 'Administrador' },
              ]}
            />
            <Input label="Cargo institucional" value={uCargo} onChange={(e) => setUCargo(e.target.value)} placeholder="Ej. Inspector de Terreno" />
          </form>
        </Modal>

        {/* ── Modal: Empresa ───────────────────────────────── */}
        <Modal
          isOpen={isEmpresaModalOpen}
          onClose={() => setIsEmpresaModalOpen(false)}
          title={editingEmpresa ? `Editar: ${editingEmpresa.nombre}` : 'Nueva empresa contratista'}
          maxWidth="max-w-md"
          footer={
            <>
              <Button variant="secondary" size="sm" type="button" onClick={() => setIsEmpresaModalOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" type="submit" form="empresa-form">
                Guardar empresa
              </Button>
            </>
          }
        >
          <form id="empresa-form" onSubmit={handleSaveEmpresa} className="flex flex-col gap-3">
            <Input label="Razón social" value={eNombre} onChange={(e) => setENombre(e.target.value)} placeholder="Ej. Epromecánica S.A.S." required />
            <Input label="RUT / Identificación" value={eRut} onChange={(e) => setERut(e.target.value)} placeholder="Ej. 900.123.456-7" />
            <Input label="Contacto" value={eContacto} onChange={(e) => setEContacto(e.target.value)} placeholder="Ej. contacto@empresa.com" />
          </form>
        </Modal>

        {/* ── Modal: Audit JSON ────────────────────────────── */}
        <Modal
          isOpen={!!selectedAuditLog}
          onClose={() => setSelectedAuditLog(null)}
          title="Detalle de auditoría"
          description={selectedAuditLog ? `${selectedAuditLog.accion} · ${selectedAuditLog.entidad}` : undefined}
          maxWidth="max-w-2xl"
        >
          {selectedAuditLog && (
            <pre className="p-4 bg-[#111827] text-[#F3F4F6] font-mono text-xs rounded-container overflow-x-auto leading-relaxed">
              {JSON.stringify(selectedAuditLog.detalle || {}, null, 2)}
            </pre>
          )}
        </Modal>
      </AppShell>
    </>
  );
};
