# Scheduling guide (P21)

How the Schedule page works, how to turn it on, and how to test it safely. Decisions: D-145 to D-150. Nothing in this guide contains a secret, a booking link or a calendar: those are the owner's, and today none exists, so **scheduling is switched off** and `/schedule/` says so.

**The one rule.** A booking request is not a confirmed meeting. The site says "awaiting confirmation" until the provider itself has recorded the owner's acceptance, and it never shows an approve or decline control: the owner decides in the provider's own, signed-in interface.

## What the site does and does not do

| The site | The provider (Cal.com) |
| --- | --- |
| Shows the Schedule page, the workflow in words and a time-zone note | Owns availability, conflicts, pending holds, limits and the booked instant |
| Loads the provider's monthly calendar into a frame, once the visitor presses a button | Shows the calendar and the booking form, in the visitor's own time zone |
| Links to the provider's hosted booking page as plain HTML | Verifies the booker's email, holds the pending request, emails the owner |
| Validates the configuration at build time | Lets the owner accept or decline, then emails the visitor and writes the calendar |

There is no booking database, no email server, no authentication, no serverless function and no API key in the site. The booking calendar is an embed of a **public** booking link.

## 1. How the provider is configured

Create (or use) a Cal.com account, connect the owner's calendar, and make one event type for meeting requests. The owner does this; an agent cannot and must not (accounts, calendar authorisation and any plan choice are the owner's). Then, on that event type:

- **Requires confirmation: Always** (Links > the event type > Policies > Privacy & security > Requires confirmation). Until the owner accepts, the booking is pending and no confirmation email goes out.
- **Unconfirmed bookings still block calendar slots**: on, so two requests cannot take one time.
- **Booker email verification**: on (reported by Cal.com's blog under the event type's Advanced settings; the current location may differ: look for "verification" next to "Requires confirmation").
- Set the schedule (hours) and the connected calendars to check for conflicts, minimum notice and any limits. **These are the owner's policy; the site invents none.**

## 2. How the booking URL is registered

Edit `src/data/scheduling.ts`, and only that file:

```ts
export const SCHEDULING_CONFIG: SchedulingConfig = {
  provider: "calcom",
  enabled: true,
  bookingUrl: "https://cal.com/<username>/<event>",
  ownerTimeZone: "America/Recife",
  providerSettings: {
    requiresConfirmation: true,
    requiresBookerEmailVerification: true,
    pendingRequestsHoldSlots: true,
  },
  approvedOn: "YYYY-MM-DD",
}
```

`providerSettings` is **your attestation** that the event type is set that way, dated by `approvedOn`; it is not a test result. The build refuses to enable scheduling unless all three are `true`, because a half-set provider would let a request look confirmed. The link must be `https://cal.com/<user>` or `/<user>/<event>` (or `app.cal.com`), with no query, fragment, port or credentials, and not a placeholder user. A violation fails `npm run build` with a list of what is wrong. `npm run scheduling:check` prints the state without building.

## 3. How the monthly embed is enabled

Nothing more: `enabled: true` with a valid link turns the Schedule page from its preparation notice into the booking page. It shows the workflow, the time-zone note, a **Show the booking calendar** button, the hosted booking page link and a provider disclosure. Pressing the button loads `https://app.cal.com/embed/embed.js` and draws the calendar with `layout: "month_view"` into a frame that reserves its height (`src/scheduling/embed.ts`, `src/scripts/schedule-embed.ts`). Nothing from the provider is requested until the press (privacy: no cookie or request on page view, and no consent banner is needed for a page view). The script is rendered only on Schedule and only when scheduling is ready: every other page, and Schedule while unconfigured, ship none (SCH-016, SCH-054).

## 4. How email verification is required

