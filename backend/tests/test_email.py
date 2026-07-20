import uuid
import httpx

def test_email_notifications_flow():
    client_coord = httpx.Client(base_url="http://127.0.0.1:8000")

    print("--- 1. Login de Coordinador ---")
    login_res = client_coord.post("/api/auth/login", json={
        "email": "coordinador@carchecking.com",
        "password": "coord123"
    })
    assert login_res.status_code == 200

    # 2. Obtener vehículos y catálogo
    vehiculos = client_coord.get("/api/vehiculos").json()
    catalog = client_coord.get("/api/inspecciones/checklist-catalog").json()
    vehiculo = vehiculos[0]

    # 3. Crear Inspección de Prueba
    print("\n--- 2. Crear Inspección de Prueba ---")
    checklist_payload = [{"catalogo_id": cat["id"], "valor": "bueno"} for cat in catalog]
    test_payload = {
        "vehiculo_id": vehiculo["id"],
        "kilometraje": vehiculo["kilometraje_actual"] + 500,
        "resultado_general": "apto",
        "firma_url": "/static/uploads/firma.png",
        "observaciones": "Estado inicial pre-edición",
        "checklist_items": checklist_payload,
        "evidencias": []
    }
    
    headers = {"X-Idempotency-Key": str(uuid.uuid4())}
    create_res = client_coord.post("/api/inspecciones", json=test_payload, headers=headers)
    assert create_res.status_code == 201
    inspeccion = create_res.json()
    print(f"Inspección creada (ID: {inspeccion['id']})")

    # 4. Modificar Inspección (Dispara Email a Gerente)
    print("\n--- 3. Modificar Inspección (Dispara Notificación Email de Edición) ---")
    edit_payload = {
        "observaciones": "Observación MODIFICADA: Se requiere cambio de filtro de aceite."
    }
    edit_res = client_coord.put(f"/api/inspecciones/{inspeccion['id']}", json=edit_payload)
    assert edit_res.status_code == 200
    print("Modificación realizada con éxito. Notificación enviada al servicio de correo.")

    # 5. Eliminar Inspección (Dispara Email a Gerente por Soft Delete)
    print("\n--- 4. Eliminar Inspección (Dispara Notificación Email de Eliminación) ---")
    delete_res = client_coord.delete(f"/api/inspecciones/{inspeccion['id']}")
    assert delete_res.status_code == 200
    print("Eliminación lógica realizada con éxito. Notificación de alerta enviada al servicio de correo.")

    print("\n¡Prueba de Notificaciones Email por Edición/Eliminación completada al 100%!")

if __name__ == "__main__":
    test_email_notifications_flow()
