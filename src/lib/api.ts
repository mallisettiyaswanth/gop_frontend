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

export type MembershipStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "FROZEN" | "CANCELLED"

export type MemberMembership = {
  id: string
  planId: string
  startDate: string
  endDate: string
  status: MembershipStatus
  price: string
  plan: MembershipPlan
}

export type Member = {
  id: string
  memberCode: string
  name: string
  phone: string
  email: string | null
  status: MemberStatus
  joinDate: string
  createdAt: string
  membership: MemberMembership | null
  streak: number
}

export type CreateMemberInput = {
  name: string
  phone: string
  email?: string
  notes?: string
}

export type ListMembersParams = {
  skip?: number
  limit?: number
  sortBy?: string
  sortDir?: "asc" | "desc"
  search?: string
  /** Comma-separated MemberStatus values. */
  status?: string
  planId?: string
}

export type ListMembersResult = {
  data: Member[]
  total: number
  skip: number
  limit: number
}

export async function listMembers(
  token: string,
  params: ListMembersParams = {}
): Promise<ListMembersResult> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value))
  }
  const qs = query.toString()
  const res = await authFetch(token, `/members${qs ? `?${qs}` : ""}`)
  return parseJsonOrThrow(res)
}

export type AttendanceGridMember = {
  id: string
  memberCode: string
  name: string
  phone: string
  /** Dates (YYYY-MM-DD) within the requested range this member attended. */
  attendedDates: string[]
  presentCount: number
  /** All-time streak: weeks with 5+ distinct attendance days. */
  streak: number
}

export type AttendanceGridParams = {
  /** Inclusive range start, YYYY-MM-DD. */
  from: string
  /** Inclusive range end, YYYY-MM-DD. */
  to: string
  search?: string
  skip?: number
  limit?: number
}

export type AttendanceGridResult = {
  data: AttendanceGridMember[]
  total: number
  skip: number
  limit: number
  from: string
  to: string
  /** Number of days spanned by from..to, inclusive. */
  totalDays: number
}

export async function getAttendanceGrid(
  token: string,
  params: AttendanceGridParams
): Promise<AttendanceGridResult> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") query.set(key, String(value))
  }
  const res = await authFetch(token, `/attendance?${query.toString()}`)
  return parseJsonOrThrow(res)
}

export async function createMember(token: string, input: CreateMemberInput): Promise<Member> {
  const res = await authFetch(token, "/members", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return parseJsonOrThrow(res)
}

export type PriceTier = {
  label: string
  price: number
  durationDays: number
}

export type MembershipPlan = {
  id: string
  name: string
  category: string | null
  level: string | null
  /** Hex color (e.g. "#22c55e") used to highlight this plan's members in tables. */
  color: string | null
  description: string | null
  priceTiers: PriceTier[]
  /** Label of the priceTiers entry featured as "most popular" on the card. */
  highlightedTier: string | null
  joiningFee: string
  taxPercent: string
  visitLimit: number | null
  /** This plan's own features, on top of whatever includesPlan already covers. */
  features: string[]
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
  /** Members currently on an active membership under this plan. */
  memberCount: number
  includesPlanId: string | null
  includesPlan: { id: string; name: string } | null
}

export type MembershipPlanInput = {
  name: string
  category?: string
  level?: string
  color?: string
  description?: string
  priceTiers: PriceTier[]
  highlightedTier?: string
  includesPlanId?: string
  joiningFee?: number
  taxPercent?: number
  visitLimit?: number
  features?: string[]
  isActive?: boolean
  sortOrder?: number
}

export async function listMembershipPlans(token: string): Promise<MembershipPlan[]> {
  const res = await authFetch(token, "/membership-plans")
  return parseJsonOrThrow(res)
}

export async function createMembershipPlan(
  token: string,
  input: MembershipPlanInput
): Promise<MembershipPlan> {
  const res = await authFetch(token, "/membership-plans", {
    method: "POST",
    body: JSON.stringify(input),
  })
  return parseJsonOrThrow(res)
}

export async function updateMembershipPlan(
  token: string,
  id: string,
  input: Partial<MembershipPlanInput>
): Promise<MembershipPlan> {
  const res = await authFetch(token, `/membership-plans/${id}`, {
    method: "PATCH",
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
