export class AuthError extends Error {}

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.status === 401) {
    throw new AuthError('Unauthorized')
  }
  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || `Request failed with status ${response.status}`)
  }
  return response.json() as Promise<T>
}

export const apiRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.headers as Record<string, string> | undefined),
    },
  })
  return handleResponse<T>(response)
}

export const apiUpload = async <T>(path: string, formData: FormData, method = 'POST'): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: 'include',
    body: formData,
  })
  return handleResponse<T>(response)
}
