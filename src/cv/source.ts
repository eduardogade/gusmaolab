/**
 * The author's CV, as written (P11-A01, D-089, D-090): reading the versioned YAML file
 * that is the source of truth for the owner's professional history, and checking that it
 * can be understood. This is the authoring layer. It never decides what may be published
 * (adapter.ts and manifest.ts do), and it never changes the file: it only reads text.
 *
 * The file keeps its own shape and its Portuguese field names. This module adapts to it:
 * the names below are the author's, not ours.
 *
 * Unresolved placeholders (`{{EXP_1_FIM}}`) are a normal part of a draft. Here they are
 * counted, never reported as errors and never replaced.
 *
 * FOR THE CV TOOL AND ITS TESTS ONLY. This is the one module that imports the YAML
 * parser; no page, component or record module may import it (tests/cv.mjs, CV-018). The
 * site reads the generated public snapshot instead (snapshot.ts).
 */
import { parseDocument } from "yaml"
import type { Family } from "../records/schema.ts"
import { fileNameVersion, versionsAgree } from "./versions.ts"

// --- Placeholders -------------------------------------------------------------------------

const PLACEHOLDER = /\{\{[^{}]*\}\}/

/** True for a text that still holds a `{{MARKER}}` the author has not resolved. */
export const hasPlaceholder = (value: unknown): boolean =>
  typeof value === "string" && PLACEHOLDER.test(value)

/** How many `{{MARKER}}` occurrences a text holds. */
export const countPlaceholders = (text: string): number =>
  (text.match(/\{\{[^{}]*\}\}/g) ?? []).length

// --- Sections -----------------------------------------------------------------------------

/**
 * The top-level sections the author's file has, and what each is to the website:
 * - meta: about the document itself;
 * - projected: facts that an approved version may present, through the adapter's
 *   allowlist;
 * - private: authoring material (letters, statements, references, plans, the inventory of
 *   open questions). The adapter never reads these, whatever they hold.
 */
export const SECTIONS = {
  metadados: "meta",
  identidade_profissional: "projected",
  contato: "projected",
  formacao_academica: "projected",
  experiencia_profissional: "projected",
  publicacoes: "projected",
  apresentacoes_e_eventos: "projected",
  financiamentos_e_grants: "projected",
  premios_e_honrarias: "projected",
  experiencia_docente: "projected",
  mentoria_e_orientacao: "projected",
  servico_e_lideranca: "projected",
  extensao: "projected",
  formacao_complementar: "projected",
  habilidades_tecnicas: "projected",
  software_e_metodos: "projected",
  certificacoes: "projected",
  declaracoes: "private",
  cartas_de_apresentacao: "private",
  referencias: "private",
  topicos_master_sugeridos: "private",
  placeholders_pendentes: "private",
} as const

export type SectionName = keyof typeof SECTIONS
export const SECTION_NAMES = Object.keys(SECTIONS) as SectionName[]
export const PRIVATE_SECTIONS = SECTION_NAMES.filter((n) => SECTIONS[n] === "private")

/**
 * Every list of records in the file: where it is, which record family it feeds, and the
 * field that identifies a record within it. `key` names the list in the identity map
 * (cv/identities.json) and in a record's provenance.
 */
export interface RecordList {
  readonly key: string
  readonly path: readonly string[]
  readonly family: Family
  /** The field holding the source identifier: `id`, or `nome` where records are named. */
  readonly idField: "id" | "nome"
}

const list = (
  key: string,
  family: Family,
  idField: RecordList["idField"] = "id",
): RecordList => ({ key, path: key.split("."), family, idField })

export const RECORD_LISTS: readonly RecordList[] = [
  list("formacao_academica", "education"),
  list("experiencia_profissional.academica_e_pesquisa", "appointments"),
  list("experiencia_profissional.consultoria_industrial_documentada", "appointments"),
  list("experiencia_profissional.industria", "appointments"),
  list("publicacoes.artigos", "publications"),
  list("publicacoes.anais_completos", "publications"),
  list("publicacoes.resumos_em_anais", "publications"),
  list("publicacoes.capitulos", "publications"),
  list("publicacoes.preprints", "publications"),
  list("apresentacoes_e_eventos.palestras", "activities"),
  list("apresentacoes_e_eventos.participacoes", "activities"),
  list("financiamentos_e_grants", "activities"),
  list("premios_e_honrarias", "activities"),
  list("experiencia_docente", "activities"),
  list("mentoria_e_orientacao.registros", "activities"),
  list("servico_e_lideranca.administracao", "activities"),
  list("servico_e_lideranca.bancas_academicas", "activities"),
  list("servico_e_lideranca.avaliacao_de_projetos", "activities"),
  list("servico_e_lideranca.revisao_por_pares", "activities"),
  list("servico_e_lideranca.organizacao_de_eventos", "activities"),
  list("extensao", "activities"),
  list("formacao_complementar", "activities"),
  list("certificacoes", "activities"),
  // Software names a project the website already describes: it yields relationships,
  // never a second description of the project (adapter.ts).
  list("software_e_metodos", "projects", "nome"),
]

// --- Reading ------------------------------------------------------------------------------

export type Mapping = Record<string, unknown>

export const isMapping = (value: unknown): value is Mapping =>
  value !== null && typeof value === "object" && !Array.isArray(value)

