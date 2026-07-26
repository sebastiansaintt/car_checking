// Base URL para comunicarse con el backend FastAPI
// En producción (Vercel) se inyecta VITE_API_URL=https://tu-backend.onrender.com/api
// En desarrollo local con Docker, el proxy de Vite redirige /api → backend:8000
const rawApiUrl = import.meta.env.VITE_API_URL ?? "/api";
export const API_BASE_URL: string = rawApiUrl.replace(/\/+$/, "");

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

  const targetUrl = endpoint.startsWith("/")
    ? `${API_BASE_URL}${endpoint}`
    : `${API_BASE_URL}/${endpoint}`;

  const response = await fetch(targetUrl, config);

  if (!response.ok) {
    let errorMessage = "Ocurrió un error en la solicitud";
    try {
      const errorData = await response.json();
      if (errorData && errorData.detail) {
        if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
        } else if (typeof errorData.message === "string") {
          errorMessage = errorData.message;
        } else if (errorData.detail) {
          errorMessage = JSON.stringify(errorData.detail);
        }
      }
    } catch {
      // Ignorar si el cuerpo no es JSON
    }

    if (!errorMessage) {
      if (response.status === 401) {
        errorMessage = "Correo electrónico o contraseña incorrectos.";
      } else if (response.status === 403) {
        errorMessage = "No tiene permisos para realizar esta acción.";
      } else if (response.status === 404) {
        errorMessage = "El recurso solicitado no existe.";
      } else if (response.status >= 500) {
        errorMessage = "Error en el servidor al procesar la solicitud.";
      } else {
        errorMessage = "Ocurrió un error al procesar la solicitud.";
      }
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
