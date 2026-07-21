import httpx

def test_audit_log_flow():
    client_gerente = httpx.Client(base_url="http://127.0.0.1:8000")

    print("--- 1. Login como Gerente ---")
    login_res = client_gerente.post("/api/auth/login", json={
        "email": "gerente@carchecking.com",
        "password": "gerente123"
    })
    assert login_res.status_code == 200

    print("\n--- 2. Consultar Bitácora de Auditoría (GET /api/audit-logs) ---")
    audit_res = client_gerente.get("/api/audit-logs")
    assert audit_res.status_code == 200
    logs = audit_res.json()
    print(f"Total de registros de auditoría recuperados: {len(logs)}")
    assert len(logs) > 0

    actions = set(log["accion"] for log in logs)
    print(f"Acciones registradas en el AuditLog: {actions}")
    assert "login" in actions or "exportar" in actions or "crear" in actions

    # 3. Filtrar auditoría por acción 'exportar'
    export_logs_res = client_gerente.get("/api/audit-logs?accion=exportar")
    assert export_logs_res.status_code == 200
    export_logs = export_logs_res.json()
    print(f"Registros de auditoría filtrados por acción 'exportar': {len(export_logs)}")

    print("\n¡Prueba de Bitácora Transversal AuditLog completada con éxito al 100%!")

if __name__ == "__main__":
    test_audit_log_flow()
