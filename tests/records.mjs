// Canonical record checks (P11, D-083 to D-088): REC-001 to REC-026. They test the record
// schemas, the references between records, the selectors and projections, and that
// neither invented nor hidden records reach the site. Most are pure; REC-022, REC-025 and
// REC-026 also read the build. Run `npm run build` first, or `npm run verify`.
//
// Every record used here is a SYNTHETIC FIXTURE (src/design/records-fixture.ts): invented
// people, organizations, projects and publications that describe nothing real.
import { readFile, readdir } from "node:fs/promises"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { PRODUCTION_RECORDS } from "../src/data/records/index.ts"
import {
  SYNTHETIC_PERSON,
  SYNTHETIC_PROJECT,
  SYNTHETIC_PUBLICATION,
  SYNTHETIC_RECORDS,
} from "../src/design/records-fixture.ts"
import { COLLECTION_IDS } from "../src/editorial/collections.ts"
import { entriesAbout, recordReferenceIssues } from "../src/editorial/model.ts"
import { schemaFor } from "../src/editorial/schema.ts"
import { studyPaths } from "../src/design/editorial-fixture.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import {
  compareDates,
  endsBeforeStart,
  formatPartialDate,
  formatPeriod,
  isPartialDate,
  precisionOf,
} from "../src/records/dates.ts"
import {
  FAMILIES,
  FAMILY_NAMES,
  RECORD_ID_PATTERN,
  RecordsConfigError,
  activitiesOf,
  appointmentsOf,
  citationOf,
  collaboratorsOf,
  createRecords,
  currentAppointments,
  cvProjection,
  doiUrl,
  educationOf,
  familyOfId,
  isPeerReviewed,
  isShown,
  labProjection,
  organizationLineage,
  portfolioProjection,
  projects,
  projectsInArea,
  publications,
  publicationsByPerson,
  publicationsOfProject,
  relatedOutputs,
  siteRecords,
  validateRecords,
} from "../src/records/index.ts"
import { SCHEMAS, isOrcid } from "../src/records/schema.ts"

import { demoBuild } from "./demo-dist.mjs"
const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const json = (value) => JSON.stringify(value)
const clone = (value) => structuredClone(value)

const results = []
async function test(id, title, body) {
  const failures = []
  try {
    await body((ok, message) => ok || failures.push(message))
  } catch (error) {
    failures.push(error.stack ?? error.message)
  }
  results.push({ id, title, failures })
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(dir, entry.name)
      return entry.isDirectory() ? listFiles(path) : [path]
    }),
  )
  return nested.flat()
}

const FIXTURE = { allowSynthetic: true }
const issuesOf = (data) => validateRecords(data, FIXTURE)
const store = createRecords(SYNTHETIC_RECORDS, FIXTURE)
/** A copy of the fixture with one change. */
const changed = (change) => {
  const copy = clone(SYNTHETIC_RECORDS)
  change(copy)
  return copy
}
/** The record with this ID in a copy of the fixture. */
const pick = (data, id) =>
  FAMILY_NAMES.flatMap((f) => data[f] ?? []).find((r) => r.id === id)
const synthetic = { visibility: "public", provenance: { status: "synthetic" } }

/** The smallest valid record of each family: only what is required. */
const MINIMAL = {
  people: [{ id: "person-min", ...synthetic, displayName: "Minimal Person (fixture)" }],
  organizations: [
    {
      id: "organization-min",
      ...synthetic,
      name: "Minimal Org (fixture)",
      type: "other",
    },
  ],
  researchAreas: [{ id: "area-min", ...synthetic, title: "Minimal area (fixture)" }],
  projects: [
    {
      id: "project-min",
      ...synthetic,
      title: "Minimal project (fixture)",
      kind: "other",
      status: "planned",
    },
  ],
  publications: [
    {
      id: "publication-min",
      ...synthetic,
      title: "Minimal output (fixture)",
      type: "journal-article",
      status: "submitted",
      authors: [{ name: "External Only" }],
    },
  ],
  appointments: [
    {
      id: "appointment-min",
      ...synthetic,
      personId: "person-min",
      organizationId: "organization-min",
      type: "affiliation",
    },
  ],
  education: [
    {
      id: "education-min",
      ...synthetic,
      personId: "person-min",
      institutionId: "organization-min",
      qualification: "Minimal degree (fixture)",
      level: "other",
      status: "completed",
    },
  ],
  activities: [
    {
      id: "activity-min-award",
      ...synthetic,
      personId: "person-min",
      type: "award",
      name: "A",
    },
    {
      id: "activity-min-mentoring",
      ...synthetic,
      personId: "person-min",
      type: "mentoring",
      mentorshipType: "mentoring",
    },
  ],
}
/** The fields each family cannot do without. */
const REQUIRED = {
  people: ["id", "visibility", "provenance", "displayName"],
  organizations: ["id", "visibility", "provenance", "name", "type"],
  researchAreas: ["id", "visibility", "provenance", "title"],
  projects: ["id", "visibility", "provenance", "title", "kind", "status"],
  publications: [
    "id",
    "visibility",
    "provenance",
    "title",
    "type",
    "status",
    "authors",
  ],
  appointments: [
    "id",
    "visibility",
    "provenance",
    "personId",
    "organizationId",
    "type",
  ],
  education: ["id", "visibility", "provenance", "personId", "qualification", "level"],
  activities: ["id", "visibility", "provenance", "personId", "type", "name"],
}

// --- Records ------------------------------------------------------------------------------

await test("REC-001", "Every record has a valid, stable ID", (check) => {
  for (const family of FAMILY_NAMES) {
    for (const record of store[family]) {
      check(RECORD_ID_PATTERN.test(record.id), `${record.id} is not a record ID`)
      check(familyOfId(record.id) === family, `${record.id} is filed under ${family}`)
      check(
        record.id.startsWith(`${FAMILIES[family]}-`),
        `${record.id} has the wrong prefix`,
      )
    }
  }
  for (const id of [
    "Person-a",
    "person_a",
    "person-",
    "person",
    "person-a b",
    "person--a",
    "person-a-",
    "someone@example.org",
    "project-",
    "people-a",
    "",
  ]) {
    check(!RECORD_ID_PATTERN.test(id), `"${id}" passes as a record ID`)
    const result = SCHEMAS.people.safeParse({ id, ...synthetic, displayName: "X" })
    check(!result.success, `a person may have the ID "${id}"`)
  }
  // An ID of another family is refused where a family is expected.
  check(
    !SCHEMAS.people.safeParse({ id: "project-a", ...synthetic, displayName: "X" })
      .success,
    "a person may carry a project ID",
  )
  // Identity survives a change of label, and does not depend on position.
  const renamed = changed((data) => {
    pick(data, SYNTHETIC_PROJECT).title = "A completely different title"
    pick(data, SYNTHETIC_PERSON).displayName = "Another Name"
  })
  check(
    issuesOf(renamed).length === 0,
    `renaming broke references: ${json(issuesOf(renamed))}`,
  )
  const reordered = changed((data) => {
    for (const family of FAMILY_NAMES) data[family].reverse()
  })
  const other = createRecords(reordered, FIXTURE)
  for (const id of store.byId.keys())
    check(
      json(other.byId.get(id)) === json(store.byId.get(id)),
      `${id} depends on its position`,
    )
})

await test("REC-002", "Duplicate IDs are rejected", (check) => {
  for (const family of FAMILY_NAMES) {
    const data = changed((d) => d[family].push(clone(d[family][0])))
    const found = issuesOf(data)
    check(
      found.length === 1 && found[0].includes("declared more than once"),
      `${family}: a duplicate gave ${json(found)}`,
    )
    check(
      found[0]?.startsWith(SYNTHETIC_RECORDS[family][0].id),
      `${family}: the ID is not named`,
    )
  }
  let thrown
  try {
    createRecords(
      changed((d) => d.people.push(clone(d.people[0]))),
      FIXTURE,
    )
  } catch (error) {
    thrown = error
  }
  check(thrown instanceof RecordsConfigError, "a duplicate ID loads")
})

