// The author's CV as the source of the owner's professional history (P11-A01, D-089 to
// D-093): CV-001 to CV-020.
//
// The real CV file is private: it is not in the repository and may not be on the machine
// that runs these checks. Everything about the adapter is therefore proved on a SYNTHETIC
// FIXTURE (tests/fixtures/cv/), copied into temporary directories. Where the real working
// file is present, a few checks also read it, compare only fingerprints, counts and
// identifiers, and print none of its text; where it is absent they say so and pass.
//
// Run after a build: CV-015 and CV-018 read dist/.
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, relative } from "node:path"
import { fileURLToPath } from "node:url"
import { adaptCv, identityIssues } from "../src/cv/adapter.ts"
import {
  PUBLIC_CONTACT_FIELDS,
  manifestIssues,
  publicationDecision,
} from "../src/cv/manifest.ts"
import { siteCv } from "../src/cv/site.ts"
import { CvIntegrationError, mergeRecords, snapshotIssues } from "../src/cv/snapshot.ts"
import {
  PRIVATE_SECTIONS,
  RECORD_LISTS,
  SECTION_NAMES,
  authoringIssues,
  identityKey,
  parseCvSource,
  recordsOf,
} from "../src/cv/source.ts"
import { CV_SNAPSHOT } from "../src/data/cv/snapshot.ts"
import { INDEPENDENT_RECORDS, PRODUCTION_RECORDS } from "../src/data/records/index.ts"
import { COLLECTION_IDS } from "../src/editorial/collections.ts"
import { siteNavigation } from "../src/navigation/index.ts"
import { citationOf } from "../src/records/citation.ts"
import { cvProjection } from "../src/records/projections.ts"
import { createRecords, validateRecords } from "../src/records/registry.ts"
import { FAMILIES, FAMILY_NAMES } from "../src/records/schema.ts"
import {
  isShown,
  publicationsByPerson,
  publicationsOfProject,
} from "../src/records/selectors.ts"
import { CvToolError, SNAPSHOT_MODULE, buildSnapshot, checkCv } from "../scripts/cv.mjs"

const json = (value) => JSON.stringify(value)
const repo = fileURLToPath(new URL("../", import.meta.url))
const dist = join(repo, "dist")
const sha256 = (text) => createHash("sha256").update(text).digest("hex")
const fixtureText = await readFile(
  join(repo, "tests/fixtures/cv/CV.fixture.yaml"),
  "utf8",
)

