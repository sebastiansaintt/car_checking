import io
import uuid
import httpx

def test_inspeccion_flow():
    client = httpx.Client(base_url="http://localhost:8000")

    # 1. Login como Coordinador
    print("--- 1. Login como Coordinador ---")
    login_res = client.post("/api/auth/login", json={
        "email": "coordinador@carchecking.com",
        "password": "coord123"
    })
    assert login_res.status_code == 200, f"Login fallido: {login_res.text}"
    coordinador = login_res.json()
    print(f"Login exitoso: {coordinador['nombre']} ({coordinador['rol']})")

    # 2. Obtener lista de vehículos y seleccionar el primero
    print("\n--- 2. Obtener vehículos activos ---")
    vehiculos_res = client.get("/api/vehiculos")
    assert vehiculos_res.status_code == 200
    vehiculos = vehiculos_res.json()
    assert len(vehiculos) > 0, "No hay vehículos en la base de datos"
    vehiculo = vehiculos[0]  # Tomamos el primero, ej: Toyota Hilux AB-CD-12 (Km actual: 45000)
    print(f"Vehículo seleccionado: {vehiculo['marca']} {vehiculo['modelo']} ({vehiculo['patente']}) - Km actual: {vehiculo['kilometraje_actual']}")

    # 3. Obtener catálogo maestro de items de checklist
    print("\n--- 3. Obtener catálogo de checklist ---")
    catalog_res = client.get("/api/inspecciones/checklist-catalog")
    assert catalog_res.status_code == 200
    catalog = catalog_res.json()
    assert len(catalog) > 0
    print(f"Catálogo cargado con {len(catalog)} ítems")

    # 4. Simular obtención de URL firmada y subida de evidencia fotográfica / firma
    print("\n--- 4. Solicitar URL firmada para fotos y firmas ---")
    presigned_res = client.post("/api/inspecciones/presigned-url", json={
        "filename": "daño_neumatico.jpg"
    })
    assert presigned_res.status_code == 200
    urls = presigned_res.json()
    upload_url = urls["upload_url"]
    file_url = urls["file_url"]
    print(f"Generado local mock upload_url: {upload_url}")
    print(f"Generado local mock file_url (final): {file_url}")

    # Subir archivo simulado a la URL dada
    print("Subiendo archivo simulado al backend...")
    file_data = io.BytesIO(b"dummy image data")
    upload_res = client.post(upload_url, files={"file": ("daño_neumatico.jpg", file_data, "image/jpeg")})
    assert upload_res.status_code == 200, f"Error subida: {upload_res.text}"
    print("Archivo guardado con éxito en el servidor estático")

    # 5. Crear una inspección con kilometraje válido
    print("\n--- 5. Crear Inspección (Kilometraje Válido) ---")
    # Construir checklist items
    checklist_items = []
    # Asignamos 'bueno' a todos los items del catálogo
    for cat_item in catalog:
        checklist_items.append({
            "catalogo_id": cat_item["id"],
            "valor": "bueno"
        })
    # Cambiamos uno a 'malo' para testear
    checklist_items[0]["valor"] = "malo"
    first_item_catalog_id = checklist_items[0]["catalogo_id"]

    idempotency_key = str(uuid.uuid4())
    headers = {"X-Idempotency-Key": idempotency_key}

    # Kilometraje debe ser mayor al actual (ej: actual 45000 -> enviamos 46000)
    nuevo_km = vehiculo["kilometraje_actual"] + 1000

    inspeccion_data = {
        "vehiculo_id": vehiculo["id"],
        "kilometraje": nuevo_km,
        "resultado_general": "apto",
        "mantenimiento_recomendado": "Revisar neumático con daño leve",
        "firma_url": "/static/uploads/firma_coordinador.png",
        "observaciones": "Inspección general de rutina completa",
        "checklist_items": checklist_items,
        "evidencias": [
            {
                "url": file_url,
                "checklist_item_id": first_item_catalog_id,  # Vinculada al primer item
                "descripcion": "Corte superficial en cara externa del neumático"
            }
        ]
    }

    create_res = client.post("/api/inspecciones", json=inspeccion_data, headers=headers)
    assert create_res.status_code == 201, f"Error al crear: {create_res.text}"
    inspeccion = create_res.json()
    print(f"Inspección creada con ID: {inspeccion['id']}")
    print(f"Kilometraje registrado: {inspeccion['kilometraje']} Km")
    print(f"Items evaluados: {len(inspeccion['checklist_items'])}")
    print(f"Evidencias adjuntas: {len(inspeccion['evidencias'])}")
    assert len(inspeccion["checklist_items"]) == len(catalog)
    assert len(inspeccion["evidencias"]) == 1

    # Verificar que el kilometraje del vehículo se actualizó en el backend
    vehiculos_res = client.get("/api/vehiculos")
    vehiculo_actualizado = [v for v in vehiculos_res.json() if v["id"] == vehiculo["id"]][0]
    print(f"Kilometraje actualizado del vehículo en DB: {vehiculo_actualizado['kilometraje_actual']} Km")
    assert vehiculo_actualizado["kilometraje_actual"] == nuevo_km

    # 6. Intentar reenviar con la misma Idempotency Key (Debe retornar respuesta cacheada)
    print("\n--- 6. Reenviar con la misma Idempotency Key ---")
    retry_res = client.post("/api/inspecciones", json=inspeccion_data, headers=headers)
    assert retry_res.status_code == 201
    retry_inspeccion = retry_res.json()
    assert retry_inspeccion["id"] == inspeccion["id"], "No retornó el mismo ID"
    print("Idempotencia exitosa. Se retornó el registro cacheado correctamente.")

    # 7. Intentar crear con Kilometraje inválido (Menor al actual)
    print("\n--- 7. Crear con kilometraje inválido (Menor al actual) ---")
    invalid_data = inspeccion_data.copy()
    invalid_data["kilometraje"] = nuevo_km - 500  # 45500 cuando el auto ya tiene 46000
    invalid_headers = {"X-Idempotency-Key": str(uuid.uuid4())}
    
    invalid_res = client.post("/api/inspecciones", json=invalid_data, headers=invalid_headers)
    print(f"Status: {invalid_res.status_code} | Body: {invalid_res.json()}")
    assert invalid_res.status_code == 400
    print("Regla de negocio validada correctamente: Se rechazó el kilometraje menor al actual.")

    # 8. Modificar la inspección (Editar reporte)
    print("\n--- 8. Editar reporte de inspección ---")
    update_data = {
        "observaciones": "Inspección corregida: Neumático delantero derecho requiere cambio pronto."
    }
    update_res = client.put(f"/api/inspecciones/{inspeccion['id']}", json=update_data)
    assert update_res.status_code == 200
    inspeccion_editada = update_res.json()
    print(f"Observación actualizada: '{inspeccion_editada['observaciones']}'")
    assert inspeccion_editada["observaciones"] == update_data["observaciones"]

    # 9. Eliminar lógicamente la inspección (Soft Delete)
    print("\n--- 9. Eliminar lógicamente la inspección (Soft Delete) ---")
    delete_res = client.delete(f"/api/inspecciones/{inspeccion['id']}")
    assert delete_res.status_code == 200
    print(f"Respuesta de borrado: {delete_res.json()['message']}")

    # 10. Verificar que ya no aparece en el listado activo
    print("\n--- 10. Verificar que ya no figura en listados ---")
    list_res = client.get("/api/inspecciones")
    active_ids = [ins["id"] for ins in list_res.json()]
    assert inspeccion["id"] not in active_ids
    print("Confirmado. La inspección fue removida de los listados activos.")
    
    print("\n¡Flujo CRUD de Inspecciones e Idempotencia validado al 100% exitosamente!")

if __name__ == "__main__":
    test_inspeccion_flow()
