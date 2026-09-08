import axios from 'axios'

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('km_api_url')
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '')
    }
  }
  const envUrl = ((import.meta as any).env?.VITE_API_URL as string)
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '')
  }
  return 'http://127.0.0.1:8000'
}

export function setApiBaseUrl(url: string) {
  const clean = url.trim().replace(/\/$/, '')
  if (typeof window !== 'undefined') {
    localStorage.setItem('km_api_url', clean)
  }
  client.defaults.baseURL = clean
}

export const API = getApiBaseUrl()

const client = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl()
  const token = localStorage.getItem('km_token')

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

export async function login(email: string, password: string) {
  try {
    const response = await client.post('/auth/login', {
      email,
      password,
    })

    const data = response.data

    localStorage.setItem('km_token', data.access_token)
    localStorage.setItem('km_user', JSON.stringify(data.user))

    return data.user
  } catch (error: any) {
    console.error('LOGIN ERROR:', error)

    if (error.response) {
      console.error('Server response:', error.response.data)
      throw new Error(
        error.response.data?.detail || 'Login failed'
      )
    }

    const currentUrl = getApiBaseUrl()
    throw new Error(
      `Cannot connect to backend (${currentUrl}). Make sure FastAPI is running or update the Backend API URL below.`
    )
  }
}

export function logout() {
  localStorage.removeItem('km_token')
  localStorage.removeItem('km_user')
}

export function user() {
  try {
    return JSON.parse(
      localStorage.getItem('km_user') || 'null'
    )
  } catch {
    return null
  }
}

export default client
