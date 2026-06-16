// ─── Request body types ───────────────────────────────────────────────────────

export interface ContactFormData {
  name: string;
  organization: string;
  designation: string;
  email: string;
  phone: string;
  message: string;
}

export interface GapAnalysisFormData {
  name: string;
  hospitalName: string;
  hospitalType: string;
  numberOfBeds: number;
  city: string;
  state: string;
  email: string;
  phone: string;
  accreditationStatus: string;
  preferredConsultationDate: string;
  additionalNotes?: string;
}

// ─── API response ─────────────────────────────────────────────────────────────

export interface ApiResult {
  success: boolean;
  message: string;
}

// ─── Database row shapes ──────────────────────────────────────────────────────

export interface ContactSubmissionRow {
  id: number;
  name: string;
  organization: string;
  designation: string;
  email: string;
  phone: string;
  message: string;
  ip_address: string | null;
  created_at: Date;
}

export interface GapAnalysisBookingRow {
  id: number;
  name: string;
  hospital_name: string;
  hospital_type: string;
  number_of_beds: number;
  city: string;
  state: string;
  email: string;
  phone: string;
  accreditation_status: string;
  preferred_consultation_date: Date;
  additional_notes: string | null;
  ip_address: string | null;
  created_at: Date;
}