await test("REC-003", "Missing required fields are reported usefully", (check) => {
  for (const family of FAMILY_NAMES) {
    const record = MINIMAL[family][0]
    for (const field of REQUIRED[family]) {
      if (!(field in record)) continue
      const { [field]: _omitted, ...rest } = record
      const found = issuesOf({ ...MINIMAL, [family]: [rest] })
      check(found.length > 0, `${family}: ${field} is optional`)
      if (field !== "id") {
        check(
          found.some((m) => m.startsWith(`${record.id}: `)),
          `${family}: the record is not named when ${field} is missing: ${json(found)}`,
        )
      }
      check(
        found.some((m) => m.includes(field) || m.includes("Invalid input")),
        `${family}: the missing ${field} is not named: ${json(found)}`,
      )
    }
  }
  // Conditional requirements say what is needed.
  const cases = [
    [
      (d) => {
        d.appointments[0].type = "academic"
      },
      "an academic appointment needs its title",
    ],
    [
      (d) => {
        d.publications[0].status = "published"
      },
      "a published output needs its date",
    ],
    [(d) => (d.publications[0].authors = []), "authors"],
    // P11-A01: a fact kept as its source wrote it replaces the structured field, never
    // joins it.
    [
      (d) => (d.publications[0].authorsText = "External, O.*"),
      "either as a list (authors) or as the printed line (authorsText)",
    ],
    [
      (d) => {
        delete d.publications[0].authors
        d.publications[0].creditedTo = ["person-min"]
      },
      "creditedTo is only for an author list kept as text",
    ],
    [
      (d) => {
        d.publications[0].venue = "Journal (fixture)"
        d.publications[0].details = "Journal (fixture), 1(2): 3, 2020."
      },
      "either details or venue",
    ],
    [
      (d) => (d.appointments[0].institution = "Institute (fixture) – City"),
      "either by ID (organizationId) or as written (institution)",
    ],
    [
      (d) => (d.education[0].institution = "Institute (fixture) – City"),
      "either by ID or as written, not both",
    ],
    [(d) => (d.projects[0].extra = true), 'Unrecognized key: "extra"'],
    [(d) => (d.people[0].provenance = { status: "certain" }), "provenance.status"],
  ]
  for (const [change, fragment] of cases) {
    const data = clone(MINIMAL)
    change(data)
    const found = issuesOf(data)
    check(
      found.some((m) => m.includes(fragment)),
      `expected "${fragment}" in ${json(found)}`,
    )
  }
})

await test("REC-004", "Incomplete records are valid, and invent nothing", (check) => {
  check(
    issuesOf(MINIMAL).length === 0,
    `minimal records fail: ${json(issuesOf(MINIMAL))}`,
  )
  check(issuesOf({}).length === 0, "an empty dataset is invalid")
  const minimal = createRecords(MINIMAL, FIXTURE)
  const citation = citationOf(minimal, minimal.publications[0])
  check(
    citation.text === "External Only. Minimal output (fixture). Submitted.",
    `a bare citation reads: ${citation.text}`,
  )
  for (const key of ["year", "date", "venue", "doi", "link", "volume", "pages"])
    check(!(key in citation), `a bare citation has a ${key}`)
  const cv = cvProjection(minimal, "person-min")
  const text = json([cv, portfolioProjection(minimal), labProjection(minimal)])
  check(
    !/undefined|null|n\.d\.|unknown|TBD|N\/A|\bpresent\b/i.test(text),
    `a projection of minimal records has a placeholder: ${text.slice(0, 300)}`,
  )
  check(cv.appointments[0].when === "", "an appointment without dates shows a date")
  check(cv.appointments[0].heading === "Affiliation", "an affiliation has a title")
  check(cv.education[0].when === "", "a degree without dates shows a date")
  check(!("title" in cv.person), "a person without a title has one")
  // Defaults are empty lists, never guesses.
  check(json(minimal.projects[0].participants) === "[]", "participants default")
  check(minimal.people[0].profile === "none", "a person has a profile by default")
})

await test("REC-005", "Dates keep the precision they were written with", (check) => {
  const cases = [
    ["2022", "year", "2022"],
    ["2022-06", "month", "June 2022"],
    ["2022-06-14", "day", "14 June 2022"],
  ]
  for (const [value, precision, shown] of cases) {
    check(isPartialDate(value), `${value} is refused`)
    check(
      precisionOf(value) === precision,
      `${value} has precision ${precisionOf(value)}`,
    )
    check(
      formatPartialDate(value) === shown,
      `${value} shows as ${formatPartialDate(value)}`,
    )
    const data = changed((d) => (pick(d, SYNTHETIC_PUBLICATION).date = value))
    const kept = createRecords(data, FIXTURE).get(
      "publications",
      SYNTHETIC_PUBLICATION,
    ).date
    check(kept === value, `${value} is stored as ${kept}`)
  }
  // A year is never turned into the first of January.
  const article = store.get("publications", "publication-synthetic-preprint")
  check(article.date === "2021", `the year-only date became ${article.date}`)
  check(!json(store).includes("2021-01-01"), "a year became 1 January somewhere")
  check(citationOf(store, article).year === 2021, "the year is not read from the date")
  // The documented order: a period sorts where it begins.
  const sorted = [
    "2022-06",
    "2022-01-01",
    "2022",
    "2021-12-31",
    "2022-01",
    "2022-06-14",
  ].sort(compareDates)
  check(
    json(sorted) ===
      json(["2021-12-31", "2022", "2022-01", "2022-01-01", "2022-06", "2022-06-14"]),
    `dates sort as ${json(sorted)}`,
  )
  // Periods: an ongoing one says so; an unrecorded end is never "present".
  check(
    formatPeriod({ start: "2021-03", end: "present" }) === "March 2021 – present",
    "ongoing",
  )
  check(
    formatPeriod({ start: "2019" }) === "2019",
    `no end shows ${formatPeriod({ start: "2019" })}`,
  )
  check(
    formatPeriod({ start: "2017", end: "2021-02" }) === "2017 – February 2021",
    "mixed",
  )
  check(formatPeriod({ end: "2012" }) === "until 2012", "end only")
  check(formatPeriod({ start: "2020", end: "2020" }) === "2020", "one year")
  check(formatPeriod(undefined) === "" && formatPeriod({}) === "", "no period")
  const current = currentAppointments(store, SYNTHETIC_PERSON).map((a) => a.id)
  check(
    json(current) === json(["appointment-synthetic-current"]),
    `current: ${json(current)}`,
  )
  const openEnded = createRecords(
    changed((d) => delete pick(d, "appointment-synthetic-current").period.end),
    FIXTURE,
  )
  check(
    currentAppointments(openEnded, SYNTHETIC_PERSON).length === 0,
    "an appointment with no recorded end counts as current",
  )
})

