export type VerificationStatus = "not_verified" | "pending" | "verified" | "rejected"

export interface VerificationImage {
  id: string
  user_id: string
  image_type: "license_plate" | "dashboard"
  image_url?: string
  image_base64?: string
  created_at: string
}

export interface VerificationInfo {
  code: string
  status: VerificationStatus
  generatedAt: string | null
  expiresAt: string | null
  submittedAt: string | null
  reviewedAt: string | null
  daysLeft: number | null
}
