const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"

export type CurrentUser = {
  id: string
  name: string
  email: string
  role: "SUPER_ADMIN" | "ADMIN" | "MEMBER"
}

export type LoginResult = {
  accessToken: string
  user: CurrentUser
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message)
  }
}

async function parseJsonOrThrow(res: Response) {
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const message =
      (data && (data.message as string)) ?? `Request failed with status ${res.status}`
    throw new ApiError(Array.isArray(message) ? message.join(", ") : message, res.status)
  }
  return data
}

export async function loginWithPassword(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  return parseJsonOrThrow(res)
}

export async function loginWithPin(email: string, pin: string): Promise<LoginResult> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, pin }),
  })
  return parseJsonOrThrow(res)
}

export async function getCurrentUser(token: string): Promise<CurrentUser> {
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return parseJsonOrThrow(res)
}