await test("REC-006", "Impossible and malformed dates are rejected", (check) => {
  for (const value of [
    "2022-13",
    "2022-00",
    "2022-02-30",
    "2023-02-29",
    "22",
    "2022/06",
    "June 2022",
    "2022-6",
    "2022-06-1",
    "2022-06-14T10:00",
    "",
    "present",
    "0999",
  ]) {
    check(!isPartialDate(value), `"${value}" is accepted as a date`)
    const found = issuesOf(
      changed((d) => (pick(d, SYNTHETIC_PUBLICATION).date = value)),
    )
    check(
      found.some((m) => m.startsWith(SYNTHETIC_PUBLICATION) && m.includes("date")),
      `"${value}" loads as a publication date: ${json(found)}`,
    )
  }
  check(isPartialDate("2024-02-29"), "a real leap day is refused")
  for (const value of [2022, new Date("2022-06-14"), null]) {
    const found = issuesOf(
      changed((d) => (pick(d, SYNTHETIC_PUBLICATION).date = value)),
    )
    check(found.length > 0, `${String(value)} (not text) loads as a date`)
  }
  // Order within a period, only as far as both ends are known.
  check(endsBeforeStart("2021-06", "2020"), "2020 does not come before 2021-06")
  check(endsBeforeStart("2021-06", "2021-05-31"), "May does not come before June")
  check(!endsBeforeStart("2021-06", "2021"), "2021 is said to come before 2021-06")
  check(!endsBeforeStart("2021", "2021-02"), "2021-02 is said to come before 2021")
  const backwards = issuesOf(
    changed(
      (d) =>
        (pick(d, "appointment-synthetic-past").period = { start: "2021", end: "2017" }),
    ),
  )
  check(
    backwards.some((m) => m.includes("ends before it starts")),
    `a backwards period loads: ${json(backwards)}`,
  )
  const degree = issuesOf(
    changed((d) => (pick(d, "education-synthetic-doctorate").completionDate = "2010")),
  )
  check(
    degree.some((m) => m.includes("completed before it starts")),
    `a degree completed before it began loads: ${json(degree)}`,
  )
  const unfinished = issuesOf(
    changed((d) => (pick(d, "education-synthetic-doctorate").status = "in-progress")),
  )
  check(
    unfinished.some((m) => m.includes("has no completion date")),
    "a degree in progress keeps a completion date",
  )
  // Overlapping positions are legitimate.
  check(issuesOf(SYNTHETIC_RECORDS).length === 0, "the overlapping visit is refused")
})

await test("REC-007", "Malformed URLs, DOIs and ORCID iDs are rejected", (check) => {
  const withWebsite = (website) =>
    issuesOf(
      changed((d) => (pick(d, "organization-synthetic-university").website = website)),
    )
  for (const value of [
    "example.org",
    "www.example.org/page",
    "ftp://example.org",
    "https://",
    "https://exa mple.org",
    " https://example.org",
    "javascript:alert(1)",
    "mailto:someone@example.org",
    "https://localhost",
    "//example.org",
    "",
  ])
    check(
      withWebsite(value).some((m) => m.includes("website")),
      `"${value}" is accepted as a URL`,
    )
  for (const value of [
    "https://example.org",
    "http://example.org/a?b=c#d",
    "https://a.b.example.org/x",
  ])
    check(
      withWebsite(value).length === 0,
      `"${value}" is refused: ${json(withWebsite(value))}`,
    )
  // Every URL field is checked, not only one.
  const fields = [
    (d) => (pick(d, SYNTHETIC_PROJECT).links.repository = "not a url"),
    (d) => (pick(d, "publication-synthetic-preprint").url = "not a url"),
    (d) => (pick(d, SYNTHETIC_PERSON).links = [{ label: "Home", url: "not a url" }]),
    (d) => (pick(d, "activity-synthetic-outreach").url = "not a url"),
    (d) =>
      (pick(d, SYNTHETIC_PERSON).provenance = {
        status: "synthetic",
        url: "not a url",
      }),
  ]
  for (const change of fields)
    check(issuesOf(changed(change)).length === 1, `a URL field is unchecked: ${change}`)
  // DOIs: one stored form, generated links, nothing invented.
  const doiOf = (value) => {
    const data = changed((d) => (pick(d, SYNTHETIC_PUBLICATION).doi = value))
    const found = issuesOf(data)
    return found.length > 0
      ? null
      : createRecords(data, FIXTURE).get("publications", SYNTHETIC_PUBLICATION).doi
  }
  for (const value of [
    "10.5555/Synthetic.2022.001",
    "https://doi.org/10.5555/SYNTHETIC.2022.001",
    "http://dx.doi.org/10.5555/synthetic.2022.001",
    "doi:10.5555/synthetic.2022.001",
    "  10.5555/synthetic.2022.001 ",
  ])
    check(
      doiOf(value) === "10.5555/synthetic.2022.001",
      `${value} is stored as ${doiOf(value)}`,
    )
  for (const value of [
    "synthetic.2022.001",
    "11.5555/x",
    "10.55/x",
    "10.5555/",
    "10.5555/a b",
    "https://example.org/10.5555/x",
  ])
    check(doiOf(value) === null, `"${value}" is accepted as a DOI`)
  check(doiUrl("10.5555/x") === "https://doi.org/10.5555/x", "the DOI link")
  check(
    !(
      "doi" in
      citationOf(store, store.get("publications", "publication-synthetic-dataset"))
    ),
    "a DOI was invented",
  )
  // ORCID: the check digit is verified; none is ever generated.
  check(
    isOrcid("0000-0002-1825-0097") && isOrcid("0000-0002-1694-233X"),
    "valid ORCID iDs are refused",
  )
  for (const value of [
    "0000-0002-1825-0098",
    "0000000218250097",
    "0000-0002-1825-009",
    "https://orcid.org/0000-0002-1825-0097",
  ])
    check(!isOrcid(value), `"${value}" is accepted as an ORCID iD`)
  check(
    !store.people.some((person) => "orcid" in person),
    "the fixture invents an ORCID iD",
  )
})

// --- Relationships ------------------------------------------------------------------------

/** Each change breaks one reference; the diagnostics must name the record and the ID. */
function expectUnknown(check, label, cases, missing) {
  for (const [recordId, change] of cases) {
    const found = issuesOf(changed(change))
    check(
      found.length === 1 &&
        found[0].startsWith(`${recordId}: `) &&
        found[0].includes(missing) &&
        found[0].includes("does not exist"),
      `${label} in ${recordId}: ${json(found)}`,
    )
  }
}

await test("REC-008", "Unknown person IDs are detected", (check) => {
  const nobody = "person-synthetic-nobody"
  expectUnknown(
    check,
    "an unknown person",
    [
      [
        SYNTHETIC_PROJECT,
        (d) => (pick(d, SYNTHETIC_PROJECT).participants[1].personId = nobody),
      ],
      [
        SYNTHETIC_PUBLICATION,
        (d) => (pick(d, SYNTHETIC_PUBLICATION).authors[3] = { personId: nobody }),
      ],
      [
        "appointment-synthetic-visit",
        (d) => (pick(d, "appointment-synthetic-visit").personId = nobody),
      ],
      [
        "education-synthetic-masters",
        (d) => (pick(d, "education-synthetic-masters").personId = nobody),
      ],
      [
        "education-synthetic-doctorate",
        (d) => (pick(d, "education-synthetic-doctorate").supervisorIds = [nobody]),
      ],
      [
        "activity-synthetic-award",
        (d) => (pick(d, "activity-synthetic-award").personId = nobody),
      ],
      [
        "activity-synthetic-supervision",
        (d) => (pick(d, "activity-synthetic-supervision").menteeId = nobody),
      ],
    ],
    nobody,
  )
  const self = issuesOf(
    changed(
      (d) => (pick(d, "activity-synthetic-supervision").menteeId = SYNTHETIC_PERSON),
    ),
  )
  check(
    self.some((m) => m.includes("cannot mentor themselves")),
    "a person mentors themselves",
  )
  const own = issuesOf(
    changed(
      (d) =>
        (pick(d, "education-synthetic-doctorate").supervisorIds = [SYNTHETIC_PERSON]),
    ),
  )
  check(
    own.some((m) => m.includes("cannot supervise their own")),
    "a person supervises themselves",
  )
})

