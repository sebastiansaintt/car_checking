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
import { NotificationCenter } from '../components/ui/NotificationCenter';
import {
  Users,
  Building2,
  Layers,
  ShieldAlert,
  LogOut,
  PlusCircle,
  Edit3,
  RefreshCw,
  Code,
  ShieldCheck
} from 'lucide-react';

export const AdministradorDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaContratista[]>([]);
  const [sistemas, setSistemas] = useState<CatalogoSistema[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);

  const [activeTab, setActiveTab] = useState<'usuarios' | 'empresas' | 'catalogo' | 'auditoria'>('usuarios');
  const [loading, setLoading] = useState<boolean>(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [uNombre, setUNombre] = useState<string>('');
  const [uEmail, setUEmail] = useState<string>('');
  const [uPassword, setUPassword] = useState<string>('');
  const [uRol, setURol] = useState<string>('tecnico_inspector');
  const [uCargo, setUCargo] = useState<string>('');

  // Empresa Modal State
  const [isEmpresaModalOpen, setIsEmpresaModalOpen] = useState<boolean>(false);
  const [editingEmpresa, setEditingEmpresa] = useState<EmpresaContratista | null>(null);
  const [eNombre, setENombre] = useState<string>('');
  const [eRut, setERut] = useState<string>('');
  const [eContacto, setEContacto] = useState<string>('');

  // Audit Log Detail Modal
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [uData, eData, sData, aData] = await Promise.all([
        apiFetch<User[]>('/usuarios').catch(() => []),
        apiFetch<EmpresaContratista[]>('/empresas-contratistas').catch(() => []),
        apiFetch<CatalogoSistema[]>('/inspecciones/sistemas-catalog').catch(() => []),
        apiFetch<AuditLogItem[]>('/audit-logs?limit=100').catch(() => [])
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

  useEffect(() => {
    loadData();
  }, []);

  // Handlers for User Modal
  const handleOpenUserModal = (u?: User) => {
    if (u) {
      setEditingUser(u);
      setUNombre(u.nombre);
      setUEmail(u.email);
      setUPassword('');
      setURol(u.rol);
      setUCargo(u.cargo || '');
    } else {
      setEditingUser(null);
      setUNombre('');
      setUEmail('');
      setUPassword('');
      setURol('tecnico_inspector');
      setUCargo('');
    }
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingUser) {
        // Update user
        const body: Record<string, any> = {
          nombre: uNombre,
          email: uEmail,
          rol: uRol,
          cargo: uCargo,
        };
        if (uPassword) body.password = uPassword;

        await apiFetch(`/usuarios/${editingUser.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        });
        setToast({ message: 'Usuario actualizado exitosamente.', type: 'success' });
      } else {
        // Create user
        if (!uPassword) {
          setToast({ message: 'Debe ingresar una contraseña para el usuario.', type: 'error' });
          return;
        }
        await apiFetch('/usuarios', {
          method: 'POST',
          body: JSON.stringify({
            nombre: uNombre,
            email: uEmail,
            password: uPassword,
            rol: uRol,
            cargo: uCargo,
          }),
        });
        setToast({ message: 'Usuario creado exitosamente.', type: 'success' });
      }

      setIsUserModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el usuario';
      setToast({ message: msg, type: 'error' });
    }
  };

  // Handlers for Empresa Modal
  const handleOpenEmpresaModal = (emp?: EmpresaContratista) => {
    if (emp) {
      setEditingEmpresa(emp);
      setENombre(emp.nombre);
      setERut(emp.rut || '');
      setEContacto(emp.contacto || '');
    } else {
      setEditingEmpresa(null);
      setENombre('');
      setERut('');
      setEContacto('');
    }
    setIsEmpresaModalOpen(true);
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingEmpresa) {
        await apiFetch(`/empresas-contratistas/${editingEmpresa.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            nombre: eNombre,
            rut: eRut,
            contacto: eContacto,
          }),
        });
        setToast({ message: 'Empresa contratista actualizada con éxito.', type: 'success' });
      } else {
        await apiFetch('/empresas-contratistas', {
          method: 'POST',
          body: JSON.stringify({
            nombre: eNombre,
            rut: eRut,
            contacto: eContacto,
          }),
        });
        setToast({ message: 'Empresa contratista registrada con éxito.', type: 'success' });
      }

      setIsEmpresaModalOpen(false);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar la empresa contratista';
      setToast({ message: msg, type: 'error' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      <ToastNotification
        message={toast?.message || null}
        type={toast?.type || 'success'}
        onClose={() => setToast(null)}
      />

      {/* Header Admin */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-bold shadow-md">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                SOINTER LTDA. <span className="text-xs bg-indigo-600/30 text-indigo-400 font-semibold px-2 py-0.5 rounded border border-indigo-500/30">Administración General</span>
              </h1>
              <p className="text-xs text-slate-400">Gestión de Usuarios, Catálogos & Empresas — {user?.nombre}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button variant="outline" size="sm" onClick={logout} className="border-slate-700 text-slate-200 hover:bg-slate-800">
              <LogOut className="w-3.5 h-3.5" /> Cerrar Sesión
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 pb-3 -mx-4 px-4 overflow-x-auto hide-scrollbar">
          <div className="flex items-center gap-2 min-w-max">
            <button
              onClick={() => setActiveTab('usuarios')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'usuarios'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4" /> Gestión de Usuarios ({usuarios.length})
            </button>
            <button
              onClick={() => setActiveTab('empresas')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'empresas'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Building2 className="w-4 h-4" /> Empresas Contratistas ({empresas.length})
            </button>
            <button
              onClick={() => setActiveTab('catalogo')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'catalogo'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4" /> Catálogo 9 Sistemas ({sistemas.length})
            </button>
            <button
              onClick={() => setActiveTab('auditoria')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'auditoria'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              <ShieldAlert className="w-4 h-4" /> Bitácora de Auditoría ({auditLogs.length})
            </button>
          </div>
        </div>

        {/* TAB 1: USUARIOS */}
        {activeTab === 'usuarios' && (
          <div className="space-y-4">
            <div className="bg-white p-4 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" /> Administración de Personal y Roles
                </h3>
                <p className="text-xs text-slate-500">
                  Gestione técnicos inspectores, jefes de inspección y administradores del sistema.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadData}>
                  <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenUserModal()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Nuevo Usuario
                </Button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              {loading ? (
                <div className="p-12 text-center text-sm text-slate-500">Cargando usuarios...</div>
              ) : usuarios.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-500">No existen usuarios registrados.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4">Nombre / Perfil</th>
                        <th className="py-3.5 px-4">Correo Electrónico</th>
                        <th className="py-3.5 px-4">Rol Asignado</th>
                        <th className="py-3.5 px-4">Cargo</th>
                        <th className="py-3.5 px-4">Estado</th>
                        <th className="py-3.5 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {usuarios.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{u.nombre}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{u.email}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-1 rounded font-bold text-[10px] uppercase border ${
                                u.rol === 'administrador'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : u.rol === 'jefe_inspeccion' || u.rol === 'gerente'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {u.rol.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-700">{u.cargo || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <Badge variant={u.activo ? 'estandar' : 'subestandar'}>
                              {u.activo ? 'ACTIVO' : 'INACTIVO'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="outline" size="sm" onClick={() => handleOpenUserModal(u)}>
                              <Edit3 className="w-3.5 h-3.5" /> Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EMPRESAS CONTRATISTAS */}
        {activeTab === 'empresas' && (
          <div className="space-y-4">
            <div className="bg-white p-4 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600" /> Registro de Empresas Contratistas Externas
                </h3>
                <p className="text-xs text-slate-500">
                  Empresas propietarias de vehículos intervenidos por Sointer Ltda.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadData}>
                  <RefreshCw className="w-3.5 h-3.5" /> Actualizar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleOpenEmpresaModal()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                >
                  <PlusCircle className="w-3.5 h-3.5" /> Nueva Empresa
                </Button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              {loading ? (
                <div className="p-12 text-center text-sm text-slate-500">Cargando empresas...</div>
              ) : empresas.length === 0 ? (
                <div className="p-12 text-center text-sm text-slate-500">No hay empresas contratistas registradas.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3.5 px-4">Razón Social / Nombre</th>
                        <th className="py-3.5 px-4">RUT</th>
                        <th className="py-3.5 px-4">Contacto</th>
                        <th className="py-3.5 px-4">Estado</th>
                        <th className="py-3.5 px-4 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {empresas.map((emp) => (
                        <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-bold text-slate-900">{emp.nombre}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{emp.rut || 'N/A'}</td>
                          <td className="py-3 px-4 text-slate-700">{emp.contacto || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <Badge variant={emp.activo ? 'estandar' : 'subestandar'}>
                              {emp.activo ? 'ACTIVA' : 'INACTIVA'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button variant="outline" size="sm" onClick={() => handleOpenEmpresaModal(emp)}>
                              <Edit3 className="w-3.5 h-3.5" /> Editar
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CATÁLOGO DE 9 SISTEMAS */}
        {activeTab === 'catalogo' && (
          <div className="space-y-4">
            <div className="bg-white p-4 border border-slate-200 rounded-xl">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" /> Catálogo Estructurado por Sistemas (FO-M4-P13-96)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Estructura oficial de los 9 sistemas técnicos evaluados en la planilla de interventoría.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sistemas.map((sys, idx) => (
                <div key={sys.id} className="bg-white p-4 border border-slate-200 rounded-xl shadow-xs space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      CÓD: 0{sys.codigo || idx + 1}
                    </span>
                    <Badge variant="estandar">ACTIVO</Badge>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm">{sys.nombre}</h4>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AUDITORÍA */}
        {activeTab === 'auditoria' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Fecha / Hora</th>
                      <th className="py-3 px-4">Acción</th>
                      <th className="py-3 px-4">Entidad</th>
                      <th className="py-3 px-4">IP</th>
                      <th className="py-3 px-4 text-right">Payload</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {new Date(log.timestamp).toLocaleString('es-CL')}
                        </td>
                        <td className="py-3 px-4 font-bold uppercase">{log.accion}</td>
                        <td className="py-3 px-4 font-medium text-slate-900">{log.entidad}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{log.ip || 'system'}</td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="outline" size="sm" onClick={() => setSelectedAuditLog(log)}>
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
      </main>

      {/* Modal de Usuario */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        title={editingUser ? `Editar Usuario: ${editingUser.nombre}` : 'Crear Nuevo Usuario'}
      >
        <form onSubmit={handleSaveUser} className="space-y-4 text-xs">
          <Input
            label="Nombre Completo"
            value={uNombre}
            onChange={(e) => setUNombre(e.target.value)}
            required
            placeholder="Ej. Carlos Ruiz"
          />

          <Input
            label="Correo Electrónico"
            type="email"
            value={uEmail}
            onChange={(e) => setUEmail(e.target.value)}
            required
            placeholder="ejemplo@sointer.com"
          />

          <Input
            label={editingUser ? 'Nueva Contraseña (dejar en blanco para mantener)' : 'Contraseña de Acceso'}
            type="password"
            value={uPassword}
            onChange={(e) => setUPassword(e.target.value)}
            required={!editingUser}
            placeholder="••••••••"
          />

          <Select
            label="Rol en la Plataforma"
            value={uRol}
            onChange={(e) => setURol(e.target.value)}
            options={[
              { value: 'tecnico_inspector', label: 'Técnico Inspector (Formulario & Inspecciones)' },
              { value: 'jefe_inspeccion', label: 'Jefe de Inspección (Supervisión & Firma de Aprobación)' },
              { value: 'administrador', label: 'Administrador (Control Total & Configuración)' },
            ]}
          />

          <Input
            label="Cargo Institucional"
            value={uCargo}
            onChange={(e) => setUCargo(e.target.value)}
            placeholder="Ej. Inspector de Terreno"
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" className="bg-indigo-600 text-white font-bold">
              Guardar Usuario
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de Empresa */}
      <Modal
        isOpen={isEmpresaModalOpen}
        onClose={() => setIsEmpresaModalOpen(false)}
        title={editingEmpresa ? `Editar Empresa: ${editingEmpresa.nombre}` : 'Registrar Nueva Empresa Contratista'}
      >
        <form onSubmit={handleSaveEmpresa} className="space-y-4 text-xs">
          <Input
            label="Razón Social / Nombre Empresa"
            value={eNombre}
            onChange={(e) => setENombre(e.target.value)}
            required
            placeholder="Ej. Epromecánica S.A.S."
          />

          <Input
            label="RUT / Identificación Fiscal"
            value={eRut}
            onChange={(e) => setERut(e.target.value)}
            placeholder="Ej. 900.123.456-7"
          />

          <Input
            label="Contacto / Teléfono / Email"
            value={eContacto}
            onChange={(e) => setEContacto(e.target.value)}
            placeholder="Ej. contacto@epromecanica.com"
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsEmpresaModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit" className="bg-indigo-600 text-white font-bold">
              Guardar Empresa
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal AuditLog JSON */}
      <Modal
        isOpen={!!selectedAuditLog}
        onClose={() => setSelectedAuditLog(null)}
        title="Detalle JSON de Auditoría"
      >
        {selectedAuditLog && (
          <div className="space-y-3 text-xs">
            <pre className="p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-lg overflow-x-auto">
              {JSON.stringify(selectedAuditLog.detalle || {}, null, 2)}
            </pre>
          </div>
        )}
      </Modal>
    </div>
  );
};
