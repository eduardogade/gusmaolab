// The website's favicon (P24A, D-168). The owner's icon `brand/favicon.ico` is the one source. The site serves a derivative
// at /favicon.ico, `public/favicon.ico`, made here and committed like the Bearnard derivatives: the same icon file with only
// its 16, 32 and 48 px images, each image's bytes copied unchanged. The design is not touched, and the file is about a
// fourteenth of the size (the source also holds 64, 128 and 256 px images, which a browser tab never uses).
//
//   node scripts/favicon.mjs           write public/favicon.ico from brand/favicon.ico
//   node scripts/favicon.mjs --check   fail if public/favicon.ico is not exactly that derivative
//
// Never edit public/favicon.ico by hand, and never replace brand/favicon.ico without the owner: change the source, then run this.
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
export const SOURCE = "brand/favicon.ico"
export const OUTPUT = "public/favicon.ico"
/** The image sizes the derivative keeps, in pixels. */
export const KEEP = [16, 32, 48]

/** The images of an icon file: their size, directory fields and bytes. Throws on anything that is not an icon. */
export function readIcon(buffer) {
  if (buffer.length < 6 || buffer.readUInt16LE(0) !== 0 || buffer.readUInt16LE(2) !== 1) throw new Error("not an icon file")
  const count = buffer.readUInt16LE(4)
  const images = []
  for (let i = 0; i < count; i++) {
    const at = 6 + 16 * i
    const size = buffer.readUInt32LE(at + 8)
    const offset = buffer.readUInt32LE(at + 12)
    if (offset + size > buffer.length) throw new Error(`image ${i} runs past the end of the file`)
    images.push({
      width: buffer[at] || 256,
      height: buffer[at + 1] || 256,
      entry: buffer.subarray(at, at + 8), // width, height, colours, reserved, planes, bits per pixel
      data: buffer.subarray(offset, offset + size),
    })
  }
  return images
}

/** The derivative: the same icon file format with only the kept sizes, their bytes unchanged. */
export function deriveIcon(source, keep = KEEP) {
  const images = readIcon(source).filter((image) => image.width === image.height && keep.includes(image.width))
  if (images.length !== keep.length) throw new Error(`the source does not hold exactly one image of each size ${keep.join(", ")}`)
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)
  let offset = 6 + 16 * images.length
  const entries = images.map((image) => {
    const entry = Buffer.alloc(16)
    image.entry.copy(entry, 0)
    entry.writeUInt32LE(image.data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += image.data.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)])
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const derived = deriveIcon(await readFile(join(ROOT, SOURCE)))
  if (process.argv.includes("--check")) {
    const current = await readFile(join(ROOT, OUTPUT)).catch(() => undefined)
    if (current === undefined || !current.equals(derived)) {
      console.error(`FAIL: ${OUTPUT} is not the derivative of ${SOURCE}; run \`npm run favicon\``)
      process.exit(1)
    }
    console.log(`PASS: ${OUTPUT} is the derivative of ${SOURCE} (${derived.length} bytes, ${KEEP.join("/")} px)`)
  } else {
    await writeFile(join(ROOT, OUTPUT), derived)
    console.log(`wrote ${OUTPUT}: ${derived.length} bytes, the ${KEEP.join(", ")} px images of ${SOURCE}`)
  }
}