await test(
  "REC-009",
  "Unknown organization IDs and looping hierarchies are detected",
  (check) => {
    const nowhere = "organization-synthetic-nowhere"
    expectUnknown(
      check,
      "an unknown organization",
      [
        [
          "appointment-synthetic-past",
          (d) => (pick(d, "appointment-synthetic-past").organizationId = nowhere),
        ],
        [
          "education-synthetic-masters",
          (d) => (pick(d, "education-synthetic-masters").institutionId = nowhere),
        ],
        [
          SYNTHETIC_PROJECT,
          (d) => (pick(d, SYNTHETIC_PROJECT).organizationIds[0] = nowhere),
        ],
        [
          "organization-synthetic-lab",
          (d) => (pick(d, "organization-synthetic-lab").parentId = nowhere),
        ],
        [
          "organization-synthetic-lab",
          (d) =>
            (pick(d, "organization-synthetic-lab").relations[0].organizationId =
              nowhere),
        ],
        [
          "activity-synthetic-teaching",
          (d) => (pick(d, "activity-synthetic-teaching").organizationId = nowhere),
        ],
        [
          "activity-synthetic-award",
          (d) => (pick(d, "activity-synthetic-award").grantorId = nowhere),
        ],
      ],
      nowhere,
    )
    // The hierarchy may not loop; other relations may be mutual.
    const loop = issuesOf(
      changed(
        (d) =>
          (pick(d, "organization-synthetic-university").parentId =
            "organization-synthetic-lab"),
      ),
    )
    check(
      loop.length === 1 && loop[0].includes("loop of parents"),
      `a loop of parents gave ${json(loop)}`,
    )
    const selfParent = issuesOf(
      changed(
        (d) =>
          (pick(d, "organization-synthetic-lab").parentId =
            "organization-synthetic-lab"),
      ),
    )
    check(
      selfParent.some((m) => m.includes("its own parent")),
      "an organization is its own parent",
    )
    const lab = store.get("organizations", "organization-synthetic-lab")
    const institute = store.get("organizations", "organization-synthetic-institute")
    check(
      lab.relations[0].organizationId === institute.id &&
        institute.relations[0].organizationId === lab.id,
      "the fixture has no mutual partnership to test",
    )
    check(
      json(organizationLineage(store, lab.id).map((o) => o.id)) ===
        json(["organization-synthetic-lab", "organization-synthetic-university"]),
      "the lineage of the laboratory is wrong",
    )
  },
)

await test("REC-010", "Unknown project IDs are detected", (check) => {
  const nowhere = "project-synthetic-nowhere"
  expectUnknown(
    check,
    "an unknown project",
    [
      [
        SYNTHETIC_PUBLICATION,
        (d) => (pick(d, SYNTHETIC_PUBLICATION).projectIds = [nowhere]),
      ],
      [
        "appointment-synthetic-current",
        (d) => (pick(d, "appointment-synthetic-current").projectIds = [nowhere]),
      ],
      [
        "activity-synthetic-talk",
        (d) => (pick(d, "activity-synthetic-talk").projectIds = [nowhere]),
      ],
      [
        "activity-synthetic-supervision",
        (d) => (pick(d, "activity-synthetic-supervision").projectIds = [nowhere]),
      ],
    ],
    nowhere,
  )
})

await test(
  "REC-011",
  "Outputs reference valid projects, areas and outputs",
  (check) => {
    expectUnknown(
      check,
      "an unknown area",
      [
        [
          SYNTHETIC_PUBLICATION,
          (d) =>
            (pick(d, SYNTHETIC_PUBLICATION).researchAreaIds = [
              "area-synthetic-missing",
            ]),
        ],
        [
          SYNTHETIC_PROJECT,
          (d) =>
            (pick(d, SYNTHETIC_PROJECT).researchAreaIds = ["area-synthetic-missing"]),
        ],
        [
          SYNTHETIC_PERSON,
          (d) =>
            (pick(d, SYNTHETIC_PERSON).researchAreaIds = ["area-synthetic-missing"]),
        ],
      ],
      "area-synthetic-missing",
    )
    expectUnknown(
      check,
      "an unknown output",
      [
        [
          "publication-synthetic-preprint",
          (d) =>
            (pick(d, "publication-synthetic-preprint").related[0].publicationId =
              "publication-synthetic-gone"),
        ],
        [
          "activity-synthetic-talk",
          (d) =>
            (pick(d, "activity-synthetic-talk").publicationIds = [
              "publication-synthetic-gone",
            ]),
        ],
      ],
      "publication-synthetic-gone",
    )
    // The wrong kind of ID, a repeat, and a tie to itself.
    const wrongFamily = issuesOf(
      changed(
        (d) => (pick(d, SYNTHETIC_PUBLICATION).projectIds = ["area-synthetic-alpha"]),
      ),
    )
    check(
      wrongFamily.some((m) => m.includes("projectIds")),
      `an area passes as a project: ${json(wrongFamily)}`,
    )
    const twice = issuesOf(
      changed(
        (d) =>
          (pick(d, SYNTHETIC_PUBLICATION).projectIds = [
            SYNTHETIC_PROJECT,
            SYNTHETIC_PROJECT,
          ]),
      ),
    )
    check(
      twice.some((m) => m.includes("listed twice")),
      "a project listed twice loads",
    )
    const self = issuesOf(
      changed(
        (d) =>
          (pick(d, SYNTHETIC_PUBLICATION).related = [
            { relation: "version-of", publicationId: SYNTHETIC_PUBLICATION },
          ]),
      ),
    )
    check(
      self.some((m) => m.includes("related to itself")),
      "an output is related to itself",
    )
    const relation = issuesOf(
      changed(
        (d) =>
          (pick(d, "publication-synthetic-preprint").related[0].relation = "same-as"),
      ),
    )
    check(relation.length > 0, "an unknown relation type loads")
    // Status and type agree; a preprint is never a published, reviewed article.
    const preprint = store.get("publications", "publication-synthetic-preprint")
    const article = store.get("publications", SYNTHETIC_PUBLICATION)
    check(
      !isPeerReviewed(preprint) && isPeerReviewed(article),
      "peer review is misjudged",
    )
    check(
      !isPeerReviewed(store.get("publications", "publication-synthetic-dataset")),
      "a dataset counts as peer-reviewed",
    )
    for (const [type, status] of [
      ["preprint", "published"],
      ["journal-article", "preprint"],
    ]) {
      const found = issuesOf(
        changed((d) =>
          Object.assign(pick(d, "publication-synthetic-preprint"), { type, status }),
        ),
      )
      check(
        found.some((m) => m.includes("together")),
        `${type} with status ${status} loads`,
      )
    }
    // The preprint and its article are two records, linked, found from either side.
    check(
      preprint.id !== article.id && preprint.title !== article.title,
      "the outputs were merged",
    )
    const fromArticle = relatedOutputs(store, article.id)
    check(
      json(fromArticle.map((r) => [r.relation, r.direction, r.publication.id])) ===
        json([["preprint-of", "from", preprint.id]]),
      `the article's related outputs: ${json(fromArticle.map((r) => r.publication.id))}`,
    )
    check(
      relatedOutputs(store, preprint.id)[0]?.direction === "to",
      "the preprint does not find its article",
    )
    // The reverse side is derived, never stored.
    check(
      !("publicationIds" in store.get("projects", SYNTHETIC_PROJECT)),
      "a project stores its outputs",
    )
    check(
      json(publicationsOfProject(store, SYNTHETIC_PROJECT).map((p) => p.id)) ===
        json([article.id, preprint.id]),
      "the project's outputs are not derived from the outputs",
    )
  },
)

await test("REC-012", "Author order is preserved exactly", (check) => {
  const input = SYNTHETIC_RECORDS.publications.find(
    (p) => p.id === SYNTHETIC_PUBLICATION,
  ).authors
  const stored = store.get("publications", SYNTHETIC_PUBLICATION).authors
  check(json(stored) === json(input), "the stored author list differs from the source")
  const names = citationOf(
    store,
    store.get("publications", SYNTHETIC_PUBLICATION),
  ).authors.map((a) => a.name)
  check(
    json(names) === json(["Student S", "Lead SF", "External E", "Collaborator S"]),
    `the citation's authors are ${json(names)}`,
  )
  check(
    json([...names].sort()) !== json(names),
    "the fixture's order is alphabetical: it proves nothing",
  )
  // Another order in, the same other order out: nothing is normalized.
  const reversed = createRecords(
    changed((d) => pick(d, SYNTHETIC_PUBLICATION).authors.reverse()),
    FIXTURE,
  )
  check(
    json(
      citationOf(
        reversed,
        reversed.get("publications", SYNTHETIC_PUBLICATION),
      ).authors.map((a) => a.name),
    ) === json([...names].reverse()),
    "a different order in the source is not kept",
  )
  check(names[1] === "Lead SF", "the name as printed on the work is not used")
  const twice = issuesOf(
    changed((d) =>
      pick(d, SYNTHETIC_PUBLICATION).authors.push({ personId: SYNTHETIC_PERSON }),
    ),
  )
  check(
    twice.some((m) => m.includes("listed twice among the authors")),
    "a person is an author twice",
  )
})

