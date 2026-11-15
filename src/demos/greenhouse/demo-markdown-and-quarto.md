---
title: "One Archive, Two Authoring Formats"
description: "When ordinary Markdown is enough, when a Quarto source earns its place, and how both end up as the same kind of page at the same kind of address. A synthetic demonstration."
status: published
slug: demo-markdown-and-quarto
publishedAt: 2026-11-15
tags: [markdown, quarto, publishing, demonstration]
difficulty: intermediate
prerequisites:
  - Having read the two other demonstrations, or having written a Markdown article
related:
  - greenhouse/demo-scientific-markdown
  - greenhouse/demo-synthetic-signals
synthetic: true
---

A reader of The Greenhouse cannot tell how an article was written, and should not need to. Behind a page there may be a Markdown file or a Quarto document. This article is about that difference: why there are two formats, what each is good for, and what keeps them from becoming two websites.

## Two sources, one kind of page

Both formats become the same thing: one entry in the collection, with one address, one set of metadata and one layout. The reader sees the same header, the same type, the same contents list beside the text and the same way on to the next article. You can check this yourself by opening [A Small Guide to Scientific Markdown](/lecture-notes/greenhouse/demo-scientific-markdown/), which is a Markdown file, and [From Synthetic Signals to Reproducible Results](/lecture-notes/greenhouse/demo-synthetic-signals/), which is a Quarto document, one after the other.

| | Markdown | Quarto |
| --- | --- | --- |
| Source file | `name.md` in the collection | `name.qmd` in `science/` |
| Where the metadata is written | Its own front matter | Its own front matter |
| Who builds the body | Astro | Quarto, then a strict check |
| Code | Shown, never run | Shown, and run when you ask |
| Equations, figures, citations | Written by hand | Numbered and cross-referenced |
| Needs extra tools to build the site | No | No: the result is committed |
| Needs extra tools to write | No | Quarto, and Python for computed cells |

## When Markdown is enough

Most articles are made of explanation. A tutorial about a command, a note on a design decision, a worked example with a short snippet: these need headings, lists, code and perhaps a table, and Markdown does all of it with a file you can read in any editor. It builds in seconds and asks nothing of the machine that builds the site. If an article would be fine as plain text with headings, write it as Markdown.

## When Quarto earns its place

A scientific article makes promises that prose alone cannot keep. Figure 3 must still be Figure 3 after a section is added before it. An equation referred to as the model must be the equation that is printed. A citation must appear in the bibliography, and a number in the text must be the number the code produced. Quarto keeps these promises mechanically:

1. Numbered figures, tables and equations are labelled, and every reference to them is a link that cannot go stale.
2. Citations are written as keys and checked against a bibliography file, which prints the reference list.
3. Code cells run in a recorded environment, and the figure or table is made *from* the code rather than pasted beside it.

## How both reach the same site

The site, its folders, its addresses and its layouts belong to Astro. Quarto never builds the site. It prepares one article at a time, and a script then checks what Quarto produced against a short list of what an article may contain: no scripts, no page chrome, no images from elsewhere, no unresolved reference. What survives is stored beside the entry as a plain fragment of HTML. From there it is the same path as a Markdown article: the entry's metadata decides whether it is published, its slug decides its address, and its collection decides its layout.

## Computation is not part of building

The most important separation is the least visible. Building the site never runs a computation. A Quarto document with code is executed only when its author asks, in a prepared environment, with a fixed random seed, and the results are stored with the article. The site build only checks that the stored results are still the ones the current code would produce, by comparing fingerprints. If the code or the data changed and the results did not, the build stops and says which document is stale. A figure on the page is therefore never newer or older than the code beside it without anybody noticing.

## A short rule of thumb

- Writing about something: Markdown.
- Showing a result that code produced, or that readers should be able to reproduce: Quarto.
- Unsure: start in Markdown. A Markdown article can be moved to Quarto when it earns it; nothing is lost.
