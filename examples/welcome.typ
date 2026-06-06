// Typst Editor — showcase document (no external fonts or packages)
#set page(
  paper: "a4",
  margin: (x: 1.8cm, y: 2cm),
  header: context {
    if counter(page).get().first() > 1 [
      #text(size: 9pt, fill: gray)[Typst Editor · Welcome]
      #h(1fr)
      #text(size: 9pt, fill: gray)[#counter(page).display("1 / 1", both: true)]
    ]
  },
  footer: context {
    align(center)[
      #text(size: 8pt, fill: gray)[
        Typst Studio · Tinymist live preview
      ]
    ]
  },
)
#set text(size: 10.5pt, lang: "en")
#set heading(numbering: "1.1")
#set par(justify: true, leading: 0.65em)
#show link: underline
#show footnote.entry: set text(size: 9pt)

#let product = "Typst Editor"
#let version = "0.2"

// --- Custom show rules (Typst's programmable styling) ---
#show heading.where(level: 1): it => {
  set align(center)
  set text(size: 1.4em, weight: "bold", fill: rgb("#1a365d"))
  block(spacing: 1.2em, below: 0.8em)[#it]
}
#show heading.where(level: 2): it => {
  set text(fill: rgb("#2c5282"))
  block(above: 1em, below: 0.5em)[
    #box(stroke: (left: 3pt + rgb("#4299e1")), inset: (left: 8pt))[#it]
  ]
}

// --- Reusable functions (scripting) ---
#let note(body) = box(
  fill: rgb("#fffbeb"),
  stroke: 0.5pt + rgb("#d69e2e"),
  radius: 4pt,
  inset: 10pt,
  width: 100%,
)[
  #text(weight: "bold", fill: rgb("#975a16"))[Note:]
  #body
]

#let badge(label, color) = box(
  fill: color.lighten(75%),
  stroke: 0.5pt + color,
  radius: 2pt,
  inset: (x: 6pt, y: 2pt),
)[#text(size: 8pt, weight: "bold", fill: color.darken(20%))[#label]]

#let todo(done, body) = {
  let mark = if done { "[x]" } else { "[ ]" }
  [#mark #body]
}

#align(center)[
  #text(size: 24pt, weight: "bold")[#product]
  #v(0.3em)
  #text(size: 11pt, fill: gray)[A tour of Typst — v#version]
  #v(0.8em)
  #badge("scripting", rgb("#805ad5"))
  #h(4pt)
  #badge("math", rgb("#3182ce"))
  #h(4pt)
  #badge("layout", rgb("#38a169"))
  #h(4pt)
  #badge("pdf preview", rgb("#dd6b20"))
]

#note[
  Edit this file and watch the *PDF preview* update. Uncomment
  `// #broken()` below to test the problems panel.
]

// #broken()

= Why Typst is different <sec:intro>

Typst is a *markup-based* typesetting system with a real programming language
built in — not a macro preprocessor. You get LaTeX-quality output with
Python-like ergonomics.

@sec:intro introduces the idea; @sec:math and @sec:layout go deeper.

== Scripting and logic

#let items = ("Fast compile", "Inspectable PDF", "First-class functions")
#let greet(name) = [Hello, #name!]

#greet("Typst") — and a loop:
#list(..items.map(i => [• #i]))

#let scores = (42, 87, 91)
Average score: #calc.round(scores.sum() / scores.len(), digits: 1).

#todo(false, [Try toggling auto-compile in the toolbar])
#h(1em)
#todo(true, [Install Typst and Poppler for PDF preview])

== Text styling

Typst has rich *text* functions: #highlight[highlighted],
#strike[strikethrough], #underline[underlined], #overline[overlined],
#smallcaps[small caps], #super[sup] and #sub[sub] scripts,
#text(fill: gradient.linear(rgb("#e53e3e"), rgb("#805ad5"), rgb("#3182ce"), angle: 90deg))[gradient text].

= Mathematics <sec:math>

Typst math is entered in `$...$` (inline) or `$ ... $` blocks (display).

Inline: $alpha^2 + beta^2 = gamma^2$, $sum_(k=0)^n k = (n(n+1))/2$.

Display alignment and cases:
$ phi.alt = (1 + sqrt(5)) / 2 $

$ f(x) &= x^2 + 2x + 1 && x in RR \
        &= (x + 1)^2 && "completed square" $

Matrices and operators:
$ mat(1, 2; 3, 4) vec(x, y) = vec(1, 2) $

$ integral_0^infinity e^(-x^2) dif x = sqrt(pi) / 2 $

= Layout and graphics <sec:layout>

Typst ships *layout* and vector *graphics* tools — no TikZ or external images required.

// Equal-height cells so a three-column shape row stays aligned.
#let shape_cell(body) = rect(
  width: 100%,
  height: 2.6cm,
  stroke: 0.5pt + gray.lighten(35%),
  radius: 4pt,
  inset: 8pt,
  body,
)

== Shapes and gradients

