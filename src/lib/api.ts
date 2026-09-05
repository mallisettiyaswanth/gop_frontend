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

export type LoginMethod = {
  pinEnabled: boolean
}

export async function getLoginMethod(email: string): Promise<LoginMethod> {
  const res = await fetch(`${API_URL}/auth/login-method`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
  return parseJsonOrThrow(res)
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

function authFetch(token: string, path: string, init: RequestInit = {}) {
  return fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  })
}

export type MemberStatus =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "FROZEN"
  | "CANCELLED"
  | "PENDING"

export type Member = {
  id: string
  memberCode: string
  name: string
  phone: string
  email: string | null
  status: MemberStatus
  joinDate: string
  createdAt: string
}

export type CreateMemberInput = {
  name: string
  phone: string
  email?: string
  notes?: string
}

export async function listMembers(token: string): Promise<Member[]> {
  const res = await authFetch(token, "/members")
  return parseJsonOrThrow(res)
}

export async function createMember(token: string, input: CreateMemberInput): Promise<Member> {
  const res = await authFetch(token, "/members", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return parseJsonOrThrow(res)
}

export type GymSettings = {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  gstNumber: string | null
  timezone: string
  currency: string
  createdAt: string
  updatedAt: string
}

export type UpdateGymSettingsInput = Partial<
  Omit<GymSettings, "id" | "createdAt" | "updatedAt">
>

export async function getGymSettings(token: string): Promise<GymSettings> {
  const res = await authFetch(token, "/settings")
  return parseJsonOrThrow(res)
}

export async function updateGymSettings(
  token: string,
  input: UpdateGymSettingsInput
): Promise<GymSettings> {
  const res = await authFetch(token, "/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return parseJsonOrThrow(res)
}

export type OwnProfile = CurrentUser & {
  phone: string | null
  isActive: boolean
  createdAt: string
  pinEnabled: boolean
  hasPin: boolean
}

export async function getOwnProfile(token: string): Promise<OwnProfile> {
  const res = await authFetch(token, "/users/me")
  return parseJsonOrThrow(res)
}

export type UpdateCredentialsInput = {
  currentPassword?: string
  newPassword?: string
  newPin?: string
  pinEnabled?: boolean
}

export async function updateOwnCredentials(
  token: string,
  input: UpdateCredentialsInput
): Promise<OwnProfile> {
  const res = await authFetch(token, "/users/me/credentials", {
    method: "PATCH",
    body: JSON.stringify(input),
  })
  return parseJsonOrThrow(res)
}
