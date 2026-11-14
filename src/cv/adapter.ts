/**
 * The read-only adapter (P11-A01, D-091, D-092): from the author's CV, as written, to the
 * canonical record families of P11. The CV stays the only place where the owner's
 * professional history is written; the records this returns are derived, never edited.
 *
 * It is also the publication layer (layer B). What may leave the CV is an allowlist: the
 * fields named in the builders below, and nothing else. A field that is not named here is
 * not read. In particular the adapter never reads:
 * - the private sections (letters, statements, references, plans, open questions);
 * - writing templates (`modelo_sem_vinculos`, `texto_sem_vinculos`);
 * - internal source notes (`fonte`, `fonte_identificador`), which name private documents;
 * - an email address, a telephone number or a location;
 * - the names and grades of people mentored, amounts of money, and the titles of
 *   proposals reviewed in confidence.
 *
 * Nothing is invented and nothing is repaired:
 * - an unresolved placeholder leaves its field out; when the field is one a record cannot
 *   do without, the record is left out, and said so;
 * - an unknown end is no end: it is never "present";
 * - a text is kept whole, as written: an author line is not split, a co-first-author
 *   asterisk and its note are kept, an institution is not taken apart;
 * - a record marked as a draft (`situacao: Rascunho…`) is left out;
 * - a record with no identity in cv/identities.json is left out: an ID is assigned by
 *   hand, never derived from a position or a title.
 *
 * A pure function of plain data: it reads no file and changes none of its input.
 */
import { isPartialDate } from "../records/dates.ts"
import {
  FAMILIES,
  RECORD_ID_PATTERN,
  SCHEMAS,
  familyOfId,
  isOrcid,
} from "../records/schema.ts"
import type { Family, RecordsInput } from "../records/schema.ts"
import type { CvApproval, CvIdentities, PublicContactField } from "./manifest.ts"
import type { CvProfile } from "./snapshot.ts"
import {
  RECORD_LISTS,
  at,
  hasPlaceholder,
  identityKey,
  isMapping,
  recordsOf,
} from "./source.ts"
import type { Mapping, RecordList, SourceRecord } from "./source.ts"

export interface AdaptOptions {
  readonly identities: CvIdentities
  /**
   * The owner's approval of this version. With it, records are public and verified;
   * without it they are hidden and unreviewed, for the author's own preview only.
   */
  readonly approval?: Pick<CvApproval, "version" | "approvedOn" | "contact">
  /** The projects the site describes itself: the only ones the CV may relate outputs to. */
  readonly siteProjectIds?: readonly string[]
}

/** Something left out, and why. `where` is `<list>/<source id>`, optionally `.<field>`. */
export interface Omission {
  readonly where: string
  readonly reason: string
}

export interface Adaptation {
  readonly records: RecordsInput
  /** The owner's profile; null when the owner has no identity yet. */
  readonly profile: CvProfile | null
  /** Records left out whole. */
  readonly excluded: Omission[]
  /** Fields left out of records that were kept. */
  readonly omitted: Omission[]
}

// --- Identities ---------------------------------------------------------------------------

/** Problems in the identity map; `stale` lists identities whose record is not in the CV. */
export function identityIssues(
  identities: CvIdentities,
  document?: Mapping,
): { errors: string[]; stale: string[] } {
  const errors: string[] = []
  const stale: string[] = []
  if (!isMapping(identities) || !isMapping(identities.records))
    return { errors: ["identities must be { owner, records }"], stale }
  if (identities.owner !== null && familyOfId(String(identities.owner)) !== "people")
    errors.push('owner must be null or a person ID ("person-…")')
  const seen = new Map<string, string>()
  if (identities.owner !== null) seen.set(identities.owner, "owner")
  for (const [key, id] of Object.entries(identities.records)) {
    const [listKey = "", ...rest] = key.split("/")
    const sourceId = rest.join("/")
    const list = RECORD_LISTS.find((l) => l.key === listKey)
    if (list === undefined || sourceId === "") {
      errors.push(`"${key}" does not name a record list and a source identifier`)
      continue
    }
    if (
      typeof id !== "string" ||
      !RECORD_ID_PATTERN.test(id) ||
      familyOfId(id) !== list.family
    )
      errors.push(`${key}: "${id}" is not a ${FAMILIES[list.family]} ID`)
    else if (seen.has(id))
      errors.push(`${id} is given to ${seen.get(id)} and to ${key}`)
    else seen.set(id, key)
    if (
      document !== undefined &&
      !recordsOf(document, list).some((r) => r.sourceId === sourceId)
    )
      stale.push(key)
  }
  return { errors, stale }
}

