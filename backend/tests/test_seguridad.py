import httpx

def test_security_headers_and_rate_limiting():
    client = httpx.Client(base_url="http://127.0.0.1:8000")

    # 1. Probar presencia de Security Headers
    print("--- 1. Validando Cabeceras de Seguridad (Security Headers & CSP) ---")
    health_res = client.get("/health")
    assert health_res.status_code == 200

    headers = health_res.headers
    print(f"X-Content-Type-Options: {headers.get('x-content-type-options')}")
    print(f"X-Frame-Options: {headers.get('x-frame-options')}")
    print(f"Strict-Transport-Security: {headers.get('strict-transport-security')}")
    print(f"Content-Security-Policy: {headers.get('content-security-policy')}")

    assert headers.get("x-content-type-options") == "nosniff"
    assert headers.get("x-frame-options") == "DENY"
    assert headers.get("x-xss-protection") == "1; mode=block"
    assert "max-age=31536000" in headers.get("strict-transport-security", "")
    assert "default-src 'self'" in headers.get("content-security-policy", "")
    print("Cabeceras de seguridad validadas correctamente (OK).")

    # 2. Probar Rate Limiting en /api/auth/login (Máximo 5 peticiones/minuto)
    print("\n--- 2. Validando Rate Limiting en Login (Máximo 5 intentos/min) ---")
    bad_login_payload = {
        "email": "invalid@test.com",
        "password": "wrongpassword"
    }

    status_codes = []
    for i in range(7):
        res = client.post("/api/auth/login", json=bad_login_payload)
        status_codes.append(res.status_code)
        print(f"Intento #{i + 1} - Status HTTP: {res.status_code}")

    # Los primeros 5 deben responder 401 o 400 (por credenciales inválidas), el 6to en adelante debe ser 429
    assert 429 in status_codes, f"Se esperaba HTTP 429 Too Many Requests, se obtuvo: {status_codes}"
    print("Rate Limiting verificado exitosamente. Retornó HTTP 429 ante solicitudes excesivas.")

    print("\n¡Pruebas de Seguridad y Rate Limiting completadas con éxito al 100%!")

if __name__ == "__main__":
    test_security_headers_and_rate_limiting()