await test("REC-013", "External authors need no person record", (check) => {
  const minimal = createRecords({ publications: MINIMAL.publications }, FIXTURE)
  check(minimal.people.length === 0, "an external author created a person")
  check(
    json(citationOf(minimal, minimal.publications[0]).authors) ===
      json([{ name: "External Only" }]),
    "an external credit is not a name only",
  )
  const citation = citationOf(store, store.get("publications", SYNTHETIC_PUBLICATION))
  check(!("personId" in citation.authors[2]), "the external author has a person ID")
  check(
    citation.authors[1].personId === SYNTHETIC_PERSON,
    "the registered author is not linked",
  )
  // A co-author whose record is hidden is credited by name and nothing else.
  check(
    json(citation.authors[0]) === json({ name: "Student S" }),
    `the hidden co-author appears as ${json(citation.authors[0])}`,
  )
  check(
    !store.people.some((p) => p.displayName === "External E"),
    "the external author is a person",
  )
  const collaborators = collaboratorsOf(store, SYNTHETIC_PERSON).map((p) => p.id)
  check(
    json(collaborators) === json(["person-synthetic-collaborator"]),
    `collaborators: ${json(collaborators)}`,
  )
  // An author entry is one or the other, never both, never neither.
  for (const author of [
    { personId: SYNTHETIC_PERSON, name: "X" },
    {},
    { name: "" },
    "A. Name",
  ])
    check(
      issuesOf(changed((d) => (pick(d, SYNTHETIC_PUBLICATION).authors[2] = author)))
        .length > 0,
      `${json(author)} passes as an author`,
    )
  // A profile is a separate decision from being an author.
  const profiles = labProjection(store).people.map((p) => p.id)
  check(json(profiles) === json([SYNTHETIC_PERSON]), `profiles: ${json(profiles)}`)
})

await test("REC-014", "A legitimate interconnected graph is valid", (check) => {
  check(
    issuesOf(SYNTHETIC_RECORDS).length === 0,
    `the fixture fails: ${json(issuesOf(SYNTHETIC_RECORDS))}`,
  )
  const total = FAMILY_NAMES.reduce((sum, family) => sum + store[family].length, 0)
  check(
    store.byId.size === total && total === 29,
    `${store.byId.size} records by ID, ${total} in lists`,
  )
  for (const family of FAMILY_NAMES)
    check(store[family].length > 0, `the fixture has no ${family}`)
  // Records may refer to each other through different relations.
  const talk = store.get("activities", "activity-synthetic-talk")
  check(
    talk.publicationIds.includes(SYNTHETIC_PUBLICATION) &&
      talk.projectIds.includes(SYNTHETIC_PROJECT) &&
      store
        .get("publications", SYNTHETIC_PUBLICATION)
        .projectIds.includes(SYNTHETIC_PROJECT),
    "the fixture has no shared references to test",
  )
  check(
    store.get("projects", SYNTHETIC_PROJECT) === store.byId.get(SYNTHETIC_PROJECT),
    "get and byId differ",
  )
  check(store.find("projects", "project-nope") === undefined, "an unknown ID is found")
  check(
    store.find("people", SYNTHETIC_PROJECT) === undefined,
    "a project is found as a person",
  )
  let thrown = false
  try {
    store.get("projects", "project-nope")
  } catch {
    thrown = true
  }
  check(thrown, "get() returns for an unknown ID")
})

await test("REC-015", "A broken graph gives actionable diagnostics", (check) => {
  const broken = changed((d) => {
    d.people.push(clone(d.people[0]))
    pick(d, SYNTHETIC_PROJECT).researchAreaIds = ["area-synthetic-missing"]
    pick(d, "publication-synthetic-dataset").authors = [
      { personId: "person-synthetic-nobody" },
    ]
    pick(d, "appointment-synthetic-visit").organizationId =
      "organization-synthetic-nowhere"
    pick(d, "activity-synthetic-award").date = "2020-02-31"
  })
  const found = issuesOf(broken)
  check(found.length === 5, `expected 5 problems, got ${json(found)}`)
  for (const fragment of [
    "person-synthetic-lead is declared more than once",
    "project-synthetic-atlas: researchAreaIds names area-synthetic-missing, which does not exist",
    "publication-synthetic-dataset: authors names person-synthetic-nobody, which does not exist",
    "appointment-synthetic-visit: organizationId names organization-synthetic-nowhere, which does not exist",
    "activity-synthetic-award: date: write a date as YYYY, YYYY-MM or YYYY-MM-DD",
  ])
    check(
      found.includes(fragment),
      `missing diagnostic: ${fragment}\n    got ${json(found)}`,
    )
  check(json(issuesOf(broken)) === json(found), "the diagnostics change between runs")
  let error
  try {
    createRecords(broken, FIXTURE)
  } catch (caught) {
    error = caught
  }
  check(error instanceof RecordsConfigError, "a broken dataset loads")
  check(json(error?.issues) === json(found), "the error does not list every problem")
  check(
    error?.message.includes("person-synthetic-nobody"),
    "the message does not name the ID",
  )
  // Not a list, an unknown family, not an object.
  check(
    issuesOf({ people: "many" }).some((m) => m.includes("people must be a list")),
    "a non-list loads",
  )
  check(
    issuesOf({ grants: [] }).some((m) => m.includes('unknown record family "grants"')),
    "an unknown family loads",
  )
  check(issuesOf(null).length === 1, "null loads")
})

// --- Projections --------------------------------------------------------------------------

await test("REC-016", "The CV projection is chronological and consistent", (check) => {
  const cv = cvProjection(store, SYNTHETIC_PERSON)
  const lines = (entries) => entries.map((e) => `${e.when} | ${e.heading}`)
  const expect = (name, expected) =>
    check(json(lines(cv[name])) === json(expected), `${name}: ${json(lines(cv[name]))}`)
  expect("appointments", [
    "March 2021 – present | Synthetic Group Leader",
    "September 2019 – December 2019 | Synthetic Visiting Scholar",
    "2017 – February 2021 | Synthetic Researcher",
  ])
  expect("education", [
    "2012 – November 2016 | PhD in Synthetic Studies",
    "2012 | MSc in Synthetic Studies",
  ])
  expect("projects", [
    "March 2021 – present | Synthetic Atlas (fixture)",
    "2019 – 2021 | Synthetic Toolkit (fixture)",
  ])
  expect("teaching", ["2022 | Synthetic Methods 101"])
  expect("presentations", ["17 May 2023 | A synthetic talk"])
  expect("mentoring", ["2022 – present | supervision, doctorate"])
  expect("awards", ["2020 | Synthetic Prize"])
  expect("service", ["2021 – present | Reviewer"])
  expect("outreach", ["October 2021 | A synthetic open day"])
  check(
    json(cv.publications.map((c) => c.id)) ===
      json([
        "publication-synthetic-article",
        "publication-synthetic-preprint",
        "publication-synthetic-dataset",
      ]),
    `publications: ${json(cv.publications.map((c) => c.id))}`,
  )
  check(
    cv.appointments[0].organization === "Synthetic Laboratory (fixture)",
    "the organization's name is not the record's",
  )
  check(
    cv.education[0].detail === "Thesis: A synthetic thesis",
    `education detail: ${cv.education[0].detail}`,
  )
  // The mentee's record is hidden: the activity counts, the name does not appear.
  check(
    cv.mentoring[0].detail === "A synthetic topic",
    `mentoring detail: ${cv.mentoring[0].detail}`,
  )
  check(!json(cv).includes("Synthetic Student"), "the CV names the hidden mentee")
  // The same answer whatever the order of the source lists.
  const reordered = createRecords(
    changed((d) => {
      for (const family of FAMILY_NAMES) d[family].reverse()
    }),
    FIXTURE,
  )
  check(
    json(cvProjection(reordered, SYNTHETIC_PERSON)) === json(cv),
    "the CV depends on the order of the source",
  )
  check(
    json(cvProjection(store, SYNTHETIC_PERSON)) === json(cv),
    "the CV changes between calls",
  )
  // It is one person's CV: another person's records do not leak in.
  const other = cvProjection(store, "person-synthetic-collaborator")
  check(
    other.publications.length === 1 &&
      other.appointments.length === 1 &&
      other.education.length === 0,
    "the collaborator's CV holds someone else's records",
  )
  let refused = false
  try {
    cvProjection(store, "person-synthetic-student")
  } catch {
    refused = true
  }
  check(refused, "a CV is drawn for a hidden person")
  // Selectors behind it.
  check(
    json(appointmentsOf(store, SYNTHETIC_PERSON).map((a) => a.id)) ===
      json(cv.appointments.map((a) => a.id)),
    "appointments selector",
  )
  check(educationOf(store, SYNTHETIC_PERSON).length === 2, "education selector")
  check(
    activitiesOf(store, SYNTHETIC_PERSON, "award")[0].name === "Synthetic Prize",
    "typed activities",
  )
})