// --- Reading fields -----------------------------------------------------------------------

interface Reader {
  /** A text that is written and resolved; undefined otherwise, with a note if unresolved. */
  text(field: string): string | undefined
  /** The same, for a field the record cannot do without. */
  need(field: string): string | undefined
  date(field: string): string | undefined
  period(field?: string): { start?: string; end?: string } | undefined
  readonly missing: string[]
}

function reader(data: Mapping, note: (field: string, reason: string) => void): Reader {
  const usable = (value: unknown, field: string): string | undefined => {
    if (value === undefined || value === null) return undefined
    if (typeof value !== "string" && typeof value !== "number") {
      note(field, "is not a text")
      return undefined
    }
    const text = String(value).trim()
    if (text === "") return undefined
    if (hasPlaceholder(text)) {
      note(field, "is unresolved")
      return undefined
    }
    return text
  }
  const dateOf = (value: unknown, field: string): string | undefined => {
    const text = usable(value, field)
    if (text === undefined) return undefined
    if (!isPartialDate(text)) {
      note(field, "is not a date (YYYY, YYYY-MM or YYYY-MM-DD)")
      return undefined
    }
    return text
  }
  const missing: string[] = []
  return {
    missing,
    text: (field) => usable(data[field], field),
    need(field) {
      const value = usable(data[field], field)
      if (value === undefined) missing.push(field)
      return value
    },
    date: (field) => dateOf(data[field], field),
    period(field = "periodo") {
      const value = data[field]
      if (!isMapping(value)) return undefined
      const start = dateOf(value.inicio, `${field}.inicio`)
      // An end that is not written, or not resolved, is no end. It is never "present".
      const end = dateOf(value.fim, `${field}.fim`)
      if (start === undefined && end === undefined) return undefined
      return {
        ...(start === undefined ? {} : { start }),
        ...(end === undefined ? {} : { end }),
      }
    },
  }
}

/** A single day as a period, so that dated service sits with service that has a period. */
const dayAsPeriod = (date: string | undefined) =>
  date === undefined ? undefined : { start: date, end: date }

const EDUCATION_LEVELS: [RegExp, string][] = [
  [/^doutorado/i, "doctorate"],
  [/^mestrado/i, "masters"],
  [/^(?:bacharelado|licenciatura|gradua[cç][aã]o)/i, "undergraduate"],
]
const MENTORING_LEVELS: [RegExp, string][] = [
  [/^p[oó]s-?doutorado/i, "postdoctoral"],
  [/^doutorado/i, "doctorate"],
  [/^mestrado/i, "masters"],
  [/^(?:gradua[cç][aã]o|inicia[cç][aã]o cient[ií]fica|bacharelado)/i, "undergraduate"],
]
const levelFrom = (table: [RegExp, string][], text: string | undefined) =>
  text === undefined ? undefined : table.find(([pattern]) => pattern.test(text))?.[1]

// --- The allowlist: one builder per list of the CV -----------------------------------------

type Builder = (r: Reader, data: Mapping) => Mapping

const appointment =
  (type: string, institutionField = "instituicao_e_local"): Builder =>
  (r, data) => ({
    type,
    title: r.need("cargo"),
    institution: r.need(institutionField),
    department: r.text("departamento_e_regime"),
    period: r.period(),
    // A list of responsibilities is not one text: it is left for a deliberate mapping.
    summary:
      typeof data.responsabilidades === "string"
        ? r.text("responsabilidades")
        : undefined,
  })

const publication =
  (type: string, status: string): Builder =>
  (r) => {
    const identifier = r.text("doi_ou_url")
    return {
      type,
      status,
      title: r.need("titulo"),
      // The author line as printed: order, initials and co-first-author marks included.
      authorsText: r.need("autores"),
      authorshipNote: r.text("nota_autoria"),
      details: r.text("veiculo_e_detalhes"),
      date: r.date("ano"),
      ...(identifier === undefined
        ? {}
        : /^(?:https?:\/\/(?:dx\.)?doi\.org\/|doi:\s*)?10\.\d{4,9}\//i.test(identifier)
          ? { doi: identifier }
          : { url: identifier }),
    }
  }