#grid(
  columns: (1fr, 1fr, 1fr),
  column-gutter: 12pt,
  shape_cell[
    #align(center + horizon)[
      #rect(
        width: 88%,
        height: 1.5cm,
        fill: gradient.linear(
          rgb("#fc8181").lighten(20%),
          rgb("#90cdf4").lighten(10%),
          angle: 90deg,
        ),
        radius: 3pt,
      )
      #v(5pt)
      #text(size: 9pt)[`gradient.linear`]
    ]
  ],
  shape_cell[
    #align(center + horizon)[
      #circle(
        radius: 0.7cm,
        fill: rgb("#9ae6b4"),
        stroke: 1pt + rgb("#276749"),
      )
      #v(5pt)
      #text(size: 9pt)[`circle`]
    ]
  ],
  shape_cell[
    #align(center + horizon)[
      #polygon(
        fill: rgb("#fbd38d"),
        stroke: 1pt + rgb("#c05621"),
        (50%, 10%), (90%, 88%), (10%, 88%),
      )
      #v(5pt)
      #text(size: 9pt)[`polygon`]
    ]
  ],
)

== Figure beside stacked blocks

#grid(
  columns: (1.05fr, 0.95fr),
  column-gutter: 1.4em,
  [
    #figure(
      caption: [Vector scene with `@fig:diagram` reference],
      rect(
        width: 100%,
        height: 3.4cm,
        fill: luma(248),
        stroke: 0.5pt + gray.lighten(25%),
        radius: 4pt,
      )[
        #place(center + horizon)[
          #line(length: 75%, stroke: 2pt + rgb("#e53e3e"))
          #place(
            center + horizon,
            circle(radius: 5pt, fill: rgb("#e53e3e")),
          )
        ]
        #place(bottom + center, dy: -6pt)[
          #text(size: 8.5pt, fill: gray)[`line` + `place` + `circle`]
        ]
      ],
    ) <fig:diagram>
  ],
  [
    #set par(justify: true)
    *Grid layouts* divide space into rows and columns. This column sits
    beside the figure; @fig:diagram is referenced by label.

    #v(0.7em)
    #stack(
      dir: ttb,
      spacing: 8pt,
      box(
        fill: rgb("#ebf8ff"),
        inset: 8pt,
        radius: 3pt,
        width: 100%,
      )[#text(size: 9pt)[`stack` item 1]],
      box(
        fill: rgb("#bee3f8"),
        inset: 8pt,
        radius: 3pt,
        width: 100%,
      )[#text(size: 9pt)[`stack` item 2]],
      box(
        fill: rgb("#90cdf4"),
        inset: 8pt,
        radius: 3pt,
        width: 100%,
      )[#text(size: 9pt)[`stack` item 3]],
    )
  ],
)

== Tables

#figure(
  caption: [Table features: headers, spans, and styling],
  table(
    columns: 4,
    align: (left, center, center, left),
    stroke: 0.4pt + gray,
    inset: 8pt,
    table.header(
      [*Feature*], [*TeX*], [*Typst*], [*Notes*],
    ),
    table.cell(rowspan: 2)[*Preview*],
    [Overleaf], [✓], [Browser PDF],
    [TeXstudio], [✓], [External viewer],
    table.cell(colspan: 2)[This editor],
    table.cell(colspan: 2)[Native PDF + live pane],
    [Scripting], [Macros], [Language], [Typed, composable],
  ),
)

#pagebreak()

= Document features

== References and footnotes

Clickable references like @sec:math use labels on headings and figures.
Footnotes are native too#footnote[Typst resolves footnote numbers and keeps
them on the correct page automatically.].

== Counters and custom state

Headings are numbered via `#set heading(numbering: "1.1")`.
This is heading #context counter(heading).display() at level 1.

#let theorem = counter("theorem")
#let thm(body) = block[
  #theorem.step()
  *Theorem #context theorem.display():*
  #body
]

#thm[$sqrt(2)$ is irrational.]
#thm[For all $n in NN$, $n < n + 1$.]

== Code and data

```typ
// Functions, loops, and content blocks
#let fib(n) = if n <= 1 { n } else { fib(n-1) + fib(n-2) }
#fib(10)  // → 55
```

```python
def greet(name: str) -> str:
    return f"Hello, {name}!"
```

#quote(block: true, attribution: [Bringhurst])[
  Typography exists to honor content.
]

== Term lists and enumerations

/ Typst: A markup-based typesetting system with embedded scripting.
/ TeX: The classic typesetting system; powerful but steep learning curve.
/ PDF: Portable output; this editor renders it for live preview.

+ First-class *set* and *show* rules
+ Built-in math, tables, and diagrams
+ Fast incremental compilation

#enum(
  numbering: "a.",
  [Lower-alpha lists],
  [Are one function call away],
)

#line(length: 100%, stroke: 0.5pt + gray.lighten(40%))

#align(center)[
  #text(size: 9pt, fill: gray)[
    #link("https://typst.app/docs")[typst.app/docs] ·
    Compiled to PDF · Try View → Settings for themes and layout
  ]
]
