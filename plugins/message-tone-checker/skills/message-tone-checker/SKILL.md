---
name: message-tone-checker
description: Check a draft email or chat message for tone, clarity and length before sending, and suggest a tighter rewrite. Use when someone asks "how does this sound", "is this too harsh", or wants a message reviewed before they send it.
---

# Message tone checker

Review the draft in `$ARGUMENTS` or the user's last message.

## 1. Understand the context

Work out, or ask in one question if it is unclear:
- **Who reads it:** a peer, a manager, a customer, a large group.
- **What the sender wants:** a decision, an answer, information shared, an apology accepted.

## 2. Check four things

| Check | What to look for |
|---|---|
| **Ask** | Is the request or main point in the first two sentences? |
| **Tone** | Words that can read as blunt, passive-aggressive or over-apologetic ("as I said", "just", "sorry to bother you"). |
| **Length** | Anything the reader doesn't need to act. Aim for under 120 words unless it's a report. |
| **Next step** | Is it clear who does what, by when? |

## 3. Output

```
Verdict: Ready to send | Small fixes | Rewrite suggested

| Check | Result | Note |
|---|---|---|
| Ask | ✓ / ✗ | ... |
| Tone | ✓ / ✗ | quote the phrase and why |
| Length | ✓ / ✗ | word count |
| Next step | ✓ / ✗ | ... |

Suggested version:
<the rewritten message>
```

## Rules

- Keep the sender's voice and facts. Don't add promises, dates or names they didn't write.
- If the draft is already good, say "Ready to send" and don't rewrite it for the sake of it.
- Point out anything that looks like confidential data (passwords, personal details) before anything else.
