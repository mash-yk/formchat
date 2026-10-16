import type { ChatFormData } from "@/lib/types";

/** Sample form for the landing page demo (preview mode — nothing is saved). */
export const demoForm: ChatFormData = {
  title: "Sunny Side Bakery",
  slug: "demo",
  settings: {
    primaryColor: "#4f46e5",
    welcomeMessage: "Hi! 👋 Ordering a celebration cake? I’ll take your details in a few quick questions.",
    completionMessage: "Thanks! We’ll email you a quote today. 🎂 (This was a demo — nothing was saved.)",
  },
  questions: [
    { id: "demo-name", type: "text", label: "What’s your name?", required: true, options: null },
    {
      id: "demo-email",
      type: "email",
      label: "Which email should we send the quote to?",
      required: true,
      options: null,
    },
    {
      id: "demo-flavour",
      type: "multiple_choice",
      label: "Which flavour would you like?",
      required: true,
      options: ["Chocolate fudge", "Lemon drizzle", "Carrot & walnut", "Vanilla berry"],
    },
    {
      id: "demo-delivery",
      type: "yes_no",
      label: "Do you need it delivered?",
      required: true,
      options: null,
    },
    {
      id: "demo-notes",
      type: "text",
      label: "Anything else we should know?",
      required: false,
      options: null,
    },
  ],
};
