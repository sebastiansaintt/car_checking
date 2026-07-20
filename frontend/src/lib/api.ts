// Base URL para comunicarse con el backend FastAPI
const API_BASE_URL = "/api";

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const defaultHeaders: Record<string, string> = {
    "Accept": "application/json",
  };

  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    ...options,
    credentials: "include", // Enviar y recibir cookies httpOnly
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    let errorMessage = "Ocurrió un error en la solicitud";
    try {
      const errorData = await response.json();
      if (errorData && errorData.detail) {
        errorMessage = typeof errorData.detail === "string" 
          ? errorData.detail 
          : JSON.stringify(errorData.detail);
      }
    } catch {
      // Ignorar si la respuesta no es JSON
    }
    throw new Error(errorMessage);
  }

  // Si la respuesta es de exportación de archivo, devolvemos Blob directamente
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("spreadsheetml")) {
    return (await response.blob()) as unknown as T;
  }

  return response.json();
}
