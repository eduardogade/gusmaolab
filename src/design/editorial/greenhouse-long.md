This is a **synthetic** specimen, written only to exercise the Greenhouse reading layout. It describes no real work. Its subject is an invented one: how a small program might count the characters in a text, and why the counts are less obvious than they look. Jump straight to the [results table](#results) or read on.

## Why count at all

Counting is the simplest measurement there is, and the easiest to get subtly wrong. Suppose a text holds the word *naïve*. A program that counts bytes reports six characters, because `ï` takes two bytes in UTF-8. A program that counts Unicode code points reports five. A reader would say five.

Notation is part of the problem. Writing the mean length as μ and its spread as σ², with Δ for a difference between two runs, keeps the discussion short: if Δμ is near zero, the two programs agree.

### Bytes, code points and characters

A byte is a unit of storage. A code point is a unit of the Unicode standard. A *grapheme* is what a reader perceives as one character, and it may be several code points, such as `e` followed by a combining accent.

### A note on terminology

Use the words above consistently, and say which one you count. The rest of this specimen counts code points.

## A small implementation

The function below counts code points. The long line at the end of the block is deliberate: it must scroll inside its box, never widen the page.

```python
def count_code_points(text: str) -> int:
    """Return the number of Unicode code points in text."""
    return sum(1 for _ in text)


# A deliberately long line, to test horizontal containment of code blocks in the reading layout of the archive.
SAMPLE = "naïve café — résumé — ünïcödé — a very long synthetic sentence that keeps going well past the width of any reasonable column"
print(count_code_points(SAMPLE))
```

Inline code such as `len(text)` stays inside the line, and a very long inline token like `a_deliberately_long_identifier_that_must_wrap_instead_of_widening_the_page_at_any_width` wraps.

## Results

The table has many columns on purpose, so that on a phone it scrolls inside its own region.

| Input | Bytes | Code points | Graphemes | Programme A | Programme B | Programme C | Programme D | Note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| naïve | 6 | 5 | 5 | 5 | 6 | 5 | 5 | B counts bytes |
| café | 5 | 4 | 4 | 4 | 5 | 4 | 4 | B counts bytes |
| e + accent | 3 | 2 | 1 | 2 | 3 | 2 | 1 | Only D counts graphemes |

<figure>
<svg role="img" aria-label="Three bars of decreasing height labelled bytes, code points and graphemes" viewBox="0 0 240 90" width="240" height="90"><rect x="20" y="10" width="40" height="70" fill="currentColor" opacity="0.8"/><rect x="100" y="30" width="40" height="50" fill="currentColor" opacity="0.6"/><rect x="180" y="50" width="40" height="30" fill="currentColor" opacity="0.4"/></svg>
<figcaption>Figure 1. Invented counts for one synthetic input: bytes, code points and graphemes.</figcaption>
</figure>

### Reading the figure

The bars fall from left to right, because each unit is coarser than the one before. See [the standard's overview](https://www.unicode.org/standard/standard.html) for the real definitions.

## What to take away

State the unit you count. Test with accented text. Prefer code points over bytes, and graphemes over code points, when the reader is human.