const results = []
async function test(id, title, body) {
  const failures = []
  const notes = []
  try {
    await body(
      (ok, message) => ok || failures.push(message),
      (message) => notes.push(message),
    )
  } catch (error) {
    failures.push(error.stack ?? error.message)
  }
  results.push({ id, title, failures, notes })
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

// --- The synthetic setup ------------------------------------------------------------------

const OWNER = "person-fixture-owner"
const fixture = parseCvSource(fixtureText)

/** A hand-written identity for every identified record of the fixture. */
const IDENTITIES = {
  owner: OWNER,
  records: Object.fromEntries(
    RECORD_LISTS.flatMap((list) =>
      recordsOf(fixture.document, list).flatMap((record) =>
        record.sourceId === undefined
          ? []
          : [
              [
                identityKey(list, record.sourceId),
                list.key === "software_e_metodos"
                  ? "project-fixture-tool"
                  : `${FAMILIES[list.family]}-fixture-${list.key.split(".").at(-1).replaceAll("_", "-")}-${record.sourceId.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
              ],
            ],
      ),
    ),
  ),
}
const APPROVAL = { version: "9.9.0", approvedOn: "2031-01-03", contact: [] }
const ALL_CONTACT = { ...APPROVAL, contact: [...PUBLIC_CONTACT_FIELDS] }

/** A project the site describes itself, which the fixture's software entry names. */
const SITE_PROJECT = {
  id: "project-fixture-tool",
  visibility: "public",
  provenance: { status: "verified", source: "fixture" },
  title: "Tool (fixture), described by the site",
  kind: "software",
  status: "active",
  shortDescription: "The site's own, richer description (fixture).",
}
const SITE = { projects: [SITE_PROJECT] }

const approved = adaptCv(fixture.document, {
  identities: IDENTITIES,
  approval: ALL_CONTACT,
  siteProjectIds: [SITE_PROJECT.id],
})
const snapshotOf = (adaptation, approval = ALL_CONTACT) => ({
  source: {
    file: "CV-v9.9.yaml",
    version: approval.version,
    sha256: sha256(fixtureText),
  },
  approvedOn: approval.approvedOn,
  ownerId: OWNER,
  records: adaptation.records,
  profile: adaptation.profile,
})
const SNAPSHOT = snapshotOf(approved)
const store = createRecords(mergeRecords(SITE, SNAPSHOT))
const derived = FAMILY_NAMES.flatMap((f) => approved.records[f])
const bySource = (list, sourceId) =>
  derived.find(
    (r) =>
      r.provenance.source.endsWith(`· ${list}`) && r.provenance.sourceId === sourceId,
  )

/** Text that is in the fixture only where nothing may be projected from. */
const PRIVATE_MARKERS = [
  "privado.sintetico@example.org",
  "+00 00 0000-0000",
  "Cidade Privada Sintética",
  "referencia.privada@example.org",
  "Referência Privada Sintética",
  "Orientanda Sintética Privada",
  "9.99 (sintético)",
  "123.456,00",
  "Título confidencial sintético",
  "CARTA SINTÉTICA PRIVADA",
  "DECLARAÇÃO SINTÉTICA PRIVADA",
  "TÓPICO SINTÉTICO PRIVADO",
  "MOTIVO SINTÉTICO PRIVADO",
  "MODELO SINTÉTICO",
  "Fonte-privada.docx",
  "não confirmad",
  "99+ anos",
]

/** A temporary project: cv/ with a manifest, identities and CV files. */
async function withProject({ manifest, identities = IDENTITIES, files = {} }, body) {
  const dir = await mkdtemp(join(await realpath(tmpdir()), "gusmaolab-cv-"))
  try {
    await mkdir(join(dir, "cv"), { recursive: true })
    await mkdir(join(dir, "src/data/cv"), { recursive: true })
    await writeFile(join(dir, "cv/manifest.json"), json(manifest))
    await writeFile(join(dir, "cv/identities.json"), json(identities))
    await writeFile(join(dir, SNAPSHOT_MODULE), "// untouched\n")
    for (const [name, text] of Object.entries(files))
      await writeFile(join(dir, "cv", name), text)
    return await body(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
const versionText = (version) =>
  fixtureText.replace("versao: 9.9.0", `versao: ${version}`)
const approvalOf = (file, text, version, extra = {}) => ({
  file,
  version,
  sha256: sha256(text),
  approvedOn: "2031-01-03",
  contact: [],
  ...extra,
})
const refusal = async (promise) => {
  try {
    await promise
    return null
  } catch (error) {
    if (!(error instanceof CvToolError)) throw error
    return error.reasons
  }
}

// The real working file, when it is on this machine. Only fingerprints and counts leave it.
const realManifest = JSON.parse(await readFile(join(repo, "cv/manifest.json"), "utf8"))
const realIdentities = JSON.parse(
  await readFile(join(repo, "cv/identities.json"), "utf8"),
)
const realPath =
  realManifest.workingFile === null ? null : join(repo, "cv", realManifest.workingFile)
const realText =
  realPath === null ? null : await readFile(realPath, "utf8").catch(() => null)

// --- Source -------------------------------------------------------------------------------

await test("CV-001", "The proposal YAML parses successfully", async (check, note) => {
  check(Object.keys(fixture.document).length === 22, "the fixture has not 22 sections")
  check(
    authoringIssues(fixture).errors.length === 0,
    "the fixture has authoring errors",
  )
  if (realText === null) {
    note("the private working file is not on this machine: checked on the fixture only")
    return
  }
  const real = parseCvSource(realText)
  const sections = Object.keys(real.document)
  check(sections.length === 22, `the working file has ${sections.length} sections`)
  check(
    sections.every((s) => SECTION_NAMES.includes(s)),
    "the working file has a section the integration does not know",
  )
  const report = authoringIssues(real, realManifest.workingFile)
  check(
    report.errors.length === 0,
    `the working file has ${report.errors.length} errors`,
  )
  check(real.version !== undefined, "the working file states no version")
  const total = RECORD_LISTS.reduce((n, l) => n + recordsOf(real.document, l).length, 0)
  check(total > 0, "the working file has no record")
  note(
    `working file: ${sections.length} sections, ${total} records, ${real.placeholders} placeholders, version ${real.version}`,
  )
})

await test("CV-002", "The adapter supports the Portuguese section names", (check) => {
  const expected = [
    "metadados",
    "identidade_profissional",
    "contato",
    "formacao_academica",
    "experiencia_profissional",
    "publicacoes",
    "apresentacoes_e_eventos",
    "financiamentos_e_grants",
    "premios_e_honrarias",
    "experiencia_docente",
    "mentoria_e_orientacao",
    "servico_e_lideranca",
    "extensao",
    "formacao_complementar",
    "habilidades_tecnicas",
    "software_e_metodos",
    "certificacoes",
    "declaracoes",
    "cartas_de_apresentacao",
    "referencias",
    "topicos_master_sugeridos",
    "placeholders_pendentes",
  ]
  check(
    json(SECTION_NAMES) === json(expected),
    "the accepted sections are not the author's",
  )
  check(
    json(Object.keys(fixture.document)) === json(expected),
    "the fixture has another shape",
  )
  // Every list that has a usable record in the fixture yields a record of its family.
  const yielded = new Set(derived.map((r) => r.provenance.source.split("· ")[1]))
  for (const list of [
    "identidade_profissional",
    "formacao_academica",
    "experiencia_profissional.academica_e_pesquisa",
    "experiencia_profissional.consultoria_industrial_documentada",
    "publicacoes.artigos",
    "publicacoes.anais_completos",
    "publicacoes.resumos_em_anais",
    "publicacoes.preprints",
    "apresentacoes_e_eventos.palestras",
    "apresentacoes_e_eventos.participacoes",
    "financiamentos_e_grants",
    "premios_e_honrarias",
    "experiencia_docente",
    "mentoria_e_orientacao.registros",
    "servico_e_lideranca.administracao",
    "servico_e_lideranca.bancas_academicas",
    "servico_e_lideranca.avaliacao_de_projetos",
    "servico_e_lideranca.revisao_por_pares",
    "extensao",
    "formacao_complementar",
    "certificacoes",
  ])
    check(yielded.has(list), `${list} yields no record`)
  // The mapping of P11-A01, family by family.
  const types = (family) => approved.records[family].map((r) => r.type).sort()
  check(
    json(types("appointments")) === json(["academic", "academic", "consulting"]),
    `appointments: ${json(types("appointments"))}`,
  )
  check(
    json(types("publications")) ===
      json([
        "conference-abstract",
        "conference-paper",
        "journal-article",
        "journal-article",
        "journal-article",
        "preprint",
      ]),
    `publications: ${json(types("publications"))}`,
  )
  check(
    json([...new Set(types("activities"))]) ===
      json([
        "award",
        "certification",
        "funding",
        "mentoring",
        "outreach",
        "participation",
        "presentation",
        "service",
        "teaching",
        "training",
      ]),
    `activities: ${json([...new Set(types("activities"))])}`,
  )
  check(approved.records.education.length === 2, "education is not mapped")
  check(
    json(approved.records.education.map((e) => e.level)) ===
      json(["doctorate", "undergraduate"]),
    "degree levels are not read from the degree's name",
  )
  check(
    approved.records.education.every((e) => !("status" in e)),
    "a degree has a status the CV does not state",
  )
  // Skills and identity are a profile, not records.
  check(
    approved.profile.name === "Pessoa Sintética (fixture)",
    "the profile has no name",
  )
  check(approved.profile.language === "pt-BR", "the profile does not say its language")
  check(
    json(approved.profile.skills) ===
      json([
        {
          group: "pesquisa.metodos",
          items: ["Método sintético um", "Método sintético dois"],
        },
      ]),
    `skills: ${json(approved.profile.skills)}`,
  )
  check(
    json(approved.profile.languages) ===
      json([
        { language: "Idioma Sintético", proficiency: "Nativo" },
        { language: "Outro Idioma" },
      ]),
    `languages: ${json(approved.profile.languages)}`,
  )
  // An empty CV is a CV with nothing to say.
  const empty = adaptCv({}, { identities: IDENTITIES, approval: APPROVAL })
  check(
    FAMILY_NAMES.every((f) => empty.records[f].length === 0),
    "an empty CV yields records",
  )
})

await test(
  "CV-003",
  "Source files remain unchanged after loading",
  async (check, note) => {
    const before = json(fixture.document)
    adaptCv(fixture.document, { identities: IDENTITIES, approval: ALL_CONTACT })
    adaptCv(fixture.document, { identities: IDENTITIES })
    authoringIssues(fixture, "CV-v1.0.yaml")
    check(json(fixture.document) === before, "adapting changed the parsed document")
    const text = versionText("9.9.0")
    await withProject(
      {
        manifest: {
          workingFile: "CV.proposta.yaml",
          published: approvalOf("CV-v9.9.yaml", text, "9.9.0"),
          publishEnabled: true,
        },
        files: { "CV.proposta.yaml": text, "CV-v9.9.yaml": text },
      },
      async (dir) => {
        await checkCv(dir)
        await buildSnapshot(dir)
        for (const name of ["CV.proposta.yaml", "CV-v9.9.yaml"])
          check(
            (await readFile(join(dir, "cv", name), "utf8")) === text,
            `${name} was changed by the tool`,
          )
        check(
          json((await readdir(join(dir, "cv"))).sort()) ===
            json([
              "CV-v9.9.yaml",
              "CV.proposta.yaml",
              "identities.json",
              "manifest.json",
            ]),
          "the tool created, renamed or removed a file in cv/",
        )
      },
    )
    // Nothing in the integration can write a CV file: the one write is the snapshot module.
    const tool = await readFile(join(repo, "scripts/cv.mjs"), "utf8")
    const writes = [
      ...tool.matchAll(/\b(?:writeFile|appendFile|rename|unlink|rm|cp)\(/g),
    ]
    check(
      writes.length === 1 && tool.includes("writeFile(join(root, SNAPSHOT_MODULE)"),
      "the tool writes more than the snapshot",
    )
    for (const file of await listFiles(join(repo, "src/cv")))
      check(
        !/node:|writeFile|readFile/.test(await readFile(file, "utf8")),
        `${relative(repo, file)} touches the file system`,
      )
    if (realText === null) {
      note("the private working file is not on this machine")
      return
    }
    const fingerprint = sha256(realText)
    await checkCv(repo)
    adaptCv(parseCvSource(realText).document, { identities: realIdentities })
    check(
      sha256(await readFile(realPath, "utf8")) === fingerprint,
      "the working file changed while it was read",
    )
  },
)

// --- Placeholders -------------------------------------------------------------------------

await test("CV-004", "Authoring validation keeps unresolved placeholders", (check) => {
  const count = (fixtureText.match(/\{\{[^{}]*\}\}/g) ?? []).length
  check(count > 30, "the fixture has too few placeholders to prove anything")
  check(fixture.placeholders === count, `counted ${fixture.placeholders} of ${count}`)
  const report = authoringIssues(fixture, "CV-v9.9.yaml")
  check(report.errors.length === 0, `placeholders are errors: ${json(report.errors)}`)
  check(
    !report.warnings.some((w) => /placeholder|\{\{/.test(w)),
    "a placeholder is reported as a problem",
  )
  // They are still there, exactly as written.
  check(
    fixture.document.experiencia_profissional.academica_e_pesquisa[0].periodo.fim ===
      "{{EXP_1_FIM}}",
    "a placeholder was changed by parsing",
  )
  check(
    json(fixture.document).includes("{{RESPONSABILIDADES_EXP_1}}"),
    "a placeholder was dropped",
  )
  // What authoring validation does report: records it cannot identify.
  check(
    report.warnings.some((w) =>
      w.startsWith("experiencia_profissional.industria: 1 record"),
    ),
    `a record without an id is not reported: ${json(report.warnings)}`,
  )
  // And what it refuses: a structure it cannot understand.
  const broken = parseCvSource(
    "formacao_academica: texto\npublicacoes:\n  artigos:\n    - id: a\n    - id: a\n",
  )
  const issues = authoringIssues(broken).errors
  check(
    issues.some((e) => e.includes("formacao_academica must be a list")),
    json(issues),
  )
  check(
    issues.some((e) => e.includes('"a" is used twice')),
    json(issues),
  )
  let thrown
  try {
    parseCvSource("a: [1, 2\n")
  } catch (error) {
    thrown = error
  }
  check(thrown?.name === "CvSourceError", "invalid YAML is not reported as such")
})

await test(
  "CV-005",
  "Publication validation excludes unresolved placeholders",
  (check) => {
    check(
      !/\{\{[^{}"]*\}\}/.test(json([approved.records, approved.profile])),
      "a placeholder is projected",
    )
    // A field a record can do without is left out; the record stays.
    const exp1 = bySource("experiencia_profissional.academica_e_pesquisa", "exp_1")
    check(exp1 !== undefined, "a record with an optional placeholder is dropped")
    check(!("summary" in exp1), "an unresolved summary is projected")
    check(
      approved.omitted.some(
        (o) =>
          o.where ===
            "experiencia_profissional.academica_e_pesquisa/exp_1.responsabilidades" &&
          o.reason === "is unresolved",
      ),
      "the omission is not reported",
    )
    // A field it cannot do without leaves the record out, and says so.
    check(
      bySource("experiencia_profissional.academica_e_pesquisa", "exp_3") === undefined,
      "a record without its title is projected",
    )
    check(
      approved.excluded.some(
        (e) =>
          e.where === "experiencia_profissional.academica_e_pesquisa/exp_3" &&
          e.reason === "cargo is unresolved or missing",
      ),
      `the exclusion is not explained: ${json(approved.excluded)}`,
    )
    // An unresolved identifier is not a DOI; an address is not a DOI either.
    const [withDoi, withoutId, withUrl] = ["4.1.1", "4.1.2", "4.1.3"].map((id) =>
      bySource("publicacoes.artigos", id),
    )
    check(withDoi.doi === "10.5555/SINTETICO.2024.1", "a DOI is not kept as written")
    check(!("doi" in withoutId) && !("url" in withoutId), "an identifier was made up")
    check(
      withUrl.url === "https://example.org/artigo/sintetico-3" && !("doi" in withUrl),
      "an address is read as a DOI",
    )
    // An impossible date is left out, never corrected.
    const talk = bySource("apresentacoes_e_eventos.palestras", "4.4.2")
    check(
      talk !== undefined && !("date" in talk),
      "an impossible date is kept or repaired",
    )
    check(
      approved.omitted.some((o) => o.where.endsWith("4.4.2.data")),
      "the bad date is not reported",
    )
    // Drafts and unidentified records stay out.
    check(
      approved.excluded.filter((e) => e.reason === "is marked as a draft (situacao)")
        .length === 2,
      "drafts are not excluded",
    )
    // The site refuses a snapshot that carries a placeholder or a field of the raw file.
    const tainted = structuredClone(SNAPSHOT)
    tainted.records.appointments[0].summary = "Até {{EXP_1_FIM}}"
    tainted.records.activities[0].modelo_sem_vinculos = "x"
    const issues = snapshotIssues(tainted)
    check(
      issues.some((i) => i.includes("unresolved placeholder")),
      json(issues),
    )
    check(
      issues.some((i) => i.includes("field of the raw CV file")),
      json(issues),
    )
    let thrown
    try {
      mergeRecords({}, tainted)
    } catch (error) {
      thrown = error
    }
    check(thrown instanceof CvIntegrationError, "a tainted snapshot loads")
  },
)

// --- Approval and versions ----------------------------------------------------------------

await test(
  "CV-006",
  "fonte_de_verdade: true does not authorize publication",
  async (check) => {
    check(
      fixture.document.metadados.fonte_de_verdade === true,
      "the fixture is not a source of truth",
    )
    const manifest = {
      workingFile: "CV.proposta.yaml",
      published: null,
      publishEnabled: false,
    }
    const decision = publicationDecision(manifest, {
      version: "9.9.0",
      sha256: sha256(fixtureText),
    })
    check(!decision.approved, "a source of truth is published without approval")
    await withProject(
      { manifest, files: { "CV.proposta.yaml": fixtureText } },
      async (dir) => {
        const reasons = await refusal(buildSnapshot(dir))
        check(reasons !== null, "a snapshot was built without approval")
        check(
          (await readFile(join(dir, SNAPSHOT_MODULE), "utf8")) === "// untouched\n",
          "the snapshot module was written",
        )
        const report = await checkCv(dir)
        check(report.working.sourceOfTruth === true, "the tool does not see the flag")
        check(!report.publication.approved, "the tool reports an approval")
      },
    )
    check(
      manifestIssues({ workingFile: null, published: null, publishEnabled: true })
        .length > 0,
      "the switch alone publishes",
    )
    // The flag, the status and the file's own claims decide nothing in the code that decides.
    for (const file of ["adapter.ts", "manifest.ts", "snapshot.ts", "site.ts"]) {
      const code = (await readFile(join(repo, "src/cv", file), "utf8")).replace(
        /\/\*[\s\S]*?\*\/|\/\/.*/g,
        "",
      )
      // The adapter reads one thing of the document's metadata: its language.
      check(
        !/fonte_de_verdade|verificacao|metadados(?!", "idioma"\])/.test(code),
        `${file} reads the file's own claims`,
      )
    }
  },
)

await test(
  "CV-007",
  "A proposal under author review is not publicly approved",
  async (check) => {
    check(
      /^Proposta para revisão/.test(fixture.document.metadados.situacao),
      "the fixture is not a proposal",
    )
    const text = fixtureText
    // The working file can never be named as the published version, nor can any file
    // that is not an explicitly created version.
    for (const [file, fragment] of [
      ["CV.proposta.yaml", "CV-vX.Y.yaml"],
      ["CV-latest.yaml", "CV-vX.Y.yaml"],
      ["../CV-v9.9.yaml", "inside cv/"],
    ]) {
      const issues = manifestIssues({
        workingFile: "CV.proposta.yaml",
        published: approvalOf(file, text, "9.9.0"),
        publishEnabled: true,
      })
      check(
        issues.some((i) => i.includes(fragment)),
        `${file}: ${json(issues)}`,
      )
    }
    check(
      manifestIssues({
        workingFile: "CV-v9.9.yaml",
        published: approvalOf("CV-v9.9.yaml", text, "9.9.0"),
        publishEnabled: true,
      }).some((i) => i.includes("never the published version")),
      "the working file is published",
    )
    // Without an approval the adapter's records are hidden and unreviewed: no selector
    // shows them, even if they were loaded.
    const preview = adaptCv(fixture.document, { identities: IDENTITIES })
    const all = FAMILY_NAMES.flatMap((f) => preview.records[f])
    check(all.length > 20, "the preview is empty")
    check(
      all.every(
        (r) => r.visibility === "hidden" && r.provenance.status === "unreviewed",
      ),
      "an unapproved record is public or verified",
    )
    const hidden = createRecords(preview.records)
    check(
      all.every((r) => !isShown(hidden, hidden.byId.get(r.id))),
      "an unapproved record is shown",
    )
    check(
      publicationsByPerson(hidden, OWNER).length === 0,
      "an unapproved output is listed",
    )
    check(
      snapshotIssues(snapshotOf(preview)).some((i) =>
        i.includes("only public, verified records"),
      ),
      "an unapproved snapshot is accepted",
    )
    // The repository itself: nothing is approved, nothing is published.
    check(
      json(manifestIssues(realManifest)) === "[]",
      json(manifestIssues(realManifest)),
    )
    check(realManifest.published === null, "the repository approves a CV version")
    check(realManifest.publishEnabled === false, "publication is switched on")
    check(
      !publicationDecision(realManifest).approved,
      "the repository's CV is approved",
    )
    check(CV_SNAPSHOT === null, "a public CV snapshot is committed")
    check(siteCv.published === false && !("profile" in siteCv), "the site has CV data")
    check(
      realIdentities.owner === null && json(realIdentities.records) === "{}",
      "identities were assigned without the owner",
    )
  },
)

await test("CV-008", "Version selection is explicit", async (check) => {
  const v98 = versionText("9.8.0")
  const v99 = versionText("9.9.0")
  const v100 = versionText("10.0.0")
  const files = {
    "CV-v9.8.yaml": v98,
    "CV-v9.9.yaml": v99,
    "CV-v10.0.yaml": v100,
    "CV.proposta.yaml": v100,
  }
  // The owner approved 9.8. Newer files exist: they are not picked.
  await withProject(
    {
      manifest: {
        workingFile: "CV.proposta.yaml",
        published: approvalOf("CV-v9.8.yaml", v98, "9.8.0"),
        publishEnabled: true,
      },
      files,
    },
    async (dir) => {
      const { snapshot } = await buildSnapshot(dir)
      check(
        snapshot.source.file === "CV-v9.8.yaml" && snapshot.source.version === "9.8.0",
        `selected ${json(snapshot.source)}`,
      )
      check(snapshot.source.sha256 === sha256(v98), "the fingerprint is not the file's")
      check(
        snapshot.records.appointments[0].provenance.source.startsWith("CV 9.8.0 · "),
        "records do not name the approved version",
      )
    },
  )
  // Nothing approved: the same files publish nothing.
  await withProject(
    {
      manifest: {
        workingFile: "CV.proposta.yaml",
        published: null,
        publishEnabled: false,
      },
      files,
    },
    async (dir) => {
      check(
        (await refusal(buildSnapshot(dir))) !== null,
        "a version was picked by itself",
      )
    },
  )
  // Approved, but switched off; edited after approval; another version inside.
  const cases = [
    [{ publishEnabled: false }, v99, "switched off"],
    [{}, `${v99}\n# edited after approval\n`, "has changed since it was approved"],
    [{}, null, "is not on this machine"],
  ]
  for (const [change, onDisk, fragment] of cases) {
    await withProject(
      {
        manifest: {
          workingFile: null,
          published: approvalOf("CV-v9.9.yaml", v99, "9.9.0"),
          publishEnabled: true,
          ...change,
        },
        files: onDisk === null ? {} : { "CV-v9.9.yaml": onDisk },
      },
      async (dir) => {
        const reasons = await refusal(buildSnapshot(dir))
        check(
          reasons?.some((r) => r.includes(fragment)),
          `expected "${fragment}": ${json(reasons)}`,
        )
      },
    )
  }
  const mismatch = publicationDecision(
    {
      workingFile: null,
      published: approvalOf("CV-v9.9.yaml", v99, "9.9.0"),
      publishEnabled: true,
    },
    { version: "9.9.1", sha256: sha256(v99) },
  )
  check(
    mismatch.reasons.some((r) => r.includes("the file states 9.9.1")),
    json(mismatch.reasons),
  )
  // A file name and its metadata that disagree: a warning for the owner, nothing else.
  const report = authoringIssues(parseCvSource(v98), "CV-v9.9.yaml")
  check(report.errors.length === 0, "a version mismatch is an error")
  check(
    report.warnings.some(
      (w) => w.includes("file name says version 9.9") && w.includes("9.8.0"),
    ),
    json(report.warnings),
  )
  check(
    !authoringIssues(parseCvSource(v99), "CV-v9.9.yaml").warnings.some((w) =>
      w.includes("file name says"),
    ),
    "9.9 and 9.9.0 are said to disagree",
  )
  check(
    !authoringIssues(fixture, "CV.proposta.yaml").warnings.some((w) =>
      w.includes("file name says"),
    ),
    "a working file's name is read as a version",
  )
  // An unquoted `1.0` is the version 1.0, not the number 1.
  check(
    parseCvSource("metadados:\n  versao: 1.0\n").version === "1.0",
    "a version loses its last part",
  )
  // No code lists a directory to find a CV.
  for (const file of [
    join(repo, "scripts/cv.mjs"),
    ...(await listFiles(join(repo, "src/cv"))),
  ])
    check(
      !/readdir|glob|\.sort\(\)\.at\(-1\)/.test(await readFile(file, "utf8")),
      `${relative(repo, file)} looks for files`,
    )
})

// --- Identity and content -----------------------------------------------------------------

await test("CV-009", "Source IDs are kept through the identity mapping", (check) => {
  for (const list of RECORD_LISTS) {
    if (list.key === "software_e_metodos") continue
    for (const record of recordsOf(fixture.document, list)) {
      if (record.sourceId === undefined) continue
      const found = bySource(list.key, record.sourceId)
      if (found === undefined) continue
      check(
        found.id === IDENTITIES.records[identityKey(list, record.sourceId)],
        `${list.key}/${record.sourceId} has the ID ${found.id}`,
      )
      check(
        found.provenance.sourceId === record.sourceId,
        `${found.id} lost its source ID`,
      )
    }
  }
  check(
    bySource("publicacoes.artigos", "4.1.1").id === "publication-fixture-artigos-4-1-1",
    "an identity is not the one written",
  )
  check(
    recordsOf(fixture.document, RECORD_LISTS[1])[0].sourceId === "exp_1" &&
      fixture.document.publicacoes.artigos[0].id === "4.1.1",
    "the author's identifiers were rewritten",
  )
  // Identity does not follow position: the same records in another order keep their IDs.
  const reordered = structuredClone(fixture.document)
  reordered.publicacoes.artigos.reverse()
  const again = adaptCv(reordered, { identities: IDENTITIES, approval: ALL_CONTACT })
  const ids = (a) =>
    json(a.records.publications.map((p) => [p.provenance.sourceId, p.id]).sort())
  check(ids(again) === ids(approved), "an identity follows a position")
  // A record without an identity is left out, never given one.
  const partial = {
    owner: OWNER,
    records: { "publicacoes.artigos/4.1.2": "publication-only-one" },
  }
  const few = adaptCv(fixture.document, { identities: partial, approval: APPROVAL })
  check(
    json(few.records.publications.map((p) => p.id)) === json(["publication-only-one"]),
    "an ID was derived for an unmapped record",
  )
  check(
    few.excluded.some(
      (e) =>
        e.where === "publicacoes.artigos/4.1.1" &&
        e.reason === "has no record ID in cv/identities.json",
    ),
    "an unmapped record is not reported",
  )
  const none = adaptCv(fixture.document, {
    identities: { owner: null, records: {} },
    approval: APPROVAL,
  })
  check(
    none.profile === null && FAMILY_NAMES.every((f) => none.records[f].length === 0),
    "records exist without an owner",
  )
  // The mapping is validated.
  const bad = identityIssues(
    {
      owner: "organization-not-a-person",
      records: {
        "publicacoes.artigos/4.1.1": "activity-wrong-family",
        "publicacoes.artigos/4.1.2": "publication-twice",
        "publicacoes.artigos/4.1.3": "publication-twice",
        "nowhere/1": "publication-x",
        "publicacoes.artigos/9.9.9": "publication-stale",
        "formacao_academica/formacao_1": "Education 1",
      },
    },
    fixture.document,
  )
  for (const fragment of [
    "owner must be null or a person ID",
    '"activity-wrong-family" is not a publication ID',
    "publication-twice is given to",
    '"nowhere/1" does not name a record list',
    '"Education 1" is not a education ID',
  ])
    check(
      bad.errors.some((e) => e.includes(fragment)),
      `expected "${fragment}" in ${json(bad.errors)}`,
    )
  check(
    json(bad.stale) === json(["publicacoes.artigos/9.9.9"]),
    `stale: ${json(bad.stale)}`,
  )
  check(
    json(identityIssues(IDENTITIES, fixture.document)) ===
      json({ errors: [], stale: [] }),
    "the fixture's identities are refused",
  )
})

await test("CV-010", "Author order and co-first-author notes are kept", (check) => {
  const source = fixture.document.publicacoes.artigos[0]
  const record = bySource("publicacoes.artigos", "4.1.1")
  check(record.authorsText === source.autores, "the author line was changed")
  check(
    record.authorsText ===
      "Alfa, A.*, Beta B.B.*, Sintetica, P.*, van Gama, C.D., Delta, E.-F.",
    "the fixture's author line is not the one expected",
  )
  check(
    (record.authorsText.match(/\*/g) ?? []).length === 3,
    "a co-first-author mark was lost",
  )
  check(!("authors" in record), "the author line was split into names")
  check(record.authorshipNote === source.nota_autoria, "the authorship note was lost")
  check(
    json(record.creditedTo) === json([OWNER]),
    "the output is not credited to the owner",
  )
  const loaded = store.get("publications", record.id)
  const citation = citationOf(store, loaded)
  check(
    citation.text ===
      "Alfa, A.*, Beta B.B.*, Sintetica, P.*, van Gama, C.D., Delta, E.-F. " +
        "Artigo sintético com coprimeira autoria. Revista Sintética, 43(11): 114853, 2024. " +
        "Asterisco indica co-primeira autoria na fonte.",
    `the citation reads: ${citation.text}`,
  )
  check(
    citation.authorsText === source.autores && citation.authors.length === 0,
    "the citation lists authors it was not given",
  )
  check(citation.details === source.veiculo_e_detalhes, "the venue line was changed")
  check(
    citation.link === "https://doi.org/10.5555/sintetico.2024.1",
    "the DOI link is wrong",
  )
  // Every output keeps its line, whatever its punctuation.
  for (const list of RECORD_LISTS.filter((l) => l.family === "publications"))
    for (const item of recordsOf(fixture.document, list)) {
      const found = bySource(list.key, item.sourceId)
      check(
        found?.authorsText === item.data.autores,
        `${list.key}/${item.sourceId} lost its author line`,
      )
    }
  // A preprint is not a published article.
  const preprint = citationOf(
    store,
    store.get("publications", bySource("publicacoes.preprints", "4.9.1").id),
  )
  check(preprint.statusLabel === "Preprint", "a preprint reads as published")
})

await test("CV-011", "An unknown end is not an ongoing appointment", (check) => {
  const exp1 = bySource("experiencia_profissional.academica_e_pesquisa", "exp_1")
  const exp5 = bySource(
    "experiencia_profissional.consultoria_industrial_documentada",
    "exp_5",
  )
  check(
    json(exp1.period) === json({ start: "2023-07-01" }),
    `exp_1: ${json(exp1.period)}`,
  )
  check(
    json(exp5.period) === json({ start: "2021-05-01" }),
    `exp_5: ${json(exp5.period)}`,
  )
  check(
    json(bySource("experiencia_profissional.academica_e_pesquisa", "exp_2").period) ===
      json({ start: "2020-01-15", end: "2022-12-31" }),
    "a known end is lost",
  )
  const degree = bySource("formacao_academica", "formacao_2")
  check(
    degree.startDate === "2006-08-01" && !("completionDate" in degree),
    "a degree got an end date",
  )
  check(!/"present"/.test(json(approved.records)), 'a record says "present"')
  const cv = cvProjection(store, OWNER)
  const lines = Object.values(cv).filter(Array.isArray).flat()
  check(lines.length > 20, "the projection is empty")
  check(
    !lines.some((line) => /present|presente|atual|em andamento/i.test(line.when ?? "")),
    "a CV line reads as ongoing",
  )
  check(
    cv.appointments.find((a) => a.id === exp1.id).when === "1 July 2023",
    "a start with no recorded end is not shown alone",
  )
  check(
    cv.education.find((e) => e.id === degree.id).when === "1 August 2006",
    "a degree with no recorded end is shown as ongoing or completed",
  )
  // A single day is one date, not a period.
  const board = cv.service.find((s) => s.heading === "Banca sintética de doutorado")
  check(board.when === "10 April 2024", `a dated service line reads: ${board.when}`)
})

await test("CV-012", "CV-derived records feed the record selectors, once", (check) => {
  check(
    validateRecords(mergeRecords(SITE, SNAPSHOT)).length === 0,
    "the merged dataset is invalid",
  )
  const cv = cvProjection(store, OWNER)
  const counts = Object.fromEntries(
    Object.entries(cv)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => [k, v.length]),
  )
  check(
    json(counts) ===
      json({
        appointments: 3,
        education: 2,
        projects: 0,
        publications: 6,
        teaching: 2,
        presentations: 2,
        participations: 1,
        mentoring: 1,
        awards: 1,
        funding: 1,
        service: 4,
        outreach: 1,
        training: 1,
        certifications: 1,
      }),
    `the CV projection has ${json(counts)}`,
  )
  check(cv.person.name === "Pessoa Sintética (fixture)", "the CV is not the owner's")
  check(
    cv.appointments[0].organization === "Instituto Sintético – Cidade, País",
    "an institution kept as text is not shown",
  )
  check(cv.mentoring[0].heading === "mentoring, doctorate", cv.mentoring[0].heading)
  // The CV relates outputs to a project the site describes; it does not describe it.
  const outputs = publicationsOfProject(store, SITE_PROJECT.id).map(
    (p) => p.provenance.sourceId,
  )
  check(
    json(outputs.sort()) === json(["4.1.1", "4.2.1"]),
    `project outputs: ${json(outputs)}`,
  )
  check(
    store.get("projects", SITE_PROJECT.id).shortDescription ===
      "The site's own, richer description (fixture).",
    "the CV overwrote the site's description of a project",
  )
  check(
    !("projects" in SNAPSHOT.records) || SNAPSHOT.records.projects.length === 0,
    "the CV describes a project",
  )
  const alone = adaptCv(fixture.document, {
    identities: IDENTITIES,
    approval: APPROVAL,
  })
  check(
    alone.records.publications.every((p) => !("projectIds" in p)) &&
      alone.excluded.some((e) => e.reason.startsWith("the site has no project")),
    "a relationship is made to a project the site does not have",
  )
  // One source per fact: the same fact written by hand is refused.
  const refused = (independent) => {
    try {
      mergeRecords(independent, SNAPSHOT)
      return []
    } catch (error) {
      return error.issues
    }
  }
  const byHand = {
    visibility: "public",
    provenance: { status: "verified", source: "by hand" },
  }
  const cases = [
    [
      {
        education: [
          {
            ...byHand,
            id: "education-by-hand",
            personId: OWNER,
            qualification: "X",
            level: "other",
          },
        ],
      },
      "education-by-hand states a fact of the owner's CV by hand",
    ],
    [
      {
        activities: [
          {
            ...byHand,
            id: "activity-by-hand",
            personId: OWNER,
            type: "award",
            name: "X",
          },
        ],
      },
      "activity-by-hand states a fact",
    ],
    [
      {
        publications: [
          {
            ...byHand,
            id: "publication-by-hand",
            title: "X",
            type: "other",
            status: "submitted",
            authors: [{ personId: OWNER }],
          },
        ],
      },
      "publication-by-hand states a fact",
    ],
    [{ people: [{ ...byHand, id: OWNER, displayName: "X" }] }, "a fact has one source"],
    [
      { publications: [{ ...approved.records.publications[0] }] },
      "is in src/data/records/ and in the CV snapshot",
    ],
  ]
  for (const [independent, fragment] of cases) {
    const issues = refused(independent)
    check(
      issues.some((i) => i.includes(fragment)),
      `expected "${fragment}": ${json(issues)}`,
    )
  }
  check(refused(SITE).length === 0, "an independent project is refused")
  // The site's hand-written records hold nothing of the owner's CV, and nothing at all yet.
  check(
    FAMILY_NAMES.every((f) => (INDEPENDENT_RECORDS[f] ?? []).length === 0),
    "a record was written by hand",
  )
  check(
    PRODUCTION_RECORDS === INDEPENDENT_RECORDS,
    "the site's records are not the independent ones",
  )
})

// --- Privacy ------------------------------------------------------------------------------

await test(
  "CV-013",
  "Private references and contact details are not projected",
  (check) => {
    const everything = json([SNAPSHOT, approved.excluded, approved.omitted])
    for (const marker of PRIVATE_MARKERS.slice(0, 5))
      check(!everything.includes(marker), `"${marker}" is in the public projection`)
    check(!/@example\.org/.test(json(SNAPSHOT)), "an email address is projected")
    // Contact is released field by field, and only public profile links can be released.
    const person = approved.records.people[0]
    check(person.orcid === "0000-0002-1825-0097", "a released ORCID iD is missing")
    check(
      json(person.links) ===
        json([
          { label: "Lattes", url: "https://example.org/lattes/sintetico" },
          { label: "GitHub", url: "https://example.org/git/sintetico" },
          {
            label: "Google Scholar",
            url: "https://example.org/scholar?user=sintetico",
          },
          { label: "ResearchGate", url: "https://example.org/rg/sintetico" },
        ]),
      `links: ${json(person.links)}`,
    )
    check(
      approved.omitted.some(
        (o) => o.where === "contato.site" && o.reason.includes("URL"),
      ),
      "a link that is not a URL is repaired or kept silently",
    )
    const closed = adaptCv(fixture.document, {
      identities: IDENTITIES,
      approval: APPROVAL,
    })
    check(
      !("orcid" in closed.records.people[0]) &&
        closed.records.people[0].links.length === 0,
      "contact is projected without being released",
    )
    for (const field of ["email", "telefone", "localizacao", "fonte_email"]) {
      check(!PUBLIC_CONTACT_FIELDS.includes(field), `${field} can be released`)
      check(
        manifestIssues({
          workingFile: null,
          published: approvalOf("CV-v9.9.yaml", fixtureText, "9.9.0", {
            contact: [field],
          }),
          publishEnabled: true,
        }).some((i) => i.includes("published.contact")),
        `a manifest may release ${field}`,
      )
    }
    // The sections of references and their kin are never opened.
    const opened = new Set()
    const watched = new Proxy(fixture.document, {
      get(target, key) {
        if (typeof key === "string") opened.add(key)
        return target[key]
      },
    })
    adaptCv(watched, {
      identities: IDENTITIES,
      approval: ALL_CONTACT,
      siteProjectIds: [SITE_PROJECT.id],
    })
    check(opened.size > 10, "the watch saw nothing")
    for (const section of PRIVATE_SECTIONS)
      check(!opened.has(section), `the adapter opened ${section}`)
    check(
      json(PRIVATE_SECTIONS) ===
        json([
          "declaracoes",
          "cartas_de_apresentacao",
          "referencias",
          "topicos_master_sugeridos",
          "placeholders_pendentes",
        ]),
      "the private sections changed",
    )
  },
)

await test(
  "CV-014",
  "Templates and placeholder inventories never become records",
  (check) => {
    const everything = json([SNAPSHOT, approved.excluded, approved.omitted])
    for (const marker of PRIVATE_MARKERS)
      check(!everything.includes(marker), `"${marker}" is in the public projection`)
    check(
      !/modelo_sem_vinculos|texto_sem_vinculos|placeholders_pendentes|marcadores/.test(
        json(SNAPSHOT),
      ),
      "a template or inventory field is projected",
    )
    // Third parties' details and confidential titles stay in the CV.
    const mentoring = approved.records.activities.find((a) => a.type === "mentoring")
    check(
      json(Object.keys(mentoring).sort()) ===
        json([
          "context",
          "id",
          "level",
          "period",
          "personId",
          "provenance",
          "topic",
          "type",
          "visibility",
        ]),
      `a mentoring record carries ${json(Object.keys(mentoring))}`,
    )
    const review = bySource("servico_e_lideranca.avaliacao_de_projetos", "7.2.1")
    check(!("subject" in review), "the title of a reviewed proposal is projected")
    check(
      bySource("servico_e_lideranca.bancas_academicas", "7.1.1").subject ===
        "Título público sintético de tese",
      "a public thesis title is lost",
    )
    check(
      approved.records.activities
        .filter((a) => a.type === "award" || a.type === "funding")
        .every((a) => json(Object.keys(a)).includes("grantor") && !/123/.test(json(a))),
      "an amount of money is projected",
    )
    // Every projected record is a record of a family, with the shape of that family.
    check(
      validateRecords(SNAPSHOT.records).filter(
        (i) => !i.includes("project-fixture-tool"),
      ).length === 0,
      "a projected record is not a valid record",
    )
    check(snapshotIssues(SNAPSHOT).length === 0, json(snapshotIssues(SNAPSHOT)))
  },
)

// --- Build --------------------------------------------------------------------------------

const TEXT_FILE = /\.(?:html|js|mjs|css|json|xml|txt|svg|webmanifest|map)$/
const distFiles = await listFiles(dist).catch(() => [])
const distText = new Map()
for (const file of distFiles.filter((f) => TEXT_FILE.test(f)))
  distText.set(relative(dist, file), await readFile(file, "utf8"))

await test("CV-015", "No approved CV data does not break the build", (check) => {
  const pages = [...distText.keys()].filter((f) => f.endsWith(".html"))
  const site = pages.filter(
    (f) => !f.startsWith("_design/editorial/") && !f.startsWith("_design/quarto/"),
  )
  check(site.length === 40, `the build has ${site.length} pages, not 40`)
  check(pages.includes("cv/index.html"), "the CV folder's page is not built")
  check(CV_SNAPSHOT === null, "the build was not made without a snapshot")
  check(
    mergeRecords(INDEPENDENT_RECORDS, null) === INDEPENDENT_RECORDS,
    "no snapshot is not a pass-through",
  )
  check(
    validateRecords(PRODUCTION_RECORDS).length === 0,
    "the site's records are invalid",
  )
})

await test(
  "CV-016",
  "The eight editorial collections stay independent",
  async (check) => {
    check(COLLECTION_IDS.length === 8, `${COLLECTION_IDS.length} collections`)
    for (const file of [
      ...(await listFiles(join(repo, "src/editorial"))),
      join(repo, "src/content.config.ts"),
    ])
      check(
        !/["'/]cv\/|\byaml\b/.test(await readFile(file, "utf8")),
        `${relative(repo, file)} knows the CV`,
      )
    for (const file of await listFiles(join(repo, "src/cv")))
      check(
        !/editorial|astro:content/.test(await readFile(file, "utf8")),
        `${relative(repo, file)} knows the editorial collections`,
      )
    const content = await readdir(join(repo, "src/content"))
    check(content.length === 8, `src/content has ${content.length} directories`)
  },
)

/**
 * A throwaway copy of the project with a snapshot generated from the fixture by the real
 * command, and with no cv/ folder at all: what GitHub Actions would have.
 */
async function buildWithSnapshot() {
  const dir = await mkdtemp(join(await realpath(tmpdir()), "gusmaolab-cv-build-"))
  try {
    for (const item of [
      "src",
      "public",
      "astro.config.mjs",
      "tsconfig.json",
      "package.json",
    ])
      await cp(join(repo, item), join(dir, item), { recursive: true })
    await symlink(join(repo, "node_modules"), join(dir, "node_modules"), "dir")
    await mkdir(join(dir, "cv"))
    await writeFile(
      join(dir, "cv/manifest.json"),
      json({
        workingFile: null,
        published: approvalOf("CV-v9.9.yaml", fixtureText, "9.9.0", {
          contact: [...PUBLIC_CONTACT_FIELDS],
        }),
        publishEnabled: true,
      }),
    )
    await writeFile(join(dir, "cv/identities.json"), json(IDENTITIES))
    await writeFile(join(dir, "cv/CV-v9.9.yaml"), fixtureText)
    const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: "1", FORCE_COLOR: "0" }
    const tool = spawnSync(
      process.execPath,
      [join(repo, "scripts/cv.mjs"), "snapshot", "--root", dir],
      { cwd: dir, encoding: "utf8", env },
    )
    const module = await readFile(join(dir, SNAPSHOT_MODULE), "utf8")
    // From here on the raw file does not exist, as on a build server.
    await rm(join(dir, "cv"), { recursive: true })
    const probe = spawnSync(
      process.execPath,
      [
        "--input-type=module",
        "-e",
        `const { siteRecords, cvProjection } = await import(${json(join(dir, "src/records/index.ts"))})
         const { siteCv } = await import(${json(join(dir, "src/cv/site.ts"))})
         const cv = cvProjection(siteRecords, siteCv.ownerId)
         console.log(JSON.stringify({ records: siteRecords.byId.size, version: siteCv.version, publications: cv.publications.length, name: cv.person.name }))`,
      ],
      { cwd: dir, encoding: "utf8", env },
    )
    const build = spawnSync(
      process.execPath,
      [join(repo, "node_modules/astro/bin/astro.mjs"), "build", "--root", dir],
      { cwd: dir, encoding: "utf8", env },
    )
    const out = join(dir, "dist")
    const files = (await listFiles(out).catch(() => [])).map((f) => relative(out, f))
    const text = new Map()
    for (const file of files.filter((f) => TEXT_FILE.test(f)))
      text.set(file, await readFile(join(out, file), "utf8"))
    return { tool, module, probe, build, files, text }
  } finally {
    await unlink(join(dir, "node_modules")).catch(() => {})
    await rm(dir, { recursive: true, force: true })
  }
}
const built = await buildWithSnapshot()

await test(
  "CV-017",
  "The site builds from an approved snapshot, without the raw CV",
  (check) => {
    check(built.tool.status === 0, `the snapshot command failed: ${built.tool.stderr}`)
    check(
      built.module.includes("GENERATED: never edit this file by hand") &&
        built.module.includes("export const CV_SNAPSHOT: CvSnapshot | null = {"),
      "the snapshot module is not the generated one",
    )
    check(
      built.module.includes(sha256(fixtureText)) &&
        built.module.includes('version: "9.9.0"'),
      "the snapshot does not name its source version and fingerprint",
    )
    for (const marker of PRIVATE_MARKERS)
      check(!built.module.includes(marker), `"${marker}" is in the snapshot module`)
    check(
      !/\{\{[^{}\n]*\}\}/.test(built.module),
      "a placeholder is in the snapshot module",
    )
    check(
      built.probe.status === 0,
      `the site's records do not load: ${built.probe.stderr}`,
    )
    const seen = JSON.parse(built.probe.stdout || "{}")
    check(
      json(seen) ===
        json({
          records: derived.length,
          version: "9.9.0",
          publications: 6,
          name: "Pessoa Sintética (fixture)",
        }),
      `without the raw file the site has ${json(seen)}`,
    )
    check(
      built.build.status === 0,
      `the build failed: ${built.build.stderr.slice(-600)}`,
    )
    const pages = built.files.filter((f) => f.endsWith(".html"))
    const site = pages.filter(
      (f) => !f.startsWith("_design/editorial/") && !f.startsWith("_design/quarto/"),
    )
    check(site.length === 40, `${site.length} pages: a record made or lost a page`)
    for (const [file, text] of built.text) {
      for (const marker of PRIVATE_MARKERS)
        check(!text.includes(marker), `"${marker}" is in ${file}`)
      check(!/\{\{[A-Z0-9_]+\}\}/.test(text), `a placeholder is in ${file}`)
    }
    check(!built.files.some((f) => /\.ya?ml$/.test(f)), "a YAML file is in the build")
    // Refusal leaves the module as it was, and says why.
    check(
      /Wrote src\/data\/cv\/snapshot\.ts from cv\/CV-v9\.9\.yaml/.test(
        built.tool.stdout,
      ),
      built.tool.stdout,
    )
  },
)

await test(
  "CV-018",
  "No CV source reaches client-side code or public files",
  async (check, note) => {
    check(distText.size > 40, "dist/ was not read: build first")
    // Only the tool's side may load the parser or the adapter.
    const toolSide = ["src/cv/source.ts", "src/cv/adapter.ts"]
    for (const file of await listFiles(join(repo, "src"))) {
      const name = relative(repo, file)
      if (toolSide.includes(name) || !/\.(?:ts|mjs|js|astro)$/.test(name)) continue
      const text = await readFile(file, "utf8")
      check(
        !/from\s+["'](?:yaml|[^"']*cv\/(?:source|adapter)\.ts)["']|import\(\s*["'](?:yaml|[^"']*cv\/(?:source|adapter))/.test(
          text,
        ),
        `${name} loads the CV parser or adapter`,
      )
      // Outside the integration itself, nothing even names a CV file.
      if (!name.startsWith("src/cv/") && !name.startsWith("src/data/cv/"))
        check(
          !/codex-yaml|CV\.proposta|\.ya?ml\b/.test(text),
          `${name} names a CV file`,
        )
    }
    for (const dir of ["public", "dist"])
      for (const file of await listFiles(join(repo, dir)).catch(() => []))
        check(
          !/\.ya?ml$|CV[-.]|curriculum/i.test(relative(repo, file).split("/").at(-1)),
          `${relative(repo, file)} looks like a CV file`,
        )
    for (const [file, text] of distText) {
      check(!/\{\{[A-Z0-9_]+\}\}/.test(text), `a placeholder is in dist/${file}`)
      check(
        !/modelo_sem_vinculos|fonte_de_verdade|placeholders_pendentes|identidade_profissional|formacao_academica/.test(
          text,
        ),
        `a field name of the CV is in dist/${file}`,
      )
      for (const marker of PRIVATE_MARKERS)
        check(!text.includes(marker), `"${marker}" is in dist/${file}`)
    }
    if (realText === null) {
      note(
        "the private working file is not on this machine: checked by name and on the fixture",
      )
      return
    }
    // Every longer text of the real file, and its email and telephone whatever their
    // length: none is anywhere in dist/. Nothing of them is printed.
    const real = parseCvSource(realText).document
    const needles = new Set()
    const collect = (value) => {
      if (typeof value === "string") {
        if (value.trim().length >= 30) needles.add(value.trim())
      } else if (Array.isArray(value)) value.forEach(collect)
      else if (value !== null && typeof value === "object")
        Object.values(value).forEach(collect)
    }
    collect(real)
    for (const key of ["email", "telefone"])
      if (typeof real.contato?.[key] === "string") needles.add(real.contato[key].trim())
    for (const person of real.referencias?.pessoas ?? [])
      for (const key of ["nome", "email_historico"])
        if (typeof person?.[key] === "string" && person[key].trim().length >= 8)
          needles.add(person[key].trim())
    let leaks = 0
    for (const text of distText.values())
      for (const needle of needles) if (text.includes(needle)) leaks++
    check(leaks === 0, `${leaks} text(s) of the working file are in dist/`)
    note(
      `${needles.size} texts of the working file searched for in ${distText.size} built files: none found`,
    )
  },
)

await test(
  "CV-019",
  "The Chromatic Archive and the folders are unchanged",
  async (check) => {
    check(siteNavigation.sections.length === 11, "the global row changed")
    check(
      json([...new Set(siteNavigation.sections.map((s) => s.category))]) ===
        json(["core", "research", "blog-notes", "writing", "bearnard"]),
      "the categories changed",
    )
    for (const dir of [
      "src/navigation",
      "src/styles",
      "src/components",
      "src/layouts",
      "src/scripts",
      "src/pages",
    ])
      for (const file of await listFiles(join(repo, dir)))
        check(
          !/["'/]cv\/(?:source|adapter|manifest|snapshot|site)|data\/cv\//.test(
            await readFile(file, "utf8"),
          ),
          `${relative(repo, file)} depends on the CV integration`,
        )
    const tokens = await readFile(join(repo, "src/styles/tokens.css"), "utf8")
    for (const colour of ["#29282c", "#275b52", "#26313b"])
      check(
        tokens.toLowerCase().includes(colour),
        `the shared colour ${colour} is gone`,
      )
    const categories = await readFile(join(repo, "src/styles/categories.css"), "utf8")
    for (const category of ["core", "research", "blog-notes", "writing", "bearnard"])
      check(
        categories.includes(`[data-category="${category}"]`),
        `the ${category} palette is gone`,
      )
    // The built site with a snapshot has the same pages as the site without one.
    const now = [...distText.keys()].filter((f) => f.endsWith(".html")).sort()
    const withSnapshot = built.files.filter((f) => f.endsWith(".html")).sort()
    check(json(now) === json(withSnapshot), "CV data changes which pages exist")
    check(
      built.text.get("index.html") === distText.get("index.html") &&
        built.text.get("cv/index.html") === distText.get("cv/index.html"),
      "CV data changes a folder page before any page is built to show it",
    )
  },
)

await test(
  "CV-020",
  "The raw CV is not tracked, formatted or served",
  async (check, note) => {
    const git = spawnSync("git", ["ls-files", "cv"], { cwd: repo, encoding: "utf8" })
    if (git.status !== 0) {
      note("not a Git checkout: tracking not checked")
    } else {
      // What may be public in cv/: the selection, the identities and this folder's notes.
      const allowed = [
        "cv/README.md",
        "cv/cv.md",
        "cv/identities.json",
        "cv/manifest.json",
        "cv/template.tex",
      ]
      const tracked = git.stdout.split("\n").filter(Boolean)
      check(
        tracked.every((f) => allowed.includes(f)),
        `tracked in cv/: ${json(tracked.filter((f) => !allowed.includes(f)))}. The repository is public: a CV file may be committed only by the owner's recorded decision`,
      )
      for (const path of [
        "cv/codex-yaml/CV.proposta.yaml",
        "cv/CV-v1.0.yaml",
        "cv/CV.proposta.yaml",
        "cv/codex-yaml/anything.docx",
      ]) {
        const ignored = spawnSync("git", ["check-ignore", "-q", path], { cwd: repo })
        check(ignored.status === 0, `${path} is not ignored by Git`)
      }
      for (const path of ["cv/manifest.json", "cv/identities.json", "cv/README.md"]) {
        const ignored = spawnSync("git", ["check-ignore", "-q", path], { cwd: repo })
        check(ignored.status === 1, `${path} is ignored by Git`)
      }
    }
    const prettier = await readFile(join(repo, ".prettierignore"), "utf8")
    check(
      /^cv\/\*\*\/\*\.yaml$/m.test(prettier) && /^cv\/codex-yaml\/$/m.test(prettier),
      "the formatter may rewrite a CV file",
    )
    const scripts = JSON.parse(
      await readFile(join(repo, "package.json"), "utf8"),
    ).scripts
    check(
      scripts["cv:check"] === "node scripts/cv.mjs check",
      "npm run cv:check is missing",
    )
    check(
      scripts["cv:snapshot"] === "node scripts/cv.mjs snapshot",
      "npm run cv:snapshot is missing",
    )
    check(
      !/cv\.mjs/.test(`${scripts.build} ${scripts.dev} ${scripts.verify}`),
      "a build runs the CV tool",
    )
  },
)

// --- Report -------------------------------------------------------------------------------

let failed = 0
for (const { id, title, failures, notes } of results) {
  if (failures.length === 0) console.log(`PASS ${id} ${title}`)
  else {
    failed++
    console.error(`FAIL ${id} ${title}`)
    for (const message of failures.slice(0, 12)) console.error(`  - ${message}`)
  }
  for (const message of notes) console.log(`     note: ${message}`)
}
if (failed > 0) process.exit(1)
console.log(
  `PASS: ${results.length} CV checks; ${derived.length} synthetic records derived from the fixture, ` +
    `${CV_SNAPSHOT === null ? "no" : "a"} public snapshot, 1 throwaway build`,
)
