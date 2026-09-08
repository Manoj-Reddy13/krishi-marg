import axios from 'axios'

export const API = ((import.meta as any).env?.VITE_API_URL as string) || 'http://127.0.0.1:8000'

const client = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
})

client.interceptors.request.use((config) => {
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

    throw new Error(
      'Cannot connect to backend. Make sure FastAPI is running on port 8000.'
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
