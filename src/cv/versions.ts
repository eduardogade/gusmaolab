/**
 * CV version names (P11-A01, D-090). The author names explicitly created versions
 * `CV-vX.Y.yaml`; the working file has another name and states no version in it.
 */

/** `CV-v1.0.yaml`, `CV-v2.1.3.yaml`: the names of explicitly created versions. */
export const VERSION_FILE = /^CV-v(\d+(?:\.\d+){1,2})\.yaml$/

/** The version a file name states, or undefined for a name that states none. */
export function fileNameVersion(fileName: string): string | undefined {
  return VERSION_FILE.exec(fileName.split("/").at(-1) ?? "")?.[1]
}

/** True when two versions agree on every part both of them state: 1.0 and 1.0.0 agree. */
export function versionsAgree(a: string, b: string): boolean {
  const left = a.split(".")
  const right = b.split(".")
  const shared = Math.min(left.length, right.length)
  if (!left.every((p) => /^\d+$/.test(p)) || !right.every((p) => /^\d+$/.test(p)))
    return a === b
  for (let i = 0; i < shared; i++)
    if (Number(left[i]) !== Number(right[i])) return false
  return [...left.slice(shared), ...right.slice(shared)].every((p) => Number(p) === 0)
}
