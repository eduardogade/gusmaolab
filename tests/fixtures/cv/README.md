# CV test fixture

SYNTHETIC FIXTURE for `tests/cv.mjs`. It says nothing true about anyone: every name, date, title, identifier and address in `CV.fixture.yaml` is invented.

The file has the shape of the author's CV (the same 22 sections and Portuguese field names, P11-A01), so that the read-only adapter can be tested without the real file, which is private and is not in this repository. It deliberately contains:

- unresolved placeholders (`{{…}}`), in fields a record can do without and in fields it cannot;
- records marked as drafts, records without an identifier, an impossible date and an end date left open;
- an author line with co-first-author asterisks and its note;
- private material that must never be projected: a private email address and telephone number, references, letters, statements, writing templates, the name and grade of a person mentored, an amount of money and the title of a proposal reviewed in confidence. Each carries a recognisable marker that the tests search for in every output.

The tests copy it under other names (`CV-v9.9.yaml`…) into temporary directories. It is never copied into `cv/`, `src/` or `public/`.
