import type { FormSettings, QuestionDraft } from "./types";
import { uuid } from "./utils";

export type TemplateDefinition = {
  id: string;
  name: string;
  category: "Feedback" | "Events" | "Hiring" | "Product" | "Support";
  description: string;
  settings?: Partial<FormSettings>;
  buildQuestions: () => QuestionDraft[];
};

export const FORM_TEMPLATES: TemplateDefinition[] = [
  {
    id: "csat-feedback",
    name: "Customer Satisfaction (CSAT & NPS)",
    category: "Feedback",
    description: "Measure customer delight with star ratings and smart conditional follow-up questions.",
    settings: {
      primaryColor: "#059669",
      welcomeMessage: "Hi! 👋 We'd love your quick feedback on your experience today.",
      completionMessage: "Thank you for helping us improve! Your feedback has been received. 💚",
    },
    buildQuestions: () => {
      const q1Id = uuid();
      const q2Id = uuid();
      const q3Id = uuid();
      const q4Id = uuid();
      const q5Id = uuid();

      return [
        {
          id: q1Id,
          type: "rating",
          label: "How would you rate your overall experience with us?",
          required: true,
          options: null,
          validation: { minRating: 1, maxRating: 5 },
          logic: null,
        },
        {
          id: q2Id,
          type: "text",
          label: "We're sorry to hear that. What could we do to make your experience better?",
          required: false,
          options: null,
          logic: { dependsOn: q1Id, operator: "equals", value: "1" },
        },
        {
          id: q3Id,
          type: "text",
          label: "Awesome! What was the highlight of your experience?",
          required: false,
          options: null,
          logic: { dependsOn: q1Id, operator: "equals", value: "5" },
        },
        {
          id: q4Id,
          type: "dropdown",
          label: "Which area of our product do you use the most?",
          required: true,
          options: ["Core Platform", "Mobile App", "Integrations / API", "Analytics", "Other"],
          logic: null,
        },
        {
          id: q5Id,
          type: "email",
          label: "What's your email if you'd like a personal follow-up from our team?",
          required: false,
          options: null,
          logic: null,
        },
      ];
    },
  },
  {
    id: "event-registration",
    name: "Event & Conference RSVP",
    category: "Events",
    description: "Collect attendee details, arrival dates, ticket tiers and dietary requirements.",
    settings: {
      primaryColor: "#4f46e5",
      welcomeMessage: "Welcome! RSVP in less than 60 seconds to secure your spot. 🎟️",
      completionMessage: "You're registered! Look out for a confirmation email with event details. 🎉",
    },
    buildQuestions: () => {
      const q1Id = uuid();
      const q2Id = uuid();
      const q3Id = uuid();
      const q4Id = uuid();
      const q5Id = uuid();
      const q6Id = uuid();

      return [
        {
          id: q1Id,
          type: "text",
          label: "What is your full name?",
          required: true,
          options: null,
          logic: null,
        },
        {
          id: q2Id,
          type: "email",
          label: "What is your preferred email address for event updates?",
          required: true,
          options: null,
          logic: null,
        },
        {
          id: q3Id,
          type: "dropdown",
          label: "How will you be joining the conference?",
          required: true,
          options: ["In-Person (San Francisco)", "Virtual Livestream", "VIP Pass with Dinner"],
          logic: null,
        },
        {
          id: q4Id,
          type: "date",
          label: "When do you plan to arrive?",
          required: false,
          options: null,
          validation: { allowPast: false },
          logic: { dependsOn: q3Id, operator: "not_equals", value: "Virtual Livestream" },
        },
        {
          id: q5Id,
          type: "multiple_choice",
          label: "Do you have any dietary preferences for catered meals?",
          required: false,
          options: ["Standard", "Vegetarian", "Vegan", "Gluten-Free", "Halal / Kosher"],
          logic: { dependsOn: q3Id, operator: "not_equals", value: "Virtual Livestream" },
        },
        {
          id: q6Id,
          type: "yes_no",
          label: "Would you like to attend the evening networking reception?",
          required: true,
          options: null,
          logic: null,
        },
      ];
    },
  },
  {
    id: "job-application",
    name: "Job Candidate Application",
    category: "Hiring",
    description: "Streamline hiring with resume uploads, role selection, and availability dates.",
    settings: {
      primaryColor: "#2563eb",
      welcomeMessage: "Hello! We're excited you're interested in joining our team. 💼",
      completionMessage: "Thank you for applying! Our hiring team reviews submissions within 48 hours. 🚀",
    },
    buildQuestions: () => {
      return [
        {
          id: uuid(),
          type: "text",
          label: "What is your full name?",
          required: true,
          options: null,
          logic: null,
        },
        {
          id: uuid(),
          type: "email",
          label: "What is your email address?",
          required: true,
          options: null,
          logic: null,
        },
        {
          id: uuid(),
          type: "dropdown",
          label: "Which position are you applying for?",
          required: true,
          options: [
            "Senior Full-Stack Engineer",
            "Product Designer",
            "Product Manager",
            "DevOps & Security Engineer",
          ],
          logic: null,
        },
        {
          id: uuid(),
          type: "date",
          label: "What is your earliest available start date?",
          required: true,
          options: null,
          validation: { allowPast: false },
          logic: null,
        },
        {
          id: uuid(),
          type: "file",
          label: "Please upload your resume or CV (PDF, DOCX)",
          required: true,
          options: null,
          validation: { maxFileSizeMB: 10, acceptedTypes: ".pdf,.doc,.docx" },
          logic: null,
        },
        {
          id: uuid(),
          type: "text",
          label: "Briefly tell us what excites you most about this opportunity",
          required: false,
          options: null,
          validation: { maxLength: 1000 },
          logic: null,
        },
      ];
    },
  },
  {
    id: "product-feedback",
    name: "Feature Request & Product Feedback",
    category: "Product",
    description: "Gather structured ideas, bug reports, and rating criticality from active users.",
    settings: {
      primaryColor: "#d97706",
      welcomeMessage: "Help us build what you need! Share your feedback in 2 minutes. 💡",
      completionMessage: "Thank you for your valuable insight! You're helping shape our product roadmap. 🌟",
    },
    buildQuestions: () => {
      return [
        {
          id: uuid(),
          type: "dropdown",
          label: "What kind of feedback would you like to share?",
          required: true,
          options: ["New Feature Idea", "Usability Improvement", "Integration Request", "General Feedback"],
          logic: null,
        },
        {
          id: uuid(),
          type: "rating",
          label: "How important is this improvement to your daily workflow?",
          required: true,
          options: null,
          validation: { minRating: 1, maxRating: 5 },
          logic: null,
        },
        {
          id: uuid(),
          type: "text",
          label: "Please describe your idea or problem in as much detail as you'd like",
          required: true,
          options: null,
          validation: { minLength: 10 },
          logic: null,
        },
        {
          id: uuid(),
          type: "file",
          label: "Attach an image, wireframe, or screenshot (optional)",
          required: false,
          options: null,
          validation: { maxFileSizeMB: 8 },
          logic: null,
        },
        {
          id: uuid(),
          type: "yes_no",
          label: "Would you be open to a 15-minute feedback call with our product managers?",
          required: true,
          options: null,
          logic: null,
        },
        {
          id: uuid(),
          type: "email",
          label: "Where can we send updates on this request?",
          required: false,
          options: null,
          logic: null,
        },
      ];
    },
  },
  {
    id: "bug-report",
    name: "Bug Report & Technical Support",
    category: "Support",
    description: "Collect detailed reproduction steps, logs, attachments, and severity levels.",
    settings: {
      primaryColor: "#e11d48",
      welcomeMessage: "We're here to help! Let us know what went wrong so we can fix it quickly. 🛠️",
      completionMessage: "Issue logged! Our engineering team will review the details right away. 🛡️",
    },
    buildQuestions: () => {
      return [
        {
          id: uuid(),
          type: "text",
          label: "Summarize the issue in a few words",
          required: true,
          options: null,
          logic: null,
        },
        {
          id: uuid(),
          type: "dropdown",
          label: "What is the severity of this issue?",
          required: true,
          options: [
            "Low - Minor cosmetic glitch",
            "Medium - Annoying, but workaround exists",
            "High - Key functionality broken",
            "Critical - Completely blocked / data loss",
          ],
          logic: null,
        },
        {
          id: uuid(),
          type: "text",
          label: "What steps did you take before this error happened?",
          required: true,
          options: null,
          logic: null,
        },
        {
          id: uuid(),
          type: "file",
          label: "Upload a screenshot, video clip, or console error log (optional)",
          required: false,
          options: null,
          validation: { maxFileSizeMB: 15 },
          logic: null,
        },
        {
          id: uuid(),
          type: "email",
          label: "Where should we send ticket resolution updates?",
          required: true,
          options: null,
          logic: null,
        },
      ];
    },
  },
];

export function getTemplateById(id: string): TemplateDefinition | undefined {
  return FORM_TEMPLATES.find((t) => t.id === id);
}
