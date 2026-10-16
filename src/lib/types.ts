export const QUESTION_TYPES = ["text", "email", "multiple_choice", "yes_no"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export type FormStatus = "draft" | "published";
export type ResponseSource = "link" | "embed";

export type FormSettings = {
  primaryColor?: string;
  welcomeMessage?: string;
  completionMessage?: string;
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
};

/** A question as edited in the builder (before it is saved). */
export type QuestionDraft = Pick<Question, "id" | "type" | "label" | "required" | "options">;

/** What the chat widget needs to render a form. Safe to send to the browser. */
export type ChatQuestion = Pick<Question, "id" | "type" | "label" | "required" | "options">;
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
