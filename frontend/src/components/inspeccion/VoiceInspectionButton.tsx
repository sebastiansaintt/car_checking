import React, { useState, useEffect } from 'react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { apiFetch } from '../../lib/api';
import { DictadoInspeccionResponse } from '../../types';
import { Mic, Square, Loader2, Sparkles, WifiOff, X, AlertCircle } from 'lucide-react';

interface VoiceInspectionButtonProps {
  onDataExtracted: (data: DictadoInspeccionResponse) => void;
  disabled?: boolean;
}

export const VoiceInspectionButton: React.FC<VoiceInspectionButtonProps> = ({
  onDataExtracted,
  disabled = false,
}) => {
  const {
    isRecording,
    recordingDuration,
    error: recorderError,
    startRecording,
    stopRecording,
    cancelRecording,
    resetError,
  } = useAudioRecorder();

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingSeconds, setProcessingSeconds] = useState<number>(0);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  // Monitor del tiempo transcurrido durante el procesamiento
  useEffect(() => {
    let interval: number | null = null;
    if (isProcessing) {
      setProcessingSeconds(0);
      interval = window.setInterval(() => {
        setProcessingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setProcessingSeconds(0);
    }
    return () => {
      if (interval !== null) clearInterval(interval);
    };
  }, [isProcessing]);

  // Monitor de conectividad online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      if (isRecording) {
        cancelRecording();
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isRecording, cancelRecording]);

  const formatTimer = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getProcessingMessage = (sec: number): { title: string; subtitle: string } => {
    if (sec < 3) {
      return {
        title: `Audio recibido · Conectando (${sec}s)...`,
        subtitle: 'Enviando dictado a Google Gemini...',
      };
    } else if (sec < 7) {
      return {
        title: `Transcribiendo y analizando fallas (${sec}s)...`,
        subtitle: 'Extrayendo marca, modelo, km y checklist...',
      };
    } else if (sec < 12) {
      return {
        title: `Estructurando datos en tiempo real (${sec}s)...`,
        subtitle: 'Asociando componentes al catálogo oficial...',
      };
    } else {
      return {
        title: `Congestión en Google · Reintentando (${sec}s)...`,
        subtitle: 'Cambiando a modelo alternativo con backoff...',
      };
    }
  };

  const handleStart = async () => {
    if (!isOnline) return;
    setApiError(null);
    resetError();
    await startRecording();
  };

  const handleStopAndProcess = async () => {
    try {
      const audioBlob = await stopRecording();
      if (!audioBlob || audioBlob.size < 100) {
        setApiError('No se grabó ningún audio. Intenta hablar más cerca del micrófono.');
        return;
      }

      setIsProcessing(true);
      setApiError(null);

      const formData = new FormData();
      // Extension according to blob type
      const filename = audioBlob.type.includes('mp4') ? 'dictado.mp4' : 'dictado.webm';
      formData.append('audio', audioBlob, filename);

      const result = await apiFetch<DictadoInspeccionResponse>('/inspecciones/ai-dictado', {
        method: 'POST',
        body: formData,
      });

      onDataExtracted(result);
    } catch (err: any) {
      setApiError(err.message || 'Error al procesar el dictado con Gemini');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    cancelRecording();
    setApiError(null);
    resetError();
  };

  // 1. Estado Sin Conexión
  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200 text-gray-500 text-xs font-medium cursor-not-allowed">
        <WifiOff className="w-4 h-4 text-gray-400 shrink-0" />
        <span>Dictado IA requiere conexión</span>
      </div>
    );
  }

  // 2. Estado Procesando con Gemini (con timer en vivo y animación activa)
  if (isProcessing) {
    const status = getProcessingMessage(processingSeconds);
    return (
      <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border border-blue-200/90 text-blue-900 shadow-sm transition-all duration-200">
        <div className="relative flex items-center justify-center shrink-0">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
        </div>
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-blue-950">
              {status.title}
            </span>
            {/* Animación activa de audio recibido */}
            <div className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 bg-blue-500 animate-pulse" style={{ height: '100%' }} />
              <span className="w-0.5 bg-indigo-500 animate-pulse" style={{ height: '60%', animationDelay: '150ms' }} />
              <span className="w-0.5 bg-blue-600 animate-pulse" style={{ height: '80%', animationDelay: '300ms' }} />
            </div>
          </div>
          <span className="text-[10px] text-blue-700/80 font-medium mt-0.5">
            {status.subtitle}
          </span>
        </div>
      </div>
    );
  }

  // 3. Estado Grabando
  if (isRecording) {
    return (
      <div className="flex items-center gap-2 p-1 bg-red-50 border border-red-200 rounded-lg shadow-sm">
        {/* Indicador pulsante y cronómetro */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-100/70 rounded-md text-red-700 text-xs font-mono font-bold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
          </span>
          <span>{formatTimer(recordingDuration)}</span>
        </div>

        {/* Botón Detener y Enviar */}
        <button
          type="button"
          onClick={handleStopAndProcess}
          className="flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors duration-150"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Detener y procesar</span>
        </button>

        {/* Botón Cancelar */}
        <button
          type="button"
          onClick={handleCancel}
          title="Descartar grabación"
          className="p-1 hover:bg-red-200/60 rounded text-red-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // 4. Estado Normal (Inactivo)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleStart}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm hover:shadow transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Dicta la placa, kilometraje y fallas para rellenar con IA"
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
          <Mic className="w-3.5 h-3.5" />
          <span>Dictado IA</span>
        </button>
      </div>

      {/* Mensajes de error si los hay */}
      {(recorderError || apiError) && (
        <div className="flex items-center justify-between gap-2 p-1.5 bg-red-50 border border-red-200 rounded text-[11px] text-red-700 mt-1 max-w-sm">
          <div className="flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{recorderError || apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => {
              resetError();
              setApiError(null);
            }}
            className="text-red-500 hover:text-red-700"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