const service =
  (serviceType: string, more: (r: Reader) => Mapping = () => ({})): Builder =>
  (r, data) => ({
    type: "service",
    serviceType,
    role: r.need("atividade" in data ? "atividade" : "funcao"),
    context: r.text("instituicao"),
    period: "periodo" in data ? r.period() : dayAsPeriod(r.date("data")),
    ...more(r),
  })

const recognition =
  (type: "award" | "funding"): Builder =>
  (r) => ({
    type,
    name: r.need("tipo"),
    grantor: r.text("instituicao"),
    topic: r.text("tema"),
    date: r.date("data"),
  })

const BUILDERS: Record<string, Builder> = {
  formacao_academica: (r, data) => {
    const period = r.period()
    return {
      qualification: r.need("grau"),
      level:
        levelFrom(
          EDUCATION_LEVELS,
          typeof data.grau === "string" ? data.grau : undefined,
        ) ?? "other",
      institution: r.text("instituicao_e_local"),
      supervision: r.text("supervisao"),
      // The status is not stated in the CV, so it is not stated here: the dates are the
      // period as written.
      startDate: period?.start,
      completionDate: period?.end,
      thesisTitle: r.text("titulo_trabalho"),
    }
  },
  "experiencia_profissional.academica_e_pesquisa": appointment("academic"),
  "experiencia_profissional.consultoria_industrial_documentada":
    appointment("consulting"),
  "experiencia_profissional.industria": appointment("employment", "empresa"),
  "publicacoes.artigos": publication("journal-article", "published"),
  "publicacoes.anais_completos": publication("conference-paper", "published"),
  "publicacoes.resumos_em_anais": publication("conference-abstract", "published"),
  "publicacoes.capitulos": publication("book-chapter", "published"),
  "publicacoes.preprints": publication("preprint", "preprint"),
  "apresentacoes_e_eventos.palestras": (r) => ({
    type: "presentation",
    title: r.need("descricao"),
    date: r.date("data"),
  }),
  "apresentacoes_e_eventos.participacoes": (r) => ({
    type: "participation",
    event: r.need("descricao"),
    period: r.period(),
  }),
  financiamentos_e_grants: recognition("funding"),
  premios_e_honrarias: recognition("award"),
  experiencia_docente: (r) => ({
    type: "teaching",
    title: r.need("disciplina_e_codigo"),
    context: r.text("atividade_e_instituicao"),
    period: r.period(),
    duration: r.text("semestres"),
  }),
  // The person mentored and their grade are theirs: neither is read.
  "mentoria_e_orientacao.registros": (r, data) => ({
    type: "mentoring",
    level: levelFrom(
      MENTORING_LEVELS,
      typeof data.nivel === "string" ? data.nivel : undefined,
    ),
    topic: r.text("tema"),
    context: r.text("instituicao"),
    period: r.period(),
  }),
  "servico_e_lideranca.administracao": service("administration"),
  "servico_e_lideranca.bancas_academicas": service("examination", (r) => ({
    subject: r.text("titulo"),
  })),
  // The title of a proposal reviewed is not read: reviews are made in confidence.
  "servico_e_lideranca.avaliacao_de_projetos": service("review"),
  "servico_e_lideranca.revisao_por_pares": service("review"),
  "servico_e_lideranca.organizacao_de_eventos": service("organizing"),
  extensao: (r) => ({
    type: "outreach",
    title: r.need("projeto"),
    context: r.text("atividade_e_instituicao"),
    period: r.period(),
  }),
  formacao_complementar: (r) => ({
    type: "training",
    title: r.need("curso_carga_e_instituicao"),
    period: r.period(),
  }),
  certificacoes: (r) => {
    const credential = r.text("credencial")
    return {
      type: "certification",
      name: r.need("nome"),
      issuer: r.text("emissor"),
      date: r.date("data"),
      ...(credential !== undefined && /^https?:\/\//.test(credential)
        ? { url: credential }
        : {}),
    }
  },
}

const CONTACT_LABELS: Record<Exclude<PublicContactField, "orcid">, string> = {
  lattes: "Lattes",
  linkedin: "LinkedIn",
  github: "GitHub",
  google_scholar: "Google Scholar",
  site: "Website",
  researchgate: "ResearchGate",
}

