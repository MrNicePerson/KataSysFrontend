const API_BASE_URL = (
  import.meta.env.VITE_API_URL || '/api'
).replace(/\/$/, '')

export async function apiRequest(
  path,
  { token, method = 'GET', body, signal } = {}
) {
  const response = await fetch(
    `${API_BASE_URL}/${String(path).replace(/^\//, '')}`,
    {
      method,
      signal,

      headers: {
        ...(body === undefined
          ? {}
          : { 'Content-Type': 'application/json' }),

        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },

      ...(body === undefined
        ? {}
        : { body: JSON.stringify(body) }),
    }
  )

  const result = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(
      result.error || `Request failed (${response.status}).`
    )
  }

  return result.data ?? result
}

// Authentication
export const signIn = (credentials) =>
  apiRequest('auth/login', {
    method: 'POST',
    body: credentials,
  })

export const registerFirstAdmin = (credentials) =>
  apiRequest('auth/register', {
    method: 'POST',
    body: credentials,
  })

export const getBootstrapStatus = () =>
  apiRequest('auth/bootstrap')

export const getCurrentUser = (token) =>
  apiRequest('auth/me', {
    token,
  })

// Workspace
export const getWorkspace = (token) =>
  apiRequest('workspace', {
    token,
  })