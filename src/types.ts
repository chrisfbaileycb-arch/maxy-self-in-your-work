// Self Maximizer — Explicit TypeScript Interfaces & Schemas

export interface MemoryRow {
  id: string;
  user_id?: string;
  project_id: string;
  content: string;
  category: "personal" | "work" | string;
  is_private: boolean;
  salience: number;
  batch_id?: string | null;
  created_at: string;
}

export interface ProjectRow {
  id: string;
  name: string;
  kind: "personal" | "work";
  last_activity_at: string;
  archived_at: string | null;
  created_at: string;
}

export interface NoteRow {
  id: string;
  body: string;
  done: boolean;
  created_at: string;
  done_at?: string | null;
}

export interface TemplateRow {
  id: string;
  name: string;
  body: string;
  created_at: string;
}

export interface IdentityTokenRow {
  id: string;
  token: string;
  label: string;
  mode: "system" | "email" | "text" | string;
  critical_only: boolean;
  revoked_at: string | null;
  expires_at: string | null;
  last_used_at: string | null;
  use_count: number;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  pause_recording: boolean;
  created_at?: string;
}

export interface SubscriptionRow {
  status: "active" | "trialing" | "past_due" | "canceled" | "none" | string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end?: boolean | null;
  isPro?: boolean;
  projectCap?: number | null;
  paddle_customer_id?: string | null;
  paddle_subscription_id?: string | null;
}

export interface UsageCounterRow {
  sort_count: number;
  cap: number;
  period_month?: string;
}

export interface PlatformPreset {
  id: string;
  name: string;
  platform: "chatgpt" | "claude" | "gemini" | "custom_api" | string;
  systemPromptMode: "system" | "email" | "text";
  description: string;
  recommendedTopN: number;
}

export interface SystemPromptExportConfig {
  criticalFirst: boolean;
  topN?: number;
  mode: "system" | "email" | "text";
  projectId?: string | null;
}

export interface CampaignData {
  id: string;
  title: string;
  status: "active" | "draft" | "completed";
  targetCount: number;
  completedCount: number;
  created_at: string;
}

export interface ElicitedQuestion {
  question: string;
  rationale: string;
  priority: "critical" | "high" | "normal";
}

export interface ElicitItem extends ElicitedQuestion {
  id: string;
  answer: string;
  saving: boolean;
  subject?: string | null;
  category: "personal" | "work";
}

export interface UserSettings {
  displayName: string;
  pauseRecording: boolean;
  pushNotificationsEnabled: boolean;
  theme: "light" | "dark" | "system";
}

export interface ProfileSettings {
  displayName: string;
  pauseRecording: boolean;
}

export interface PushNotificationConfig {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
}

// Component Prop Types
export interface SelfNotesProps {
  autoMic?: boolean;
  className?: string;
}

export interface BucketRobotProps {
  state?: "idle" | "thinking" | "happy";
  className?: string;
}

export interface AppHeaderProps {
  userDisplayName?: string | null;
  showNav?: boolean;
  className?: string;
}

export interface PaymentTestModeBannerProps {
  env?: "sandbox" | "live";
  className?: string;
}

// API Payloads & Responses
export interface SortConversationPayload {
  text: string;
}

export interface SortConversationResponse {
  status: "sorted" | "paused" | "capped" | "empty";
  saved: number;
  personalCount: number;
  workCount: number;
  message?: string;
  batchId?: string;
}

export interface ElicitResponse {
  questions: ElicitedQuestion[];
}

export interface TemplateResponse {
  templates: TemplateRow[];
}

export interface ExportResponse {
  markdown: string;
  filename?: string;
}

export interface ExtensionHandshakePayload {
  text?: string;
  source?: string;
  capturedAt?: number;
  [key: string]: unknown;
}