await test(
  "REC-017",
  "The Portfolio projection uses the canonical projects",
  (check) => {
    const portfolio = portfolioProjection(store)
    check(
      json(portfolio.map((p) => p.id)) ===
        json(["project-synthetic-atlas", "project-synthetic-toolkit"]),
      `projects: ${json(portfolio.map((p) => p.id))}`,
    )
    for (const view of portfolio) {
      const record = store.get("projects", view.id)
      check(
        view.title === record.title &&
          view.status === record.status &&
          view.kind === record.kind,
        `${view.id} differs from its record`,
      )
      check(view.description === record.shortDescription, `${view.id}: description`)
      check(
        json(view.outputs.map((c) => c.id)) ===
          json(publicationsOfProject(store, view.id).map((p) => p.id)),
        `${view.id}: outputs are not the outputs that name it`,
      )
    }
    const atlas = portfolio[0]
    check(atlas.when === "March 2021 – present", `when: ${atlas.when}`)
    check(
      json(atlas.people) ===
        json([
          {
            id: "person-synthetic-lead",
            name: "Synthetic Lead (fixture)",
            role: "Lead",
          },
          {
            id: "person-synthetic-collaborator",
            name: "Synthetic Collaborator (fixture)",
          },
        ]),
      `people: ${json(atlas.people)}`,
    )
    check(
      json(atlas.areas) ===
        json([{ id: "area-synthetic-alpha", title: "Synthetic area alpha (fixture)" }]),
      "areas",
    )
    check(
      json(atlas.links) ===
        json([{ label: "Repository", url: "https://example.org/synthetic-atlas" }]),
      "links",
    )
    check(
      json(portfolio[1].organizations) === json(["Synthetic Institute (fixture)"]),
      `organizations: ${json(portfolio[1].organizations)}`,
    )
    check(
      json(portfolio[1].links) === "[]" && !("description" in portfolio[1]),
      "an absent link or description appears",
    )
    // Hidden and unreviewed projects are not in the Portfolio; a tool may ask for them.
    check(
      projects(store).length === 2 &&
        projects(store, { includeHidden: true }).length === 4,
      "visibility of projects",
    )
    check(
      !json(portfolio).includes("must never be shown"),
      "the Portfolio shows a withheld record",
    )
  },
)

await test(
  "REC-018",
  "The Lab projection relates areas, projects, outputs and people",
  (check) => {
    const lab = labProjection(store)
    check(
      json(
        lab.areas.map((a) => [
          a.id,
          a.projects.map((p) => p.id),
          a.outputs.map((c) => c.id),
        ]),
      ) ===
        json([
          [
            "area-synthetic-alpha",
            ["project-synthetic-atlas"],
            ["publication-synthetic-article", "publication-synthetic-preprint"],
          ],
          [
            "area-synthetic-beta",
            ["project-synthetic-toolkit"],
            ["publication-synthetic-dataset"],
          ],
        ]),
      `areas: ${json(lab.areas.map((a) => [a.id, a.projects.map((p) => p.id), a.outputs.map((c) => c.id)]))}`,
    )
    check(
      lab.areas[0].summary?.startsWith("An invented research area") &&
        !("summary" in lab.areas[1]),
      "summaries",
    )
    check(json(lab.areas[0].keywords) === json(["synthetic", "alpha"]), "keywords")
    check(
      json(lab.people) ===
        json([
          {
            id: SYNTHETIC_PERSON,
            name: "Synthetic Lead (fixture)",
            title: "Synthetic Group Leader",
            affiliations: ["Synthetic Laboratory (fixture)"],
          },
        ]),
      `people: ${json(lab.people)}`,
    )
    check(
      json(lab.organizations.map((o) => o.id)) ===
        json(["organization-synthetic-institute", "organization-synthetic-lab"]),
      `organizations: ${json(lab.organizations.map((o) => o.id))}`,
    )
    check(!json(lab).includes("must never be shown"), "the Lab shows a withheld record")
    check(
      json(projectsInArea(store, "area-synthetic-alpha").map((p) => p.id)) ===
        json(["project-synthetic-atlas"]),
      "the hidden project of the area is listed",
    )
  },
)

await test("REC-019", "One output says the same thing in every projection", (check) => {
  const direct = citationOf(store, store.get("publications", SYNTHETIC_PUBLICATION))
  const views = (records) => [
    cvProjection(records, SYNTHETIC_PERSON).publications.find(
      (c) => c.id === SYNTHETIC_PUBLICATION,
    ),
    portfolioProjection(records)
      .find((p) => p.id === SYNTHETIC_PROJECT)
      .outputs.find((c) => c.id === SYNTHETIC_PUBLICATION),
    labProjection(records).areas[0].outputs.find((c) => c.id === SYNTHETIC_PUBLICATION),
    citationOf(
      records,
      publicationsByPerson(records, "person-synthetic-collaborator")[0],
    ),
  ]
  for (const view of views(store))
    check(json(view) === json(direct), `a projection differs: ${json(view)}`)
  check(
    direct.text ===
      "Student S, Lead SF, External E, Collaborator S. A synthetic article that reports nothing. Journal of Synthetic Results 12(3):45–67 (2022).",
    `the citation reads: ${direct.text}`,
  )
  check(
    direct.link === "https://doi.org/10.5555/synthetic.2022.001" &&
      direct.year === 2022,
    "DOI link or year",
  )
  check(!("statusLabel" in direct), "a published output carries a status label")
  const preprint = citationOf(
    store,
    store.get("publications", "publication-synthetic-preprint"),
  )
  check(
    preprint.text ===
      "Lead S, External E. A synthetic article that reports nothing (preprint). Synthetic Preprint Server (2021). Preprint.",
    `the preprint reads: ${preprint.text}`,
  )
  check(
    preprint.link === "https://example.org/preprints/synthetic-001",
    "a preprint without a DOI loses its URL",
  )
  check(
    citationOf(store, store.get("publications", "publication-synthetic-dataset"))
      .text === "Lead S. Synthetic Toolkit reference data. 2020.",
    "the dataset's citation",
  )
  const submitted = store.get("publications", "publication-synthetic-submitted")
  check(
    citationOf(store, submitted).statusLabel === "Submitted",
    "a submitted manuscript is unlabelled",
  )
  check(!publications(store).includes(submitted), "a hidden manuscript is listed")
  // Change the record once, and every projection changes with it.
  const edited = createRecords(
    changed(
      (d) => (pick(d, SYNTHETIC_PUBLICATION).title = "An edited synthetic title"),
    ),
    FIXTURE,
  )
  const after = views(edited)
  check(
    after.every((view) => view.title === "An edited synthetic title"),
    "an edit reaches only some projections",
  )
  check(new Set(after.map(json)).size === 1, "the projections disagree after an edit")
})

