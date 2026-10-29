---
name: acceptance-criteria-writer
description: Turn a feature or user story description into clear, testable acceptance criteria in Given/When/Then form, including edge cases and what is out of scope. Use when someone asks for acceptance criteria, a definition of done for a story, or "how will we know this works".
---

# Acceptance criteria writer

Write acceptance criteria for the feature or story in `$ARGUMENTS` or the user's last message.

## 1. Read the story

Identify the **user**, the **action** and the **outcome**. If any of the three is missing, ask one question to fill it in, then continue.

## 2. Write the criteria

- One criterion per behaviour, in **Given / When / Then** form.
- Start with the main success path, then add:
  - **Validation:** empty, wrong or too-long input.
  - **Permissions:** someone who shouldn't be able to do it.
  - **Edge cases:** zero items, many items, the same action twice.
- Each criterion must be checkable by someone who didn't write it: no "works well", "is fast" or "user-friendly" without a number or observable result.

## 3. Output

```
**<Story title>**
As a <user>, I want to <action> so that <outcome>.

| # | Given | When | Then |
|---|---|---|---|
| 1 | ... | ... | ... |

Out of scope: <what this story does not cover>
Open questions: <anything the criteria had to assume>
```

## Rules

- Between 4 and 10 criteria. If you need more, suggest splitting the story.
- Use only facts from the description; list assumptions under "Open questions" instead of inventing rules.
- Include at least one non-functional criterion (performance, accessibility or security) when the story touches it.
