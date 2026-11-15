---
title: "A Small Guide to Scientific Markdown"
description: "How an ordinary Markdown file becomes a Greenhouse article: the structure to write, what the page builds from it, and where Markdown stops being enough. A synthetic demonstration."
status: published
slug: demo-scientific-markdown
publishedAt: 2026-11-13
tags: [markdown, writing, demonstration]
difficulty: introductory
prerequisites:
  - Having written a plain text file
references:
  - "CommonMark Specification. https://spec.commonmark.org/"
  - "GitHub Flavored Markdown Specification. https://github.github.com/gfm/"
related:
  - greenhouse/demo-synthetic-signals
synthetic: true
---

A Markdown article is a text file that says what its parts are and leaves the look to the site. This guide is itself one: the file you are reading is a few hundred lines of plain text, and everything on the page, the contents list beside it, the header, the dates and the way on to the next article, was built from it by the same code that will build every real article of The Greenhouse.

## The idea in one paragraph

You write headings, paragraphs, lists, code and tables. You describe the article once, at the top of the file, in a few lines of metadata. The site decides the typography, the width of the text and where the contents list goes. A good Markdown article therefore has very little to say about appearance and a lot to say about *structure*.

> The best formatting is the one a reader never notices.
> Structure first; the page does the rest.

## The parts of an article

### The metadata block

The block at the top of the file, between the two lines of dashes, is the article's passport. It gives the title, a one-line description, a publication state, a slug that becomes the last part of the address, and optional fields such as tags and a level.

| Field | Required | What it is for |
| --- | --- | --- |
| `title` | yes | The one `<h1>` of the page |
| `description` | when published | The summary under the title and in lists |
| `status` | yes | `draft`, `published` or `archived` |
| `slug` | yes | The address: it never comes from the title |
| `publishedAt` | when published | The date shown with the article |
| `difficulty` | no | `introductory`, `intermediate` or `advanced` |
| `prerequisites` | no | What a reader should know first |

A draft has no page in a production build. It is routed only on a developer's own computer, so an unfinished article is never published by accident.

### Headings

The title is the page's one top-level heading, so the body starts at `##`. Sections use `##`, their parts use `###`. The site reads these headings to build the contents list; an article with fewer than three of them has no list, because a short text does not need one.

### Lists, emphasis and code

Prefer lists when the items are parallel:

1. State the question.
2. Show the smallest example that works.
3. Say where it stops working.

Use *emphasis* for a word that carries stress, **strong** text rarely, and `inline code` for anything a reader might type. For several lines, use a fenced block and name its language:

```python
# A minimal example: the mean of a list, with the standard library only.
from statistics import fmean

readings = [4.2, 3.9, 4.4, 4.1]
print(f"mean of {len(readings)} readings: {fmean(readings):.2f}")  # a deliberately long line, to show that code scrolls inside its box instead of widening the page
```

A long line stays on one line and scrolls inside its box, so the page itself never moves sideways.

## Links

An internal link names a page of this site: [the Greenhouse](/lecture-notes/greenhouse/) is the folder that holds long technical articles, and [the next demonstration](/lecture-notes/greenhouse/demo-synthetic-signals/) shows what the same article looks like when it also has equations, a computed figure and a bibliography. An external link, such as [the CommonMark specification](https://spec.commonmark.org/), leaves the site.

## Where Markdown is enough, and where it is not

Markdown is enough when the article is made of words, lists, short code and tables. It stops being enough when the article needs numbered equations, figures produced by code, cross-references that must not break, or citations that build their own bibliography. For those, GusmaoLab accepts an optional Quarto source for the same collection; the comparison is the subject of [One Archive, Two Authoring Formats](/lecture-notes/greenhouse/demo-markdown-and-quarto/).

## A checklist before publishing

- The title says what the article is about, not that it is an article.
- The description is one sentence a stranger could read in a list.
- Every heading is a heading, and every heading level is used in order.
- Every link goes where it says.
- The slug is final, because it is the address.
