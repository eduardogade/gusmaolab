/**
 * The scheduling specimen's script (P21, D-150): selection and the simulated request states, in the
 * development specimen only. It is a demonstration of how the states read, with the same words as
 * the page (src/scheduling/copy.ts) and the same standard time-zone formatting (src/scheduling/
 * time.ts). It is not a booking client: it sends nothing, stores nothing and keeps no record, and
 * the real page contains no code like it. Real request states belong to the provider.
 */
import { describeSlot } from "../scheduling/time.ts"

type Output = "verification" | "pending" | "confirmed" | "declined" | "unavailable"

function bind(root: HTMLElement): void {
  const q = <T extends HTMLElement>(selector: string): T => root.querySelector<T>(selector) as T
  const zone = q<HTMLSelectElement>("[data-sim-zone]")
  const days = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-sim-day]"))
  const slots = q<HTMLElement>("[data-sim-slots]")
  const hint = q<HTMLElement>("[data-sim-hint]")
  const summary = q<HTMLElement>("[data-sim-summary]")
  const request = q<HTMLButtonElement>("[data-sim-request]")
  const verify = q<HTMLButtonElement>("[data-sim-verify]")
  const accept = q<HTMLButtonElement>('[data-sim-decide="accept"]')
  const reject = q<HTMLButtonElement>('[data-sim-decide="reject"]')
  const unavailable = q<HTMLButtonElement>("[data-sim-unavailable]")
  const reset = q<HTMLButtonElement>("[data-sim-reset]")
  const outputs = Array.from(root.querySelectorAll<HTMLElement>("[data-sim-output]"))
  const times = (root.getAttribute("data-sim-times") ?? "").split(",").filter((t) => t !== "")
  let date: string | null = null
  let slot: string | null = null

  const show = (state: Output | null): void => {
    for (const o of outputs) o.hidden = o.getAttribute("data-sim-output") !== state
    root.setAttribute("data-sim-state", state ?? (slot !== null ? "slot-selected" : date !== null ? "date-selected" : "idle"))
  }
  const controls = (state: Output | "choosing" | "ready"): void => {
    request.hidden = state !== "ready"
    verify.hidden = state !== "verification"
    accept.hidden = reject.hidden = state !== "pending"
  }
  const label = (): void => {
    for (const button of Array.from(slots.querySelectorAll<HTMLButtonElement>("[data-sim-slot]")))
      button.textContent = describeSlot(button.getAttribute("data-sim-slot") ?? "", zone.value)
    if (slot !== null) summary.textContent = `Selected: ${describeSlot(slot, zone.value)}`
  }

  const chooseDay = (button: HTMLButtonElement): void => {
    if (button.getAttribute("aria-disabled") === "true") return
    date = button.getAttribute("data-sim-day")
    slot = null
    for (const d of days) d.setAttribute("aria-pressed", String(d === button))
    slots.replaceChildren()
    for (const time of times) {
      const instant = `${date}T${time}:00Z`
      const li = document.createElement("li")
      const b = document.createElement("button")
      b.type = "button"
      b.className = "sim__slot"
      b.setAttribute("data-sim-slot", instant)
      b.setAttribute("aria-pressed", "false")
      b.addEventListener("click", () => {
        slot = instant
        for (const other of Array.from(slots.querySelectorAll("[data-sim-slot]"))) other.setAttribute("aria-pressed", String(other === b))
        summary.hidden = false
        label()
        controls("ready")
        show(null)
      })
      li.append(b)
      slots.append(li)
    }
    slots.hidden = false
    summary.hidden = true
    hint.textContent = "Choose a time. Each is shown in the time zone selected above."
    controls("choosing")
    label()
    show(null)
  }

  for (const d of days) d.addEventListener("click", () => chooseDay(d))
  zone.addEventListener("change", label)
  request.addEventListener("click", () => {
    controls("verification")
    show("verification")
  })
  verify.addEventListener("click", () => {
    controls("pending")
    show("pending")
  })
  accept.addEventListener("click", () => {
    controls("confirmed")
    show("confirmed")
  })
  reject.addEventListener("click", () => {
    controls("declined")
    show("declined")
  })
  unavailable.addEventListener("click", () => {
    controls("unavailable")
    show("unavailable")
  })
  reset.addEventListener("click", () => {
    date = slot = null
    for (const d of days) d.setAttribute("aria-pressed", "false")
    slots.replaceChildren()
    slots.hidden = summary.hidden = true
    hint.textContent = "Choose an available date."
    controls("choosing")
    show(null)
  })
  controls("choosing")
  show(null)
}

for (const root of document.querySelectorAll<HTMLElement>("[data-sim]")) bind(root)
