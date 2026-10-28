---
name: standup-summary
description: Turn yesterday's commits and notes into a three-line standup update. Use when someone asks for a standup, a daily update or a status line.
---

# Standup summary

1. Read the input in `$ARGUMENTS` or the user's last message.
2. Output exactly three lines: Done, Next, Blocked ("none" if empty).
3. Never invent work that isn't in the input.