await test("REC-020", "Selectors change nothing", (check) => {
  const source = clone(SYNTHETIC_RECORDS)
  const before = json(source)
  const fresh = createRecords(source, FIXTURE)
  check(json(source) === before, "createRecords changed its input")
  check(
    !Object.isFrozen(source.people[0]) && !Object.isFrozen(source.people),
    "createRecords froze its input",
  )
  const snapshot = json(FAMILY_NAMES.map((family) => fresh[family]))
  cvProjection(fresh, SYNTHETIC_PERSON)
  portfolioProjection(fresh)
  labProjection(fresh)
  collaboratorsOf(fresh, SYNTHETIC_PERSON)
  relatedOutputs(fresh, SYNTHETIC_PUBLICATION)
  check(
    json(FAMILY_NAMES.map((family) => fresh[family])) === snapshot,
    "a projection changed the store",
  )
  // The store is frozen all the way down; a selector hands out a new list each time.
  const article = fresh.get("publications", SYNTHETIC_PUBLICATION)
  for (const value of [
    fresh,
    fresh.people,
    article,
    article.authors,
    article.authors[0],
    article.provenance,
    fresh.options,
  ])
    check(Object.isFrozen(value), "part of the store can be changed")
  let wrote = false
  try {
    article.authors.push({ name: "Intruder" })
    wrote = true
  } catch {}
  try {
    article.title = "changed"
    wrote ||= article.title === "changed"
  } catch {}
  check(!wrote && article.authors.length === 4, "a record was changed")
  const first = publications(fresh)
  first.reverse()
  first.pop()
  check(
    json(publications(fresh).map((p) => p.id)) !== json(first.map((p) => p.id)),
    "a selector returned its own list",
  )
  check(publications(fresh).length === 3, "changing a result changed the next result")
  check(
    fresh.publications[0].id === SYNTHETIC_RECORDS.publications[0].id,
    "sorting reordered the store",
  )
  // Two stores never share a record.
  check(
    createRecords(source, FIXTURE).people[0] !== fresh.people[0],
    "two stores share a record",
  )
})

// --- Publishing and safety ----------------------------------------------------------------

await test(
  "REC-021",
  "Synthetic records cannot become the site's records",
  async (check) => {
    check(
      validateRecords(PRODUCTION_RECORDS).length === 0,
      `the site's records fail: ${json(validateRecords(PRODUCTION_RECORDS))}`,
    )
    for (const family of FAMILY_NAMES) {
      for (const record of siteRecords[family]) {
        check(record.provenance.status !== "synthetic", `${record.id} is synthetic`)
        check(
          !/synthetic|fixture/i.test(json(record)),
          `${record.id} looks like a fixture`,
        )
      }
    }
    // The site's loader refuses the fixture, naming every record.
    const refused = validateRecords(SYNTHETIC_RECORDS)
    check(
      refused.length === store.byId.size - 1,
      `${refused.length} of ${store.byId.size} fixture records are refused`,
    )
    check(
      refused.every((m) => m.includes("is synthetic")),
      "the refusal does not say why",
    )
    let thrown = false
    try {
      createRecords(SYNTHETIC_RECORDS)
    } catch (error) {
      thrown = error instanceof RecordsConfigError
    }
    check(thrown, "the fixture loads as the site's own data")
    // Every fixture record says what it is; the one that is not synthetic is unreviewed.
    for (const family of FAMILY_NAMES) {
      for (const record of store[family]) {
        const status = record.provenance.status
        check(
          status === "synthetic" || record.id === "project-synthetic-unreviewed",
          `${record.id} is ${status}`,
        )
        check(
          record.id.includes("-synthetic-"),
          `${record.id} does not say it is synthetic`,
        )
      }
    }
    // Only verified records are shown outside a fixture; imported and unreviewed never.
    const unverified = createRecords({
      projects: ["verified", "imported", "unreviewed"].map((status) => ({
        id: `project-${status}`,
        visibility: "public",
        provenance: { status },
        title: status,
        kind: "other",
        status: "planned",
      })),
    })
    check(
      json(projects(unverified).map((p) => p.id)) === json(["project-verified"]),
      "an unverified record is shown",
    )
    check(
      !isShown(store, store.get("projects", "project-synthetic-unreviewed")),
      "the unreviewed fixture project is shown",
    )
    // The fixture is imported by the records study and the page-states specimen (P17, D-124: both
    // development-only studies, absent from a release build), and by nothing else in src/.
    const importers = []
    for (const file of await listFiles(join(repo, "src"))) {
      if (!/\.(ts|astro|mjs)$/.test(file)) continue
      if (/from "[^"]*records-fixture\.ts"/.test(await readFile(file, "utf8")))
        importers.push(relative(repo, file))
    }
    check(
      json(importers) === json(["src/pages/[design]/page-states/index.astro", "src/pages/[design]/records.astro"]),
      `the fixture is imported by ${json(importers)}`,
    )
  },
)

await test("REC-022", "A record creates no page", async (check) => {
  const pages = (await listFiles(dist))
    .map((f) => relative(dist, f))
    .filter((f) => f.endsWith(".html") && f !== "404.html") // the 404 page is P18's (tests/util.mjs)
  // The pages of the site, and nothing else: since P22 (D-157) the studies of P03 to P12 are development pages, absent from a release.
  const expected = siteNavigation.pagePaths().length
  check(
    pages.length === expected,
    `${pages.length} pages are built, expected ${expected}`,
  )
  // No page is named after a record, its slug or a family.
  const names = [
    ...store.byId.keys(),
    "synthetic-atlas",
    ...Object.values(FAMILIES).map((prefix) => `${prefix}-`),
  ]
  for (const page of pages) {
    if (page === "_design/records/index.html") continue
    check(
      !names.some((name) => page.includes(name)),
      `${page} looks like a record's page`,
    )
  }
  check(
    !pages.some((page) =>
      /^(people|person|projects|project|publications|publication|organizations|records)\//.test(
        page,
      ),
    ),
    "an entity route exists",
  )
  // No route file reads the records, except the two development studies (P17 added the page-states specimen).
  const readers = []
  for (const file of await listFiles(join(repo, "src/pages"))) {
    if (
      /records\/index\.ts|records-fixture|data\/records/.test(
        await readFile(file, "utf8"),
      )
    )
      readers.push(relative(repo, file))
  }
  check(
    json(readers) === json(["src/pages/[design]/page-states/index.astro", "src/pages/[design]/records.astro"]),
    `route files that read records: ${json(readers)}`,
  )
  // A slug reserves an address; it does not open one.
  check(
    store.get("projects", SYNTHETIC_PROJECT).slug === "synthetic-atlas",
    "the fixture has no slug to test",
  )
  check(
    !siteNavigation.resolve("/portfolio/synthetic-atlas/").found,
    "a project's slug resolves",
  )
})

