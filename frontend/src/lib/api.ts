import axios from "axios"

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
})

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const restaurantId = localStorage.getItem("activeRestaurantId")
    if (restaurantId) {
      config.headers["x-restaurant-id"] = restaurantId
    }
  }
  return config
})

// Prisma Decimal fields come as strings ("82.50"). This transformer
// recursively converts numeric-looking strings to actual numbers so every
// page can do arithmetic without manual Number() calls.
const NUMERIC_RE = /^-?\d+(\.\d+)?$/

function parseDecimals(data: unknown): unknown {
  if (data === null || data === undefined) return data
  if (typeof data === "string" && NUMERIC_RE.test(data) && data.length < 20) {
    return Number(data)
  }
  if (Array.isArray(data)) return data.map(parseDecimals)
  if (typeof data === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      out[k] = parseDecimals(v)
    }
    return out
  }
  return data
}

api.interceptors.response.use(
  (response) => {
    response.data = parseDecimals(response.data)
    return response
  },
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry && typeof window !== "undefined") {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem("refreshToken")
      if (refreshToken) {
        try {
          const res = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"}/auth/refresh`,
            { refreshToken }
          )
          const { accessToken, refreshToken: newRefresh } = res.data
          localStorage.setItem("accessToken", accessToken)
          localStorage.setItem("refreshToken", newRefresh)
          originalRequest.headers.Authorization = `Bearer ${accessToken}`
          return api(originalRequest)
        } catch {
          localStorage.removeItem("accessToken")
          localStorage.removeItem("refreshToken")
          localStorage.removeItem("activeRestaurantId")
          window.location.href = "/auth/login"
          return Promise.reject(error)
        }
      } else {
        localStorage.removeItem("accessToken")
        localStorage.removeItem("refreshToken")
        localStorage.removeItem("activeRestaurantId")
        window.location.href = "/auth/login"
      }
    }
    return Promise.reject(error)
  }
)

export default api
