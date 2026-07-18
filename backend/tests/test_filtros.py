import uuid
from datetime import datetime, timedelta, timezone
import httpx

def test_filtros_and_roles_flow():
    client_coord = httpx.Client(base_url="http://localhost:8000")
    client_gerente = httpx.Client(base_url="http://localhost:8000")

    # 1. Autenticar Coordinador y Gerente
    print("--- 1. Login de Coordinador y Gerente ---")
    coord_login = client_coord.post("/api/auth/login", json={
        "email": "coordinador@carchecking.com",
        "password": "coord123"
    })
    assert coord_login.status_code == 200
    coord_user = coord_login.json()
    print(f"Coordinador: {coord_user['nombre']} (ID: {coord_user['id']})")

    gerente_login = client_gerente.post("/api/auth/login", json={
        "email": "gerente@carchecking.com",
        "password": "gerente123"
    })
    assert gerente_login.status_code == 200
    gerente_user = gerente_login.json()
    print(f"Gerente: {gerente_user['nombre']} (ID: {gerente_user['id']})")

    # 2. Cargar vehículos y catálogo
    vehiculos = client_coord.get("/api/vehiculos").json()
    catalog = client_coord.get("/api/inspecciones/checklist-catalog").json()
    vehiculo_1 = vehiculos[0] # Toyota Hilux
    vehiculo_2 = vehiculos[2] # VW Amarok

    # 3. Validar restricción de Roles: Gerente NO puede crear inspecciones (Debe retornar 403)
    print("\n--- 2. Validando que Gerente no pueda escribir (HTTP 403) ---")
    checklist_payload = [{"catalogo_id": cat["id"], "valor": "bueno"} for cat in catalog]
    
    test_payload = {
        "vehiculo_id": vehiculo_1["id"],
        "kilometraje": vehiculo_1["kilometraje_actual"] + 500,
        "resultado_general": "apto",
        "firma_url": "/static/uploads/firma.png",
        "checklist_items": checklist_payload,
        "evidencias": []
    }
    
    headers_g = {"X-Idempotency-Key": str(uuid.uuid4())}
    forbidden_res = client_gerente.post("/api/inspecciones", json=test_payload, headers=headers_g)
    print(f"Creación por Gerente - Status: {forbidden_res.status_code} | Body: {forbidden_res.json()}")
    assert forbidden_res.status_code == 403

    # 4. Coordinador crea Inspección A (Hilux, resultado: 'apto')
    print("\n--- 3. Coordinador crea Inspección A (Apto) ---")
    headers_a = {"X-Idempotency-Key": str(uuid.uuid4())}
    res_a = client_coord.post("/api/inspecciones", json=test_payload, headers=headers_a)
    assert res_a.status_code == 201
    inspeccion_a = res_a.json()
    print(f"Inspección A creada (ID: {inspeccion_a['id']})")

    # 5. Coordinador crea Inspección B (Amarok, resultado: 'no_apto')
    print("\n--- 4. Coordinador crea Inspección B (No Apto) ---")
    payload_b = test_payload.copy()
    payload_b["vehiculo_id"] = vehiculo_2["id"]
    payload_b["kilometraje"] = vehiculo_2["kilometraje_actual"] + 200
    payload_b["resultado_general"] = "no_apto"
    
    headers_b = {"X-Idempotency-Key": str(uuid.uuid4())}
    res_b = client_coord.post("/api/inspecciones", json=payload_b, headers=headers_b)
    assert res_b.status_code == 201
    inspeccion_b = res_b.json()
    print(f"Inspección B creada (ID: {inspeccion_b['id']})")

    # 6. Gerente prueba los filtros dinámicos (GET /api/inspecciones)
    print("\n--- 5. Probando filtros como Gerente ---")
    
    # 6a. Sin filtros (deben venir ambas al menos)
    res_all = client_gerente.get("/api/inspecciones")
    ids_all = [ins["id"] for ins in res_all.json()]
    assert inspeccion_a["id"] in ids_all
    assert inspeccion_b["id"] in ids_all
    print(f"Sin filtros: total de inspecciones listadas {len(ids_all)} (Correcto)")

    # 6b. Filtrar por vehículo 1 (Hilux)
    res_v1 = client_gerente.get(f"/api/inspecciones?vehiculo_id={vehiculo_1['id']}")
    ids_v1 = [ins["id"] for ins in res_v1.json()]
    assert inspeccion_a["id"] in ids_v1
    assert inspeccion_b["id"] not in ids_v1
    print("Filtrado por Vehículo 1: solo Inspección A listada (Correcto)")

    # 6c. Filtrar por vehículo 2 (Amarok)
    res_v2 = client_gerente.get(f"/api/inspecciones?vehiculo_id={vehiculo_2['id']}")
    ids_v2 = [ins["id"] for ins in res_v2.json()]
    assert inspeccion_b["id"] in ids_v2
    assert inspeccion_a["id"] not in ids_v2
    print("Filtrado por Vehículo 2: solo Inspección B listada (Correcto)")

    # 6d. Filtrar por resultado general 'no_apto'
    res_na = client_gerente.get("/api/inspecciones?resultado_general=no_apto")
    ids_na = [ins["id"] for ins in res_na.json()]
    assert inspeccion_b["id"] in ids_na
    assert inspeccion_a["id"] not in ids_na
    print("Filtrado por Resultado 'no_apto': solo Inspección B listada (Correcto)")

    # 6e. Filtrar por Coordinador
    res_co = client_gerente.get(f"/api/inspecciones?coordinador_id={coord_user['id']}")
    ids_co = [ins["id"] for ins in res_co.json()]
    assert inspeccion_a["id"] in ids_co
    assert inspeccion_b["id"] in ids_co
    print("Filtrado por Coordinador: Inspecciones A y B listadas (Correcto)")

    # 6f. Filtrar por fechas
    # Usamos fechas naive en formato ISO simple para evitar caracteres '+' en la URL de consulta
    t_start = (datetime.utcnow() - timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S")
    t_end = (datetime.utcnow() + timedelta(hours=1)).strftime("%Y-%m-%dT%H:%M:%S")
    
    res_date = client_gerente.get(f"/api/inspecciones?fecha_inicio={t_start}&fecha_fin={t_end}")
    assert res_date.status_code == 200, f"Error en filtro de fecha: {res_date.text}"
    ids_date = [ins["id"] for ins in res_date.json()]
    assert inspeccion_a["id"] in ids_date
    assert inspeccion_b["id"] in ids_date
    print("Filtrado por fecha (rango válido): ambas inspecciones listadas (Correcto)")

    t_future = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%S")
    res_date_empty = client_gerente.get(f"/api/inspecciones?fecha_inicio={t_future}")
    assert res_date_empty.status_code == 200
    ids_date_empty = [ins["id"] for ins in res_date_empty.json()]
    assert inspeccion_a["id"] not in ids_date_empty
    assert inspeccion_b["id"] not in ids_date_empty
    print("Filtrado por fecha (rango futuro vacío): ninguna inspección listada (Correcto)")

    # 7. Limpieza: Coordinador borra las inspecciones de prueba (soft-delete)
    print("\n--- 6. Limpiando datos de prueba (Soft Delete) ---")
    del_a = client_coord.delete(f"/api/inspecciones/{inspeccion_a['id']}")
    assert del_a.status_code == 200
    del_b = client_coord.delete(f"/api/inspecciones/{inspeccion_b['id']}")
    assert del_b.status_code == 200
    print("Inspecciones de prueba eliminadas de forma lógica.")

    print("\n¡Prueba de filtros dinámicos y control de roles completada con éxito al 100%!")

if __name__ == "__main__":
    test_filtros_and_roles_flow()