export class CvSourceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CvSourceError"
  }
}

/** The author's document, parsed. Plain data: nothing here points back at the file. */
export interface CvSource {
  readonly document: Mapping
  /**
   * `metadados.versao` exactly as typed. Read from the text, because a parser turns an
   * unquoted `1.0` into the number 1.
   */
  readonly version: string | undefined
  readonly placeholders: number
}

/**
 * Parses the text of a CV file. Throws only when the text is not YAML or is not a mapping
 * of sections: everything else is for `authoringIssues` to describe. Dates stay text, as
 * the file's own rules say ("Datas ISO são textos").
 */
export function parseCvSource(text: string): CvSource {
  const parsed = parseDocument(text, { prettyErrors: true })
  if (parsed.errors.length > 0) {
    throw new CvSourceError(
      `the CV file is not valid YAML: ${parsed.errors.map((e) => e.message).join("; ")}`,
    )
  }
  const document: unknown = parsed.toJS()
  if (!isMapping(document)) {
    throw new CvSourceError("the CV file must be a mapping of sections")
  }
  const node = parsed.getIn(["metadados", "versao"], true) as
    | { source?: unknown; value?: unknown }
    | undefined
  const raw = node?.source ?? node?.value
  const version =
    typeof raw === "string" || typeof raw === "number" ? String(raw).trim() : undefined
  return {
    document,
    ...(version === undefined || version === "" ? { version: undefined } : { version }),
    placeholders: countPlaceholders(text),
  }
}

/** The value at a path of keys, or undefined. */
export function at(document: Mapping, path: readonly string[]): unknown {
  let value: unknown = document
  for (const key of path) {
    if (!isMapping(value)) return undefined
    value = value[key]
  }
  return value
}

/** One record of a list, with where it came from. */
export interface SourceRecord {
  readonly list: RecordList
  /** Its position in the list: for messages only, never an identity. */
  readonly index: number
  /** Its identifier in the document, exactly as written; undefined when it has none. */
  readonly sourceId: string | undefined
  readonly data: Mapping
}

/** The records of one list, in the order written. A missing list has no records. */
export function recordsOf(document: Mapping, recordList: RecordList): SourceRecord[] {
  const value = at(document, recordList.path)
  if (!Array.isArray(value)) return []
  return value.flatMap((data, index) => {
    if (!isMapping(data)) return []
    const id = data[recordList.idField]
    const sourceId =
      (typeof id === "string" || typeof id === "number") &&
      String(id).trim() !== "" &&
      !hasPlaceholder(id)
        ? String(id).trim()
        : undefined
    return [{ list: recordList, index, sourceId, data }]
  })
}

/** The key of a source record in the identity map: `publicacoes.artigos/4.1.1`. */
export const identityKey = (recordList: RecordList, sourceId: string): string =>
  `${recordList.key}/${sourceId}`

// --- Authoring validation -----------------------------------------------------------------

export interface AuthoringReport {
  /** Problems that stop the file from being understood. */
  readonly errors: string[]
  /** Things the author should look at. None stops the file from being read. */
  readonly warnings: string[]
}

/**
 * Authoring validation (layer A): can the file be understood? It tolerates everything a
 * draft has: placeholders, empty lists, missing sections, records still being written.
 * It says nothing about publication.
 */
export function authoringIssues(source: CvSource, fileName?: string): AuthoringReport {
  const { document } = source
  const errors: string[] = []
  const warnings: string[] = []
  for (const key of Object.keys(document)) {
    if (!(key in SECTIONS))
      warnings.push(
        `section "${key}" is not one this integration knows: it is kept, and ignored`,
      )
  }
  for (const name of SECTION_NAMES) {
    if (!(name in document)) warnings.push(`section "${name}" is not in the file`)
  }
  for (const recordList of RECORD_LISTS) {
    const value = at(document, recordList.path)
    if (value === undefined) continue
    if (!Array.isArray(value)) {
      errors.push(`${recordList.key} must be a list of records`)
      continue
    }
    if (value.some((item) => !isMapping(item))) {
      errors.push(`${recordList.key} has an entry that is not a record`)
    }
    const seen = new Set<string>()
    let unnamed = 0
    for (const record of recordsOf(document, recordList)) {
      if (record.sourceId === undefined) unnamed++
      else if (seen.has(record.sourceId))
        errors.push(
          `${recordList.key}: the ${recordList.idField} "${record.sourceId}" is used twice`,
        )
      else seen.add(record.sourceId)
    }
    if (unnamed > 0)
      warnings.push(
        `${recordList.key}: ${unnamed} record(s) without ${recordList.idField === "id" ? "an id" : "a name"} cannot be given a stable identity`,
      )
  }
  const meta = document.metadados
  if (!isMapping(meta)) {
    warnings.push("metadados is missing: the file states no version or review status")
  } else {
    if (source.version === undefined) warnings.push("metadados.versao is not stated")
    const named = fileName === undefined ? undefined : fileNameVersion(fileName)
    if (
      named !== undefined &&
      source.version !== undefined &&
      !versionsAgree(named, source.version)
    )
      warnings.push(
        `the file name says version ${named}, metadados.versao says ${source.version}: the owner must say which is right`,
      )
  }
  return { errors, warnings }
}
