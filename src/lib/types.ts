export const QUESTION_TYPES = [
  "text",
  "email",
  "multiple_choice",
  "yes_no",
  "dropdown",
  "rating",
  "date",
  "file",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type FormStatus = "draft" | "published";
export type ResponseSource = "link" | "embed";

export type ConditionalOperator = "equals" | "not_equals" | "contains" | "is_answered";
export type ConditionalLogic = {
  dependsOn: string; // question ID
  operator: ConditionalOperator;
  value?: string;
};

export type QuestionValidation = {
  minLength?: number;
  maxLength?: number;
  minRating?: number;
  maxRating?: number; // default 5 or 10
  allowPast?: boolean;
  allowFuture?: boolean;
  maxFileSizeMB?: number; // default 5MB
  acceptedTypes?: string; // e.g. "image/*,.pdf,.doc,.docx"
};

export type AvatarType = "bot" | "sparkles" | "agent" | "smile" | "custom";
export type WidgetTheme = "light" | "dark" | "auto";
export type WidgetPosition = "right" | "left";

export type FormSettings = {
  primaryColor?: string;
  welcomeMessage?: string;
  completionMessage?: string;
  redirectUrl?: string;
  avatarType?: AvatarType;
  avatarUrl?: string;
  botName?: string;
  position?: WidgetPosition;
  theme?: WidgetTheme;
  // Notifications & Integrations
  notifyEmail?: string;
  notifyEnabled?: boolean;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookEnabled?: boolean;
  // Fallback extended question metadata for DB backwards compatibility
  questionMeta?: Record<
    string,
    {
      type: QuestionType;
      logic?: ConditionalLogic | null;
      validation?: QuestionValidation | null;
      options?: string[] | null;
    }
  >;
};

export type Form = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  slug: string;
  status: FormStatus;
  settings: FormSettings;
  created_at: string;
  updated_at: string;
};

export type Question = {
  id: string;
  form_id: string;
  type: QuestionType;
  label: string;
  required: boolean;
  options: string[] | null;
  position: number;
  logic?: ConditionalLogic | null;
  validation?: QuestionValidation | null;
};

/** A question as edited in the builder (before it is saved). */
export type QuestionDraft = Pick<
  Question,
  "id" | "type" | "label" | "required" | "options" | "logic" | "validation"
>;

/** What the chat widget needs to render a form. Safe to send to the browser. */
export type ChatQuestion = Pick<
  Question,
  "id" | "type" | "label" | "required" | "options" | "logic" | "validation"
>;

export type ChatFormData = {
  title: string;
  slug: string;
  settings: FormSettings;
  questions: ChatQuestion[];
};

export type AnswerSnapshot = {
  questionId: string;
  label: string;
  type: QuestionType;
  value: string;
};

export type FormResponse = {
  id: string;
  form_id: string;
  answers: AnswerSnapshot[];
  source: ResponseSource;
  submitted_at: string;
};

export type FormWithQuestions = Form & { questions: Question[] };

export type FormEventType = "view" | "start";
export type FormEvent = {
  id: string;
  form_id: string;
  event_type: FormEventType;
  created_at: string;
};

export type WebhookLog = {
  id: string;
  form_id: string;
  response_id?: string;
  url: string;
  status_code: number;
  success: boolean;
  error?: string;
  created_at: string;
};

export type QuestionStat = {
  questionId: string;
  label: string;
  type: QuestionType;
  totalAnswers: number;
  responseRate: number; // percentage
  breakdown?: Record<string, number>; // for choice/dropdown/yes_no
  averageRating?: number; // for rating
  ratingCounts?: Record<number, number>; // for rating
  recentAnswers?: string[];
};

export type AnalyticsSummary = {
  views: number;
  starts: number;
  completions: number;
  completionRate: number;
  abandonmentRate: number;
  avgTimeSeconds?: number;
  dailyStats: { date: string; views: number; starts: number; completions: number }[];
  questionStats: Record<string, QuestionStat>;
};

export type UserRole = "user" | "admin";
export type UserAccount = {
  id: string;
  email: string;
  created_at: string;
  form_count: number;
  response_count: number;
  is_suspended: boolean;
  role: UserRole;
};
