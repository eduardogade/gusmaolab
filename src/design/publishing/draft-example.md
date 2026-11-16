This is what an unfinished article looks like in the local preview. It is written in Markdown, in a file whose metadata says `status: draft`, and it is drawn by the same layout that draws every published article of The Greenhouse.

## What a draft has

A draft has a page while you run `npm run dev`, so you can read it as a reader will. It has no page in a production build, no place in the index, and no link from any other article.

## What it does not have

It has no publication date and, here, no description. Both are needed to publish, and `npm run content:validate` says so. The notice above the text is part of the preview, not of the article.

## Where to go next

The workbench lists the commands that create, check, publish and archive an article, and the workflow example shows them running on a throwaway project.
