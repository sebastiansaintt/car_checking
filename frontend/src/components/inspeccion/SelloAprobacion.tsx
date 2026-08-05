import React from 'react';
import { Award, Calendar, CheckCircle2, UserCheck } from 'lucide-react';

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
      className={`border border-[#A7F3D0] bg-[#ECFDF5] rounded-container p-4 space-y-3 ${className}`}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left Info Column */}
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[6px] bg-[#065F46] text-white flex items-center justify-center font-bold shrink-0">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[#065F46] uppercase tracking-wide">
                {empresa} — Interventoría
              </h4>
              <p className="text-[11px] text-[#065F46]/80">{nit} · Control e Inspección Técnica de Flota</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <div className="bg-white p-2 rounded-input border border-[#A7F3D0]">
              <span className="text-[10px] text-[#065F46] font-medium block uppercase">N° Correlativo</span>
              <span className="font-mono font-semibold text-[#065F46]">N° {numIns.toString().padStart(5, '0')}</span>
            </div>

            <div className="bg-white p-2 rounded-input border border-[#A7F3D0]">
              <span className="text-[10px] text-[#065F46] font-medium block uppercase">Fecha Creación</span>
              <span className="font-mono text-[#065F46]">
                {fecCrea.slice(0, 16)}
              </span>
            </div>

            <div className="bg-white p-2 rounded-input border border-[#A7F3D0]">
              <span className="text-[10px] text-[#065F46] font-medium block uppercase">Fecha Aprobación</span>
              <span className="font-mono text-[#065F46]">
                {fecAprob.slice(0, 16)}
              </span>
            </div>
          </div>

          {fechaProximaRevision && (
            <div className="flex items-center gap-1.5 text-xs text-[#065F46] bg-white py-1 px-2.5 rounded-input border border-[#A7F3D0] w-fit">
              <Calendar className="w-3.5 h-3.5" />
              <span>Próxima revisión: <strong className="font-mono">{fechaProximaRevision}</strong></span>
            </div>
          )}
        </div>

        {/* Right Seal Emblem & Approver Signature */}
        <div className="flex flex-col items-center justify-center p-3 bg-white rounded-container border border-[#A7F3D0] shrink-0 min-w-[160px] text-center">
          <div className="inline-flex items-center gap-1 bg-[#065F46] text-white text-[10px] font-semibold px-2.5 py-0.5 rounded uppercase tracking-wide mb-2">
            <CheckCircle2 className="w-3 h-3" /> APROBADO
          </div>

          {firmaJefe ? (
            <div className="border border-[#E5E7EB] rounded p-1 bg-white mb-1.5">
              <img src={firmaJefe} alt="Firma Jefe" className="h-10 object-contain" />
            </div>
          ) : (
            <div className="h-8 flex items-center justify-center text-[10px] text-[#065F46] italic">
              [Firma Digital Autenticada]
            </div>
          )}

          <div className="flex items-center justify-center gap-1 text-[11px] font-medium text-[#111827]">
            <UserCheck className="w-3.5 h-3.5 text-[#065F46]" />
            <span className="truncate max-w-[140px]">{jefe}</span>
          </div>
          <span className="text-[9px] text-[#6B7280] font-medium uppercase">Jefe de Inspección</span>
        </div>
      </div>
    </div>
  );
};
