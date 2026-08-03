import React from 'react';
import { Inspeccion } from '../../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Printer, ShieldCheck } from 'lucide-react';

interface PlanillaPDFProps {
  inspeccion: Inspeccion | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlanillaPDF: React.FC<PlanillaPDFProps> = ({ inspeccion, isOpen, onClose }) => {
  if (!inspeccion) return null;

  const handlePrint = () => {
    window.print();
  };

  const veh = inspeccion.vehiculo;
  const emp = inspeccion.empresa_contratista;
  const numIns = inspeccion.numero_inspeccion ? inspeccion.numero_inspeccion.toString().padStart(5, '0') : '00000';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Planilla Oficial FO-M4-P13-96 — N° ${numIns}`} maxWidth="max-w-5xl">
      <div className="space-y-4">
        {/* Action Bar (Hidden when printing) */}
        <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl border border-slate-200 print:hidden">
          <div className="text-xs text-slate-600">
            <span className="font-bold text-slate-900">Formato Oficial FO-M4-P13-96</span> — Formulario de Interventoría de Vehículos
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            <Button variant="primary" size="sm" onClick={handlePrint} className="bg-slate-900 text-white hover:bg-slate-800">
              <Printer className="w-3.5 h-3.5" /> Imprimir / Guardar en PDF
            </Button>
          </div>
        </div>

        {/* Printable Paper Canvas (A4 Simulation) */}
        <div className="bg-white p-6 border border-slate-300 rounded-lg shadow-sm text-slate-900 text-xs font-sans print:border-none print:p-0 print:shadow-none space-y-6">
          {/* PAGE 1 HEADER */}
          <div className="border-2 border-slate-900 rounded-lg overflow-hidden">
            {/* Top Corporate Banner */}
            <div className="grid grid-cols-4 border-b-2 border-slate-900 bg-slate-50 items-center text-center py-2 px-3">
              <div className="border-r border-slate-400 font-extrabold text-slate-900 tracking-wider">
                <span className="text-sm block font-black">SOINTER LTDA.</span>
                <span className="text-[10px] text-slate-600 font-medium">NIT 900.467.017-4</span>
              </div>
              <div className="col-span-2 border-r border-slate-400 font-extrabold text-xs uppercase px-2 text-slate-900">
                PLANILLA DE INSPECCIÓN TÉCNICA Y CONTROL DE VEHÍCULOS
                <span className="block text-[10px] text-slate-600 font-normal">SISTEMA DE GESTIÓN DE CALIDAD E INTERVENTORÍA</span>
              </div>
              <div className="text-[11px] font-mono font-bold text-slate-900">
                <span className="block text-[9px] text-slate-500 font-sans uppercase">Código: FO-M4-P13-96</span>
                <span className="text-emerald-700">No. {numIns}</span>
              </div>
            </div>

            {/* Header Form Data Grid */}
            <div className="grid grid-cols-3 divide-x divide-y divide-slate-300 text-[11px] bg-white">
              <div className="p-2">
                <span className="text-slate-500 font-semibold block text-[10px]">EMPRESA CONTRATISTA:</span>
                <span className="font-bold uppercase text-slate-900">{emp?.nombre || inspeccion.empresa_contratista_nombre || 'EXTERNO'}</span>
              </div>

              <div className="p-2">
                <span className="text-slate-500 font-semibold block text-[10px]">PLACA / PATENTE:</span>
                <span className="font-bold font-mono text-sm text-slate-900">{veh?.patente || inspeccion.vehiculo_patente || inspeccion.vehiculo_id}</span>
              </div>

              <div className="p-2">
                <span className="text-slate-500 font-semibold block text-[10px]">FECHA / HORA REGISTRO:</span>
                <span className="font-medium font-mono text-slate-900">{new Date(inspeccion.fecha).toLocaleString('es-CL')}</span>
              </div>

              <div className="p-2">
                <span className="text-slate-500 font-semibold block text-[10px]">MARCA Y MODELO:</span>
                <span className="font-medium text-slate-900">{veh ? `${veh.marca} ${veh.modelo} (${veh.año})` : 'N/A'}</span>
              </div>

              <div className="p-2">
                <span className="text-slate-500 font-semibold block text-[10px]">N° INTERNO VEHÍCULO:</span>
                <span className="font-medium text-slate-900">{veh?.numero_interno || 'N/A'}</span>
              </div>

              <div className="p-2">
                <span className="text-slate-500 font-semibold block text-[10px]">KILOMETRAJE ACTUAL:</span>
                <span className="font-mono font-bold text-slate-900">{inspeccion.kilometraje.toLocaleString()} Km</span>
              </div>

              <div className="p-2">
                <span className="text-slate-500 font-semibold block text-[10px]">ÁREA A TRANSITAR:</span>
                <span className="font-medium text-slate-900">{inspeccion.area_transitar || veh?.area_transitar || 'N/A'}</span>
              </div>

              <div className="p-2">
                <span className="text-slate-500 font-semibold block text-[10px]">EQUIPO AUXILIAR:</span>
                <span className="font-medium text-slate-900">{inspeccion.equipo_auxiliar || veh?.equipo_auxiliar || 'N/A'}</span>
              </div>

              <div className="p-2 bg-slate-50">
                <span className="text-slate-500 font-semibold block text-[10px]">REVISIÓN N°:</span>
                <span className="font-bold font-mono text-slate-900">Revisión #{inspeccion.numero_revision}</span>
              </div>
            </div>
          </div>

          {/* 9 SYSTEMS CHECKLIST TABLE */}
          <div>
            <h4 className="font-extrabold text-slate-900 uppercase text-xs mb-2 border-b-2 border-slate-900 pb-1 flex items-center justify-between">
              <span>EVALUACIÓN DE LOS 9 SISTEMAS TÉCNICOS (FO-M4-P13-96)</span>
              <span className="text-[10px] font-normal text-slate-600 uppercase">Convención: E = Estándar | S = Subestándar | N/A = No Aplica</span>
            </h4>

            {inspeccion.evaluaciones_sistema && inspeccion.evaluaciones_sistema.length > 0 ? (
              <div className="border border-slate-900 rounded overflow-hidden">
                <table className="w-full text-left text-[11px] divide-y divide-slate-300">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[9px]">
                    <tr>
                      <th className="py-1.5 px-3">Código</th>
                      <th className="py-1.5 px-3">Sistema Evaluado</th>
                      <th className="py-1.5 px-3 text-center">Dictamen por Sistema</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {inspeccion.evaluaciones_sistema.map((sys, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="py-1.5 px-3 font-mono font-bold text-slate-700">SYS-0{idx + 1}</td>
                        <td className="py-1.5 px-3 font-semibold text-slate-900">{sys.sistema?.nombre || sys.sistema_nombre || `Sistema #${idx + 1}`}</td>
                        <td className="py-1.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${sys.estado_sistema === 'aprobado' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-rose-100 text-rose-800 border border-rose-300'}`}>
                            {sys.estado_sistema === 'aprobado' ? 'E — APROBADO' : 'S — NO APROBADO'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-3 border border-slate-200 text-slate-500 italic text-[11px]">
                Evaluación técnica registrada en checklist individual.
              </div>
            )}
          </div>

