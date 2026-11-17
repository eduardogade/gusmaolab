/**
 * SYNTHETIC FIXTURE (P18, D-127): the downloads of the development specimen (/_design/downloads/)
 * and of the tests. Two small, harmless files (src/demos/downloads/) and one planned resource,
 * all invented. They are served from /demo-downloads/ by a route that exists only in development
 * and demonstration builds, never from `public/`, so a release build holds none of them.
 *
 * The specimen draws them with the production components and the production rules
 * (`validateDownloads`), so what the owner sees working is what a real download would be.
 */
import type { DownloadResource, PlannedDownload } from "../downloads/registry.ts"

export const DEMO_DOWNLOADS: readonly DownloadResource[] = [
  {
    id: "demo-sample-notes",
    title: "Synthetic sample notes",
    description: "A short invented text file that shows a download link working. It describes nothing real.",
    category: "reference",
    publicPath: "/demo-downloads/synthetic-sample-notes.txt",
    fileName: "synthetic-sample-notes.txt",
    mediaType: "text/plain",
    version: "1.0",
    approvedOn: "2026-11-17",
  },
  {
    id: "demo-sample-table",
    title: "Synthetic sample table",
    description: "A tiny invented table of three rows, to show a second file type and its size.",
    category: "research",
    publicPath: "/demo-downloads/synthetic-sample-table.csv",
    fileName: "synthetic-sample-table.csv",
    mediaType: "text/csv",
    approvedOn: "2026-11-17",
  },
]

export const DEMO_PLANNED: readonly PlannedDownload[] = [
  {
    id: "demo-planned-cv",
    title: "Synthetic planned document (PDF)",
    description: "Shows how a document that is expected later appears before its file exists.",
    category: "cv",
    waitingFor: "a file the owner has approved",
  },
]

export const DOWNLOADS_SPECIMEN = "/_design/downloads/"
