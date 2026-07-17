import httpx

def test_auth_flow():
    client = httpx.Client(base_url="http://localhost:8000")
    
    # 1. Login incorrecto
    response = client.post("/api/auth/login", json={
        "email": "coordinador@carchecking.com",
        "password": "wrongpassword"
    })
    assert response.status_code == 401
    
    # 2. Login correcto
    response = client.post("/api/auth/login", json={
        "email": "coordinador@carchecking.com",
        "password": "coord123"
    })
    assert response.status_code == 200
    assert "access_token" in response.cookies
    
    # 3. Acceso a /me autenticado
    response = client.get("/api/auth/me")
    assert response.status_code == 200
    assert response.json()["email"] == "coordinador@carchecking.com"
    
    # 4. Logout
    response = client.post("/api/auth/logout")
    assert response.status_code == 200
    
    # 5. Acceso a /me desautenticado (debe fallar)
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    
    print("¡Integración de Autenticación validada exitosamente!")

if __name__ == "__main__":
    test_auth_flow()
