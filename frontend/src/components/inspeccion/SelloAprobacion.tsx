import React from 'react';
import { ShieldCheck, Award, Calendar, CheckCircle2, UserCheck } from 'lucide-react';

interface SelloData {
  empresa_nombre?: string;
  empresa_nit?: string;
  numero_inspeccion?: number;
  fecha_creacion?: string;
  fecha_aprobacion?: string;
  aprobado_por?: string;
  firma_jefe_url?: string;
  leyenda?: string;
}

interface SelloAprobacionProps {
  selloRawUrl?: string;
  numeroInspeccion?: number;
  fechaCreacion?: string;
  fechaAprobacion?: string;
  fechaProximaRevision?: string;
  aprobadoPorNombre?: string;
  className?: string;
}

export const SelloAprobacion: React.FC<SelloAprobacionProps> = ({
  selloRawUrl,
  numeroInspeccion,
  fechaCreacion,
  fechaAprobacion,
  fechaProximaRevision,
  aprobadoPorNombre,
  className = ''
}) => {
  let parsed: SelloData | null = null;
  if (selloRawUrl) {
    try {
      // Clean python single quotes if any
      const cleaned = selloRawUrl.replace(/'/g, '"');
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.warn('Could not parse selloRawUrl JSON:', e);
    }
  }

  const empresa = parsed?.empresa_nombre || 'SOINTER LTDA.';
  const nit = parsed?.empresa_nit || 'NIT 900.467.017-4';
  const numIns = parsed?.numero_inspeccion || numeroInspeccion || 0;
  const fecCrea = parsed?.fecha_creacion || fechaCreacion || 'N/A';
  const fecAprob = parsed?.fecha_aprobacion || fechaAprobacion || 'N/A';
  const jefe = parsed?.aprobado_por || aprobadoPorNombre || 'Jefe de Inspección';
  const firmaJefe = parsed?.firma_jefe_url;

  return (
    <div
      className={`relative overflow-hidden border-2 border-emerald-600 bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-xl p-5 shadow-lg ${className}`}
    >
      {/* Decorative Watermark Stamp Background */}
      <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none text-emerald-900 select-none">
        <ShieldCheck className="w-48 h-48" />
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Info Column */}
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-emerald-950 tracking-wider uppercase">
                {empresa} — Interventoría
              </h4>
              <p className="text-[11px] font-medium text-emerald-700">{nit} • Control e Inspección Técnica de Flota</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="bg-white/80 backdrop-blur-xs p-2 rounded-lg border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-semibold block uppercase">N° Correlativo</span>
              <span className="font-mono font-bold text-emerald-950 text-sm">N° {numIns.toString().padStart(5, '0')}</span>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-2 rounded-lg border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-semibold block uppercase">Fecha Creación</span>
              <span className="font-mono text-emerald-900 font-medium">
                {fecCrea.slice(0, 16)}
              </span>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-2 rounded-lg border border-emerald-200">
              <span className="text-[10px] text-emerald-800 font-semibold block uppercase">Fecha Aprobación</span>
              <span className="font-mono text-emerald-900 font-medium">
                {fecAprob.slice(0, 16)}
              </span>
            </div>
          </div>

          {fechaProximaRevision && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-100/70 py-1.5 px-3 rounded-lg border border-emerald-300 w-fit">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>Vigencia Próxima Revisión: <strong className="font-mono text-emerald-950">{fechaProximaRevision}</strong> (6 meses)</span>
            </div>
          )}
        </div>

        {/* Right Seal Emblem & Approver Signature */}
        <div className="flex flex-col items-center justify-center p-3 bg-white/90 rounded-xl border border-emerald-300 shadow-sm shrink-0 min-w-[180px] text-center">
          <div className="inline-flex items-center gap-1 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5" /> APROBADO
          </div>

          {firmaJefe ? (
            <div className="border border-emerald-200 rounded p-1 bg-white mb-1.5">
              <img src={firmaJefe} alt="Firma Jefe" className="h-12 object-contain" />
            </div>
          ) : (
            <div className="h-10 flex items-center justify-center text-[10px] text-emerald-700 italic">
              [Firma Digital Autenticada]
            </div>
          )}

          <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-emerald-950">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="truncate max-w-[150px]">{jefe}</span>
          </div>
          <span className="text-[9px] text-emerald-600 font-semibold uppercase">Jefe de Inspección — Sointer Ltda.</span>
        </div>
      </div>
    </div>
  );
};
