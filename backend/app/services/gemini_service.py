from __future__ import annotations
import json
import logging
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

            # Prioridad de modelos: GEMINI_MODEL (por defecto gemini-3.8-flash-lite), seguido de gemini-3.8-flash
            configured_model = (getattr(settings, "GEMINI_MODEL", "") or "").strip()
            model_candidates = ["gemini-3.8-flash-lite", "gemini-3.8-flash"]
            if configured_model:
                if configured_model in model_candidates:
                    model_candidates.remove(configured_model)
                model_candidates.insert(0, configured_model)

            last_exception = None

            for model_name in model_candidates:
                try:
                    logger.info(f"Intentando procesar audio con modelo Gemini: {model_name}")
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
                    logger.warning(f"Fallo con modelo {model_name}: {str(e)}")
                    last_exception = e
                    continue

            # Si todos los candidatos fallaron
            raise last_exception or Exception("No se pudo obtener respuesta de los modelos Gemini")

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error procesando audio con Gemini: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Error al procesar el audio con Google Gemini: {str(e)}"
            )
