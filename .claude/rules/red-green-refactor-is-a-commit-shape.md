when: [always] · tier: standard · check: deterministic
TDD isn't a personal ritual you attest to — it leaves a fingerprint in the diff: the test file and the source file for one behavior change together, and the test asserts the new behavior, not just re-describes the new code.
WRONG:
```
commit A: "add childCount summaries" (touches outline-tree.ts only)
commit B: "add tests" (touches outline-tree.test.ts only, 3 weeks later)
```
RIGHT:
```
commit: "add childCount summaries"
  - outline-tree.ts: collapses components below maxDepth to a summary node
  - outline-tree.test.ts: asserts a depth-1 stack yields { childCount: 3 }
```
_Avoid_: a production file changed in a commit with no corresponding test file changed in that same commit (for anything but a pure tidy — see tidy-or-behavior-never-both).
Detect: git diff stat per commit — does a behavior-changing commit touch a `*.ts` file without touching its paired `*.test.ts`/`*.spec.ts`.
Not-when: the change is to non-testable surface (types-only, config, markup-only tidy) or the repo has no test infra for that layer yet (greenfield — but then the FIRST behavior commit should establish the pairing).
