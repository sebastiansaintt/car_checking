import uuid
import pytest
import types
from unittest.mock import MagicMock, patch
from fastapi import HTTPException
from app.schemas.inspeccion import DictadoInspeccionResponse, ItemSubestandarDetectado
from app.services.gemini_service import GeminiInspectionService


def test_build_system_instruction():
    item1 = types.SimpleNamespace(
        id=uuid.uuid4(),
        codigo_item="CH-01",
        nombre="Chasis y largueros"
    )
    item2 = types.SimpleNamespace(
        id=uuid.uuid4(),
        codigo_item="DIR-02",
        nombre="Caja de dirección"
    )
    instruction = GeminiInspectionService._build_system_instruction([item1, item2])
    
    assert "CH-01" in instruction
    assert "Chasis y largueros" in instruction
    assert "DIR-02" in instruction
    assert "Caja de dirección" in instruction
    assert "ESTÁNDAR" in instruction


def test_procesar_audio_sin_api_key():
    with patch("app.services.gemini_service.settings.GEMINI_API_KEY", ""):
        with pytest.raises(HTTPException) as exc_info:
            GeminiInspectionService.procesar_audio_dictado(
                audio_bytes=b"fake-audio-bytes-12345",
                mime_type="audio/webm",
                catalog_items=[]
            )
        assert exc_info.value.status_code == 500
        assert "GEMINI_API_KEY" in exc_info.value.detail


def test_procesar_audio_exitoso_mock():
    expected_response = DictadoInspeccionResponse(
        placa="ABC 123",
        kilometraje=75400,
        area_transitar="Mina",
        observaciones="Buen estado general salvo neumático desgastado",
        items_subestandar=[
            ItemSubestandarDetectado(
                codigo_item="NEU-01",
                nombre_item="Neumáticos",
                comentario_falla="Desgaste lateral excesivo"
            )
        ],
        texto_transcrito="Camioneta ABC 123, 75400 km, zona mina. Neumáticos con desgaste lateral excesivo."
    )

    with patch("app.services.gemini_service.settings.GEMINI_API_KEY", "dummy-api-key"):
        with patch("google.genai.Client") as mock_client_class:
            mock_client = MagicMock()
            mock_client_class.return_value = mock_client

            mock_response = MagicMock()
            mock_response.parsed = expected_response
            mock_client.models.generate_content.return_value = mock_response

            result = GeminiInspectionService.procesar_audio_dictado(
                audio_bytes=b"audio-bytes-content-here-long-enough",
                mime_type="audio/webm",
                catalog_items=[]
            )

            assert result.placa == "ABC 123"
            assert result.kilometraje == 75400
            assert len(result.items_subestandar) == 1
            assert result.items_subestandar[0].codigo_item == "NEU-01"