          {/* HALLAZGOS & OBSERVACIONES */}
          {inspeccion.hallazgos && inspeccion.hallazgos.length > 0 && (
            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-900 uppercase text-xs border-b-2 border-slate-900 pb-1">
                HALLAZGOS REGISTRADOS Y CORRECCIONES EN TERRENO
              </h4>
              <div className="border border-slate-300 rounded overflow-hidden">
                <table className="w-full text-left text-[11px] divide-y divide-slate-200">
                  <thead className="bg-slate-100 text-slate-700 font-bold text-[10px]">
                    <tr>
                      <th className="py-1.5 px-3">Descripción del Hallazgo</th>
                      <th className="py-1.5 px-3">Estado de Atendido</th>
                      <th className="py-1.5 px-3">Fecha Atención</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inspeccion.hallazgos.map((h) => (
                      <tr key={h.id}>
                        <td className="py-1.5 px-3 font-medium text-slate-900">{h.descripcion}</td>
                        <td className="py-1.5 px-3 font-bold">
                          {h.atendido ? (
                            <span className="text-emerald-700 font-semibold">✓ CORREGIDO EN TERRENO</span>
                          ) : (
                            <span className="text-rose-600 font-semibold">PENDIENTE</span>
                          )}
                        </td>
                        <td className="py-1.5 px-3 font-mono text-slate-500">
                          {h.fecha_atencion ? new Date(h.fecha_atencion).toLocaleDateString() : 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {inspeccion.observaciones && (
            <div className="p-2.5 bg-slate-50 border border-slate-300 rounded">
              <span className="font-bold text-slate-900 text-[10px] block uppercase">OBSERVACIONES Y NOTAS DEL TÉCNICO:</span>
              <p className="text-slate-800 font-medium text-[11px] whitespace-pre-wrap">{inspeccion.observaciones}</p>
            </div>
          )}

          {/* FIRMAS DE TÉCNICOS INSPECTORES */}
          <div>
            <h4 className="font-extrabold text-slate-900 uppercase text-xs mb-2 border-b-2 border-slate-900 pb-1">
              FIRMAS DE TÉCNICOS INSPECTORES (HASTA 3 FIRMAS)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              {inspeccion.firmas_tecnicos && inspeccion.firmas_tecnicos.length > 0 ? (
                inspeccion.firmas_tecnicos.map((f, i) => (
                  <div key={i} className="border border-slate-300 rounded p-2 text-center bg-slate-50">
                    {f.firma_url ? (
                      <img src={f.firma_url} alt="Firma Técnico" className="h-12 object-contain mx-auto mb-1" />
                    ) : (
                      <div className="h-12 flex items-center justify-center text-slate-400 italic text-[10px]">
                        [Firma autógrafa en físico]
                      </div>
                    )}
                    <span className="font-bold text-slate-900 block truncate text-[11px]">
                      {f.usuario?.nombre || f.nombre_adicional || `Técnico Inspector #${i + 1}`}
                    </span>
                    <span className="text-[9px] text-slate-500 uppercase font-semibold">Técnico Inspector Sointer</span>
                  </div>
                ))
              ) : (
                <div className="col-span-3 border border-slate-300 rounded p-3 text-center text-slate-400 italic">
                  Firma del técnico inspector registrada digitalmente.
                </div>
              )}
            </div>
          </div>

          {/* SELLO DIGITAL DE APROBACIÓN OFICIAL */}
          {inspeccion.estado === 'aprobado' && (
            <div className="border-2 border-emerald-700 bg-emerald-50/60 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-700" />
                  <span className="font-extrabold text-emerald-950 uppercase text-xs">SELLO DE CERTIFICACIÓN Y APROBACIÓN OFICIAL</span>
                </div>
                <p className="text-[11px] text-emerald-900 font-medium">
                  SOINTER LTDA. certifica que el vehículo <strong className="font-mono">{veh?.patente || inspeccion.vehiculo_patente}</strong> ha superado satisfactoriamente los 9 sistemas técnicos de inspección y se encuentra <strong>APROBADO PARA CIRCULAR</strong>.
                </p>
                <div className="text-[10px] text-emerald-800 font-mono pt-1">
                  VIGENCIA HASTA: <strong>{inspeccion.fecha_proxima_revision || '6 MESES'}</strong> | N° CERTIFICADO: <strong>N° {numIns}</strong>
                </div>
              </div>
              <div className="text-center p-2 bg-white rounded border border-emerald-300 shrink-0 min-w-[140px]">
                <span className="inline-block bg-emerald-700 text-white font-bold text-[10px] px-2 py-0.5 rounded uppercase mb-1">
                  APROBADO
                </span>
                <span className="text-[10px] text-slate-900 font-bold block truncate">{inspeccion.aprobado_por_nombre || 'Jefe de Inspección'}</span>
                <span className="text-[8px] text-slate-500 uppercase block">Firma y Certificación</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