await test(
  "REC-023",
  "The eight editorial collections stay independent",
  async (check) => {
    check(COLLECTION_IDS.length === 8, `${COLLECTION_IDS.length} editorial collections`)
    const config = await readFile(join(repo, "src/content.config.ts"), "utf8")
    check(
      (config.match(/: collection\("/g) ?? []).length === 8,
      "content.config.ts declares other collections",
    )
    check(!/records/.test(config), "the content configuration loads records")
    check(
      !FAMILY_NAMES.some((family) => COLLECTION_IDS.includes(family)),
      "a family and a collection share a name",
    )
    // The cross-reference contract: optional, validated, one-directional.
    const entry = (data) => ({ title: "T", status: "draft", slug: "t", ...data })
    for (const collection of COLLECTION_IDS) {
      const extra = {
        timberLogs: { period: "2026-04" },
        monthsOriginal: { period: "2026-04" },
        kosmos: { workId: "w" },
        bookClub: { bookTitle: "B" },
      }[collection]
      const none = schemaFor(collection).safeParse(entry(extra))
      check(
        none.success && json(none.data.relatedRecords) === "[]",
        `${collection}: an entry must name records`,
      )
      const some = schemaFor(collection).safeParse(
        entry({ ...extra, relatedRecords: [SYNTHETIC_PROJECT, SYNTHETIC_PUBLICATION] }),
      )
      check(some.success, `${collection}: valid record IDs are refused`)
    }
    for (const relatedRecords of [
      ["Project Atlas"],
      ["project_atlas"],
      ["atlas"],
      [SYNTHETIC_PROJECT, SYNTHETIC_PROJECT],
      "project-a",
    ])
      check(
        !schemaFor("greenhouse").safeParse(entry({ relatedRecords })).success,
        `${json(relatedRecords)} passes as record references`,
      )
    const entries = [
      {
        collection: "greenhouse",
        id: "b",
        data: {
          ...entry({ status: "published", slug: "b" }),
          relatedRecords: [SYNTHETIC_PROJECT],
        },
      },
      {
        collection: "berries",
        id: "a",
        data: {
          ...entry({ status: "published", slug: "a" }),
          relatedRecords: [SYNTHETIC_PROJECT, "project-synthetic-gone"],
        },
      },
      {
        collection: "berries",
        id: "d",
        data: { ...entry({ slug: "d" }), relatedRecords: [SYNTHETIC_PROJECT] },
      },
      {
        collection: "kosmos",
        id: "k",
        data: {
          ...entry({ status: "published", slug: "k", workId: "w" }),
          relatedRecords: [],
        },
      },
    ]
    const found = recordReferenceIssues(entries, (id) => store.byId.has(id))
    check(
      json(found) ===
        json([
          'berries: "a" names the record project-synthetic-gone, which does not exist',
        ]),
      `reference problems: ${json(found)}`,
    )
    // The site's records are empty, so there any reference is unknown: nothing slips through.
    check(
      recordReferenceIssues(entries, (id) => siteRecords.byId.has(id)).length === 4,
      "a reference to a record the site lacks passes",
    )
    // The reverse is derived: public entries about a record, in path order; drafts excluded.
    check(
      json(
        entriesAbout(SYNTHETIC_PROJECT, entries).map((e) => `${e.collection}/${e.id}`),
      ) === json(["berries/a", "greenhouse/b"]),
      `entries about the project: ${json(entriesAbout(SYNTHETIC_PROJECT, entries).map((e) => e.id))}`,
    )
    check(
      entriesAbout(SYNTHETIC_PUBLICATION, entries).length === 0,
      "an unrelated record has entries",
    )
    // No import cycle: the record code knows nothing of the editorial code.
    for (const file of await listFiles(join(repo, "src/records"))) {
      const text = await readFile(file, "utf8")
      check(
        !/from "[^"]*(editorial|navigation|astro:content)/.test(text),
        `${relative(repo, file)} imports site code`,
      )
    }
  },
)

await test("REC-024", "The record system needs nothing outside src/", async (check) => {
  const files = [
    ...(await listFiles(join(repo, "src/records"))),
    ...(await listFiles(join(repo, "src/data/records"))),
    join(repo, "src/design/records-fixture.ts"),
    join(repo, "src/pages/[design]/records.astro"),
  ]
  for (const file of files) {
    const text = await readFile(file, "utf8")
    for (const [, specifier] of text.matchAll(/from "([^"]+)"/g)) {
      if (specifier.startsWith(".")) {
        const target = relative(repo, join(file, "..", specifier))
        check(target.startsWith("src/"), `${relative(repo, file)} imports ${target}`)
      } else {
        check(
          specifier === "astro/zod",
          `${relative(repo, file)} depends on ${specifier}`,
        )
      }
    }
    check(
      !/node:|fetch\(|readFile|codex-yaml|\.ya?ml|brand\/|_backup/.test(text),
      `${relative(repo, file)} reads from outside`,
    )
  }
  const manifest = JSON.parse(await readFile(join(repo, "package.json"), "utf8"))
  check(
    // P19 (D-130) added Three.js and its types for the nucleus prototype; nothing of the records uses them.
    json(Object.keys(manifest.dependencies).sort()) === json(["@types/three", "astro", "three"]),
    "a dependency was added",
  )
  check(
    json(Object.keys(manifest.devDependencies).sort()) ===
      // `yaml` reads the author's CV for the CV tool and its tests only (D-089); no
      // record module and no page imports it, which the loop above checks.
      // `ultrahtml` cleans Quarto's HTML for the scientific-article tool only (D-100).
      // `axe-core` runs the accessibility checks of the browser tests only (P22, D-154).
      json(["@astrojs/check", "axe-core", "prettier", "typescript", "ultrahtml", "yaml"]),
    "a dev dependency was added",
  )
})

await test("REC-025", "Hidden and synthetic records are not emitted", async (check) => {
  // The site's pages are in the release; the records study is a development page, read from a throwaway demonstration build (D-157).
  const demo = await demoBuild()
  const pages = (await listFiles(dist)).filter((f) => f.endsWith(".html"))
  check(demo.files.includes("_design/records/index.html"), "the study is not built in the demonstration build")
  check(!pages.some((p) => p.includes("_design/")), "the release holds a development page")
  const WITHHELD = [
    "must never be shown",
    "Synthetic Student",
    "person-synthetic-student",
    "project-synthetic-hidden",
    "project-synthetic-unreviewed",
    "publication-synthetic-submitted",
    "organization-synthetic-hidden",
  ]
  for (const page of pages) {
    const html = await readFile(page, "utf8")
    const name = relative(dist, page)
    // Withheld records appear on no page at all.
    for (const marker of WITHHELD)
      check(!html.includes(marker), `${name} shows "${marker}"`)
    check(
      !/-synthetic-|Synthetic (Lead|Collaborator|Atlas|Toolkit|University|Institute)|Journal of Synthetic Results/.test(
        html,
      ),
      `${name} carries the synthetic records`,
    )
  }
  const html = await demo.read("_design/records/index.html")
  for (const marker of WITHHELD) check(!html.includes(marker), `the study shows "${marker}"`)
  check(
    /Temporary/.test(html) && /Everything named below is invented/.test(html),
    "the study is not marked as synthetic",
  )
  check(
    (html.match(/data-citation="publication-synthetic-article"/g) ?? []).length === 3,
    "the study does not show the citation three times",
  )
  check(
    /Student S, Lead SF, External E, Collaborator S\./.test(html),
    "the study's citation changed the authors",
  )
  const shownCounts = [...html.matchAll(/<td data-production[^>]*>(\d+)<\/td>/g)].map(
    (m) => m[1],
  )
  check(
    json(shownCounts) === json(Array(8).fill("0")),
    `the study reports the site's records as ${json(shownCounts)}`,
  )
  check(
    /data-diagnostics="5"/.test(html),
    "the study's validation example does not report five problems",
  )
})

await test("REC-026", "The physical folders are unchanged", (check) => {
  const blocks = []
  for (const node of siteNavigation.sections) {
    if (blocks.at(-1)?.[0] !== node.category) blocks.push([node.category, 0])
    blocks.at(-1)[1] += 1
  }
  check(
    json(blocks) ===
      json([
        ["core", 4],
        ["research", 3],
        ["blog-notes", 2],
        ["writing", 1],
        ["bearnard", 1],
      ]),
    `the global row is ${json(blocks)}`,
  )
  check(siteNavigation.nodes.size === 36, `${siteNavigation.nodes.size} folders`)
  check(siteNavigation.contentRoutes.size === 0, "the folders gained routes")
  check(
    [...siteNavigation.nodes.values()].every((node) => node.level <= 3),
    "a fourth level exists",
  )
  check(!siteNavigation.resolve("/_design/records/").found, "the study is a folder")
  check(
    ![...siteNavigation.nodes.keys()].some((id) => familyOfId(id) !== undefined),
    "a folder is a record",
  )
})

// --- Report -------------------------------------------------------------------------------

let failed = 0
for (const { id, title, failures } of results) {
  if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.error(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 12)) console.error(`  - ${message}`)
  }
}
if (failed > 0) process.exit(1)
console.log(
  `PASS: ${results.length} record checks; ${FAMILY_NAMES.length} families, ` +
    `${store.byId.size} synthetic records, ${siteRecords.byId.size} of the site's own`,
)
