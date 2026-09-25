from __future__ import annotations
import json
import logging
import time
from typing import List, Optional, Any
from google import genai
from google.genai import types
from fastapi import HTTPException, status
from app.core.config import settings

try:
    from app.models.inspeccion import CatalogoChecklist
except ImportError:
    CatalogoChecklist = Any  # type: ignore

from app.schemas.inspeccion import DictadoInspeccionResponse, ItemSubestandarDetectado

logger = logging.getLogger("uvicorn.error")


class GeminiInspectionService:
    @staticmethod
    def _build_system_instruction(catalog_items: List[CatalogoChecklist]) -> str:
        """
        Construye el contexto del catálogo para que Gemini mapee las fallas dictadas
        a los IDs y códigos exactos del catálogo de la base de datos.
        """
        catalog_lines = []
        for item in catalog_items:
            codigo = item.codigo_item or "S/C"
            catalog_lines.append(f"- ID: {item.id} | Código: {codigo} | Nombre: {item.nombre}")
        
        catalog_context = "\n".join(catalog_lines)

        return f"""Eres un asistente experto de inspección técnica vehicular de flota para una empresa contratista.
Tu tarea es escuchar atentamente el audio dictado por el inspector técnico en terreno y extraer la información estructurada de la inspección.

CATÁLOGO MAESTRO DE COMPONENTES DEL VEHÍCULO:
{catalog_context}

INSTRUCCIONES DE EXTRACCIÓN:
1. DATOS DEL VEHÍCULO:
   - 'placa': Identifica la placa o patente del vehículo si fue mencionada (formato estándar, ej. 'ABC 123' o 'ABC123').
   - 'marca': Marca del vehículo si fue mencionada (ej. 'Toyota', 'Nissan', 'Ford', 'Volkswagen').
   - 'modelo': Modelo del vehículo si fue mencionado (ej. 'Hilux', 'Amarok', 'BT-50', 'Ranger').
   - 'año': Año de fabricación como número entero si fue mencionado (ej. 2024, 2023).
   - 'tipo_vehiculo': Tipo de vehículo si fue mencionado (ej. 'Camioneta', 'Camión', 'Automóvil', 'Furgón').
   - 'color': Color del vehículo si fue mencionado (ej. 'Blanco', 'Gris', 'Rojo').
   - 'kilometraje': Identifica el kilometraje actual si fue mencionado (solo el número entero, ej. 432126).
   - 'area_transitar': Área de operación si se menciona (ej. 'Industrial', 'Mina', 'Planta', 'Ruta').

2. OBSERVACIONES GENERALES:
   - 'observaciones': Resumen de comentarios generales o recomendaciones adicionales dichas por el inspector.

3. EVALUACIÓN DE COMPONENTES ('items_subestandar'):
   - En este sistema TODOS los componentes vienen en estado 'ESTÁNDAR' (bueno) por defecto. Por lo tanto, SOLO debes incluir en 'items_subestandar' los componentes que el inspector mencione con FALLA, DAÑO, DESGASTE, DETERIORO, o CONDICIÓN SUBESTÁNDAR (ej. 'nivel de fluido subestandar requiere cambiar fluidos').
   - 'catalogo_id': El ID exacto (UUID) del ítem del catálogo listado arriba que mejor corresponda al componente con falla.
   - 'codigo_item': El código exacto del ítem del catálogo (ej. 'CH-01', 'DIR-02', 'MOT-01', 'LUB-01').
   - 'nombre_item': El nombre del componente.
   - 'comentario_falla': Descripción clara de la falla detectada según lo dictado por el técnico (ej. 'Requiere cambiar fluidos', 'Pastillas desgastadas').
   - Si el inspector dice que algo está 'bien', 'correcto' o 'estándar', NO lo agregues a esta lista.

4. 'texto_transcrito': Una transcripción fiel o resumen de lo que el inspector dijo en el audio.

Sé preciso y exhaustivo. Si algún campo informativo no fue mencionado en el audio, déjalo como null."""

    @classmethod
    def procesar_audio_dictado(
        cls,
        audio_bytes: bytes,
        mime_type: str,
        catalog_items: List[CatalogoChecklist]
    ) -> DictadoInspeccionResponse:
        """
        Envía el audio a Google Gemini y retorna los datos estructurados de la inspección.
        """
        api_key = settings.GEMINI_API_KEY.strip()
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GEMINI_API_KEY no está configurada en el servidor. Por favor agregue la clave en el archivo .env del backend."
            )

        try:
            client = genai.Client(api_key=api_key)
            system_instruction = cls._build_system_instruction(catalog_items)

            # Prioridad de modelos en cascada: modelo configurado en .env (si existe),
            # seguido de 3.8 Flash-Lite, 3.5 Flash-Lite, 3.8 Flash, 3.5 Flash
            configured_model = (getattr(settings, "GEMINI_MODEL", "") or "").strip()
            default_candidates = [
                "gemini-3.8-flash-lite",
                "gemini-3.5-flash-lite",
                "gemini-3.8-flash",
                "gemini-3.5-flash",
            ]
            model_candidates = list(default_candidates)
            if configured_model:
                if configured_model in model_candidates:
                    model_candidates.remove(configured_model)
                model_candidates.insert(0, configured_model)

            last_exception = None
            max_retries_per_model = 2

            for model_name in model_candidates:
                for attempt in range(max_retries_per_model):
                    try:
                        logger.info(f"Intentando procesar audio con modelo Gemini: {model_name} (intento {attempt + 1}/{max_retries_per_model})")
                        response = client.models.generate_content(
                            model=model_name,
                            contents=[
                                types.Part.from_bytes(
                                    data=audio_bytes,
                                    mime_type=mime_type or "audio/webm",
                                ),
                                "Procesa este audio de inspección vehicular y extrae los datos de acuerdo a las instrucciones."
                            ],
                            config=types.GenerateContentConfig(
                                system_instruction=system_instruction,
                                response_mime_type="application/json",
                                response_schema=DictadoInspeccionResponse,
                                temperature=0.1,
                            ),
                        )

                        # Si el SDK ya parseó el response_schema
                        if response.parsed and isinstance(response.parsed, DictadoInspeccionResponse):
                            return response.parsed

                        # Si viene como JSON text
                        if response.text:
                            data = json.loads(response.text)
                            return DictadoInspeccionResponse.model_validate(data)

                    except Exception as e:
                        err_str = str(e)
                        logger.warning(f"Fallo con modelo {model_name} (intento {attempt + 1}): {err_str}")
                        last_exception = e

                        # Si el modelo no existe o fue descontinuado (404), no reintentar ese modelo y pasar al siguiente
                        if "404" in err_str or "NOT_FOUND" in err_str:
                            break

                        # Si es congestión momentánea (503 / 429 / high demand) y quedan intentos, esperar con backoff
                        is_transient = any(tok in err_str for tok in ["503", "UNAVAILABLE", "429", "RESOURCE_EXHAUSTED", "high demand", "overloaded"])
                        if is_transient and attempt < max_retries_per_model - 1:
                            backoff = 1.5 * (attempt + 1)
                            logger.info(f"Servidores con alta demanda momentánea. Esperando {backoff}s antes de reintentar con {model_name}...")
                            time.sleep(backoff)
                            continue

            # Si todos los modelos y reintentos fallaron
            err_detail = str(last_exception)
            if any(tok in err_detail for tok in ["503", "UNAVAILABLE", "high demand"]):
                user_msg = "Los servidores de Google Gemini están experimentando alta demanda momentánea. Por favor espera unos segundos y pulsa nuevamente 'Dictado IA'."
            elif any(tok in err_detail for tok in ["429", "RESOURCE_EXHAUSTED"]):
                user_msg = "Se alcanzó el límite de solicitudes por minuto de la cuenta gratuita de Google AI. Por favor espera 30 segundos y reintenta."
            else:
                user_msg = f"Error al procesar el audio con Google Gemini: {err_detail}"

            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=user_msg
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error procesando audio con Gemini: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error inesperado al procesar audio con Gemini: {str(e)}"
            )