const clean = (value: Mapping): Mapping =>
  Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined))

const strings = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.flatMap((x) =>
        typeof x === "string" && x.trim() !== "" && !hasPlaceholder(x)
          ? [x.trim()]
          : [],
      )
    : []

// --- The adapter --------------------------------------------------------------------------

export function adaptCv(document: Mapping, options: AdaptOptions): Adaptation {
  const { identities, approval } = options
  const excluded: Omission[] = []
  const omitted: Omission[] = []
  const records: Record<Family, Mapping[]> = {
    people: [],
    organizations: [],
    researchAreas: [],
    projects: [],
    publications: [],
    appointments: [],
    education: [],
    activities: [],
  }
  // Every record below is checked against its family's schema before it is kept, so the
  // lists have the shapes of RecordsInput.
  const output = records as unknown as RecordsInput
  const empty = (): Adaptation => ({
    records: output,
    profile: null,
    excluded,
    omitted,
  })

  const owner = identities.owner
  if (owner === null) {
    excluded.push({
      where: "identidade_profissional",
      reason:
        "the owner has no person ID yet (cv/identities.json): nothing can be projected",
    })
    return empty()
  }
  const base = (list: string, sourceId?: string) => ({
    visibility: approval === undefined ? "hidden" : "public",
    provenance: clean({
      status: approval === undefined ? "unreviewed" : "verified",
      source:
        approval === undefined
          ? `CV working file, not approved · ${list}`
          : `CV ${approval.version} · ${list}`,
      sourceId,
      reviewedAt: approval?.approvedOn,
    }),
  })

  // --- The owner ---
  const identity = isMapping(document.identidade_profissional)
    ? document.identidade_profissional
    : {}
  const contact = isMapping(document.contato) ? document.contato : {}
  const who = reader(identity, (field, reason) =>
    omitted.push({ where: `identidade_profissional.${field}`, reason }),
  )
  const name = who.need("nome")
  if (name === undefined) {
    excluded.push({
      where: "identidade_profissional",
      reason: "nome is unresolved or missing: nothing can be projected",
    })
    return empty()
  }
  const released = approval?.contact ?? []
  const how = reader(contact, (field, reason) =>
    omitted.push({ where: `contato.${field}`, reason }),
  )
  const links: { label: string; url: string }[] = []
  let orcid: string | undefined
  for (const field of released) {
    const value = how.text(field)
    if (value === undefined) continue
    if (field === "orcid") {
      const id = value.replace(/^https?:\/\/orcid\.org\//i, "")
      if (isOrcid(id)) orcid = id
      else omitted.push({ where: "contato.orcid", reason: "is not a valid ORCID iD" })
    } else if (/^https?:\/\/[^\s/]+\.[^\s]+$/.test(value)) {
      links.push({ label: CONTACT_LABELS[field], url: value })
    } else {
      omitted.push({
        where: `contato.${field}`,
        reason: "is not an absolute http(s) URL",
      })
    }
  }
  const title = who.text("titulo_profissional")
  const summary = who.text("resumo")
  const person = clean({
    id: owner,
    ...base("identidade_profissional"),
    displayName: name,
    professionalTitle: title,
    shortBiography: summary,
    orcid,
    links,
  })
  const checkedPerson = SCHEMAS.people.safeParse(person)
  if (!checkedPerson.success) {
    excluded.push({
      where: "identidade_profissional",
      reason: checkedPerson.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; "),
    })
    return empty()
  }
  records.people.push(person)

  // --- Software: relationships to projects the site describes, never a second project ---
  const projectsOfOutput = new Map<string, string[]>()
  const softwareList = RECORD_LISTS.find(
    (l) => l.key === "software_e_metodos",
  ) as RecordList
  for (const record of recordsOf(document, softwareList)) {
    const where = `${softwareList.key}/${record.sourceId ?? `[${record.index}]`}`
    if (record.sourceId === undefined) {
      excluded.push({ where, reason: "has no name" })
      continue
    }
    const projectId = identities.records[identityKey(softwareList, record.sourceId)]
    if (projectId === undefined) {
      excluded.push({ where, reason: "has no project ID in cv/identities.json" })
      continue
    }
    if (!(options.siteProjectIds ?? []).includes(projectId)) {
      excluded.push({
        where,
        reason: `the site has no project ${projectId}: the CV relates outputs to a project, it does not describe one`,
      })
      continue
    }
    for (const evidence of strings(record.data.evidencia)) {
      projectsOfOutput.set(evidence, [
        ...(projectsOfOutput.get(evidence) ?? []),
        projectId,
      ])
    }
  }

  // --- Every other list ---
  const taken = new Set<string>([owner])
  for (const list of RECORD_LISTS) {
    const build = BUILDERS[list.key]
    if (build === undefined) continue
    for (const record of recordsOf(document, list) as SourceRecord[]) {
      const where = `${list.key}/${record.sourceId ?? `[${record.index}]`}`
      const situation = record.data.situacao
      if (typeof situation === "string" && /^\s*rascunho/i.test(situation)) {
        excluded.push({ where, reason: "is marked as a draft (situacao)" })
        continue
      }
      if (record.sourceId === undefined) {
        excluded.push({ where, reason: "has no identifier in the CV" })
        continue
      }
      const id = identities.records[identityKey(list, record.sourceId)]
      if (id === undefined) {
        excluded.push({ where, reason: "has no record ID in cv/identities.json" })
        continue
      }
      if (taken.has(id)) {
        excluded.push({ where, reason: `${id} is already given to another record` })
        continue
      }
      const notes: Omission[] = []
      const read = reader(record.data, (field, reason) =>
        notes.push({ where: `${where}.${field}`, reason }),
      )
      const built = build(read, record.data)
      if (read.missing.length > 0) {
        excluded.push({
          where,
          reason: `${read.missing.join(", ")} ${read.missing.length === 1 ? "is" : "are"} unresolved or missing`,
        })
        continue
      }
      const candidate = clean({
        id,
        ...base(list.key, record.sourceId),
        ...(list.family === "publications"
          ? {
              creditedTo: [owner],
              ...(projectsOfOutput.has(record.sourceId)
                ? { projectIds: [...new Set(projectsOfOutput.get(record.sourceId))] }
                : {}),
            }
          : { personId: owner }),
        ...built,
      })
      const checked = SCHEMAS[list.family].safeParse(candidate)
      if (!checked.success) {
        excluded.push({
          where,
          reason: checked.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        })
        continue
      }
      taken.add(id)
      omitted.push(...notes)
      records[list.family].push(candidate)
    }
  }

  // --- The profile ---
  const skills = isMapping(document.habilidades_tecnicas)
    ? document.habilidades_tecnicas
    : {}
  const groups: { group: string; items: string[] }[] = []
  const research = strings(at(skills, ["pesquisa", "metodos"]))
  if (research.length > 0) groups.push({ group: "pesquisa.metodos", items: research })
  const industry = Array.isArray(skills.industria)
    ? strings(skills.industria.map((x) => (isMapping(x) ? x.competencia : undefined)))
    : []
  if (industry.length > 0) groups.push({ group: "industria", items: industry })
  // Groups the author still marks as to be classified or confirmed are not skills yet.
  for (const key of Object.keys(skills)) {
    if (/_a_(?:classificar|confirmar)$/.test(key))
      omitted.push({
        where: `habilidades_tecnicas.${key}`,
        reason: "is still to be confirmed",
      })
  }
  const international = who.text("nome_exterior")
  const language = at(document, ["metadados", "idioma"])
  const profile: CvProfile = {
    personId: owner,
    ...(typeof language === "string" && language.trim() !== ""
      ? { language: language.trim() }
      : {}),
    name,
    ...(international === undefined || international === name
      ? {}
      : { internationalName: international }),
    ...(title === undefined ? {} : { title }),
    ...(summary === undefined ? {} : { summary }),
    expertise: strings(identity.areas_de_especialidade),
    keywords: strings(identity.palavras_chave),
    languages: Array.isArray(identity.idiomas)
      ? identity.idiomas.flatMap((entry) => {
          if (!isMapping(entry)) return []
          const [spoken] = strings([entry.idioma])
          const [proficiency] = strings([entry.proficiencia])
          return spoken === undefined
            ? []
            : [
                {
                  language: spoken,
                  ...(proficiency === undefined ? {} : { proficiency }),
                },
              ]
        })
      : [],
    skills: groups,
  }
  return { records: output, profile, excluded, omitted }
}