In the event type (section 1). The site cannot enforce it: the provider does. The site only refuses to be enabled unless you attest it is on. Email verification proves control of an address; it is not proof that the visitor is a human, and the page never says so. If you want abuse protection beyond it, Cal.com offers blocklists and booking limits (for example a limit on a booker's active bookings): evaluate them in the account. Do not add a homemade CAPTCHA or an "I am human" box.

## 5. How the owner receives and handles requests

Requests appear in the Cal.com **Bookings > Unconfirmed** tab and, if notifications are on, by email. Accepting pushes the event to the connected calendar and emails the visitor; declining emails the visitor (with an optional reason). There is nothing to do on the site. Whether the owner's request email contains the fields the P21 brief lists (name, email, event, date, time, time zone, duration, purpose, status, a review link) is **unverified** until an operational test.

## 6. How conflicts and pending holds are managed

By the provider: confirmed bookings and connected-calendar events block slots; pending requests block them when "Unconfirmed bookings still block calendar slots" is on (required to enable). The site never computes a slot. See "Availability policy and bookability" in section 9.

## 7. How time zones are handled

The owner's calendar zone is `ownerTimeZone` (default `America/Recife`, an IANA name; offsets like `-03:00` and `UTC-3` are refused, because they would stop following daylight saving, and `Intl` itself accepts `-03:00`). The visitor's zone is detected by the provider's calendar, which lets them change it; the page says so and names the owner's zone separately so the two are never confused. The site does no zone arithmetic: `src/scheduling/time.ts` is `Intl.DateTimeFormat` over a fixed instant, used for validation and for the specimen's synthetic slots (SCH-036 to SCH-043: Recife, Lisbon, New York, Los Angeles, Tokyo and Auckland, a day boundary, a year boundary, two DST changes).

## 8. Where the future availability file's path is configured

`availabilitySourcePath` in `src/data/scheduling.ts`: `repo:<repository-relative path>` or `env:<NAME>` (an environment variable holding a local path). Never an absolute path in the file, never under `public/`, `dist/`, `src/pages/`, `cv/`, `brand/`; never `PUBLIC_`, `VITE_` or `ASTRO_` variables. It is not in the public view, the page, the script or any bundle (SCH-009). Leave it out until the file exists.

## 9. How the future file adapter will work

Today there is only the boundary (`src/scheduling/availability.ts`): a path validator, `describeSource` (not configured, missing, or present with no adapter) and `planSync`, which reports that there is no adapter and changes nothing. `npm run scheduling:check` reports the source's status and never prints its content.

**Availability policy and bookability are different things.** The owner's file states *policy*: when the owner is willing to meet. Real bookability also depends on confirmed bookings, pending holds, calendar conflicts, limits and the zone conversion, which the provider alone knows. A static file is not a transaction-safe booking database, so the site never presents file-derived slots as bookable. Until the file exists, **the provider's own schedule is the temporary authority**, and the page offers no times of its own.

When the owner supplies the file, the adapter should: resolve the path; parse the owner's actual format (its schema is not invented here); validate zones and dates; normalise permitted windows; translate them into rules the provider supports and report any it cannot; run a **dry run** that shows what would change; and apply only when the owner asks. It must never replace the provider's schedule from an unvalidated source, never discard a pending or confirmed booking to match a file, and never run on a timer without an approved operational policy. The provider's API for schedules would need a key; that key stays in the owner's environment, never in the site, a `PUBLIC_` variable or the repository.

## 10. How to test safely

Two layers, never mixed.

**What the repository tests (no provider, no account)**: `npm test` (`tests/scheduling.mjs`: configuration, loader against a stand-in browser, zones, copy, privacy, regression) and `npm run test:browser` (`tests/scheduling-browser.mjs`: a throwaway build with a **synthetic** link, the provider's origin blocked or answered by a labelled stand-in, keyboard, layout at seven widths). The specimen (`npm run dev`, Home > Site Map & Page Coverage > Scheduling Integration, or `/_design/scheduling/`) lets you click through the states with synthetic dates.

**What only the owner's account can test (reported BLOCKED until done)**: SCH-013B, 014, 015B, 021 to 035 and 042: the real calendar loads and shows real availability, conflicts and holds work, verification is enforced and cannot be bypassed, a request arrives pending, the owner is emailed, accepting and declining notify the visitor with correct times and zones, and a confirmed booking reaches the calendar and cannot be double-booked. To run them:

1. Use a **test event type** and test identities you control (two addresses of your own). Do not use the real calendar as a target without deciding to, and do not book with other people.
2. Walk: choose a slot; submit with an unverified address and confirm it cannot complete; verify; confirm "awaiting confirmation"; check the owner email; accept; check the visitor email and the calendar entry; repeat and decline; try the same slot from a second browser while one is pending.
3. Clean up through Cal.com (cancel the test bookings, delete the test event type). Record the results in the acceptance matrix; do not put emails, names or screenshots with booking details in the repository.

## 11. How to disable scheduling

Set `enabled: false` (or remove `bookingUrl`) in `src/data/scheduling.ts` and rebuild. The Schedule page returns to its honest notice and the script disappears. To stop requests at once, also pause or disable the event type in Cal.com: the site's switch only removes the page's way in, not the provider's link.

## 12. How to recover from provider outages

The page needs no provider to render: the workflow text, the Contact link and the hosted booking page link are plain HTML. If the embed cannot load (blocked script, outage, a refused frame, or 20 seconds without the calendar), the page says so and points to the hosted page and Contact (SCH-017, 017B). If the provider itself is down, the hosted page is down too: disable scheduling (section 11) and say so on Contact once there is a channel.

## 13. How to replace the provider

The provider appears in four places: `SchedulingConfig.provider` and the host/origin constants in `src/scheduling/config.ts`, the loader `src/scheduling/embed.ts`, the page's copy (`src/scheduling/copy.ts`, which names it), and `src/scripts/schedule-embed.ts`. The Schedule page, the destination, the page state and the specimen read only `PublicScheduling` and `COPY`. A replacement means a new entry in `SCHEDULING_PROVIDERS`, its own hosts, loader and words, and a recorded decision; the page and the folders do not change. There is deliberately no generic scheduling framework.

## Feasibility, as recorded on 2026-11-22

Three different statuses, never merged: **documented** (read in the provider's public documentation or script), **configured** (true in the owner's account) and **tested** (observed working). Nothing is configured or operationally tested, because there is no account.

| Capability | Documented | Configured | Tested |
| --- | --- | --- | --- |
| Monthly calendar embed | Yes: inline embed with `config.layout: "month_view"`; the published `embed.js` contains `month_view`, `linkReady` and `linkFailed` | No account | Loader and page wiring against a stand-in only |
| Real available slots | Yes (provider-managed) | No | Blocked |
| Visitor time zone | Yes (detected, changeable; optional lock) | No | Standard-library conversions only; provider blocked |
| Booker email verification | Reported by Cal.com's blog and third-party guides (an event type setting); not found in the help-centre index I read | No | Blocked |
| Host approval or rejection | Yes (help centre: Requires confirmation, Unconfirmed tab, accept or reject with a reason) | No | Blocked |
| Pending requests hold slots | Yes (help centre: "Unconfirmed bookings still block calendar slots", on or off) | No | Blocked |
| Owner request email | Not stated explicitly in the pages read (notification preferences exist) | No | Blocked |
| Visitor decision emails | Partly: no confirmation email until accepted; rejection notifies the booker | No | Blocked |
| Calendar connection and conflicts | Yes (Google, Outlook and Apple calendars) | No | Blocked |
| Hosted booking page | Yes | No link | Blocked |
| Availability-source path | The provider has schedules in its API (v2 reference); not evaluated further; needs a key | n/a | n/a (boundary only) |
| Plan and cost | Marketing says free for individuals; features by plan unverified | Unknown | n/a |

No purchase, sign-up or account action was taken. If a required feature turns out to need a paid plan or to be absent in the owner's account, the requirement is not removed: that is a new decision, with another provider considered and the trade-off recorded.
