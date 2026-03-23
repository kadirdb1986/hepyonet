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

api.interceptors.response.use(
  (response) => response,
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
