/**
 * What the Schedule page says (P21, D-149): one list of sentences, so the real page, the development
 * specimen and the tests read the same words. The rule behind every line is that a booking request
 * is not a confirmed meeting: nothing here says "confirmed", "booked" or "scheduled" about a
 * request, no sentence promises approval, and none promises a response time (the owner has set
 * none). "Confirmed" appears only in the sentence for the provider's confirmation, which the real
 * page never shows by itself: it is the provider's message, in the provider's interface or email.
 *
 * Pure data: Node can read it.
 */

import { FAILED_MESSAGE, LOADING_MESSAGE } from "./messages.ts"

export const PROVIDER_NAME = "Cal.com"
export const PROVIDER_PRIVACY_URL = "https://cal.com/privacy"

export const COPY = {
  intro: "Select an available time to request a meeting. Requests are reviewed before confirmation.",
  /** The owner's calendar zone is named; the visitor's is the provider's to detect and let them change. */
  timezone: (ownerZone: string): string =>
    `Times are shown in your own time zone, which the booking calendar detects and lets you change. The owner's calendar is kept in ${ownerZone}.`,
  lifecycleTitle: "How a request works",
  lifecycle: [
    "Choose an available date and time in the booking calendar.",
    "Enter your name and email, and verify your email address when asked.",
    "Submit the request. It is sent to the owner and stays pending: it is not a confirmed meeting.",
    "The owner accepts or declines it, and you receive an email with the decision.",
  ],
  /** The load button; pressing it is what contacts the provider. */
  load: "Show the booking calendar",
  loadNote: `The calendar is provided by ${PROVIDER_NAME}, an external service. Nothing is loaded from it until you press the button.`,
  fallback: "Open the booking page",
  fallbackNote: `Opens the ${PROVIDER_NAME} booking page in this window.`,
  disclosure: `Scheduling is handled by ${PROVIDER_NAME}, an external service. When you show the calendar, your browser contacts it, and what you enter there is processed by that service under its own privacy policy.`,
  privacyLink: `${PROVIDER_NAME} privacy policy`,
  loading: LOADING_MESSAGE,
  failed: FAILED_MESSAGE,
  /** The states of one request, as the specimen shows them. The real page shows only the provider's own. */
  status: {
    verification: {
      title: "Verify your email address",
      text: "The scheduling service sends a code or link to your address. The request is not submitted until you verify it.",
    },
    pending: {
      title: "Request submitted",
      text: "Your meeting request has been submitted and is awaiting confirmation. It is not a confirmed meeting, and you will receive an email with the owner's decision.",
    },
    confirmed: {
      title: "Meeting confirmed",
      text: "The owner has accepted this request, and the scheduling service has confirmed the meeting. A confirmation has been sent by email.",
    },
    declined: {
      title: "Request declined",
      text: "The owner has declined this request. No meeting is scheduled. You can choose another time or write through Contact.",
    },
    unavailable: {
      title: "Booking is unavailable",
      text: "The booking calendar could not be reached. No request was sent. Try the booking page, or write through Contact.",
    },
  },
} as const

export type RequestState = keyof typeof COPY.status

/** Words a request-state sentence must not use unless it is the provider's confirmation. */
export const CONFIRMATION_WORDS = /\b(confirmed|booked|scheduled|accepted)\b/i
