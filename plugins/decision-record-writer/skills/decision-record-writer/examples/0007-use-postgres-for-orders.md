# 7. Use PostgreSQL for the orders service

Date: 2026-03-14
Status: Accepted
Deciders: Orders team tech lead, platform engineer

## Context

The orders service currently stores orders as JSON files in object storage. Order volume is expected to grow about tenfold this year, and the business needs reports that join orders with customers and payments. Queries over files are slow and hard to keep consistent when two updates arrive together. The team has strong SQL experience and limited experience with document databases. We need a decision before the Q2 reporting work starts.

## Options considered

### Option A: PostgreSQL (managed)
- Pros: transactions prevent conflicting updates; joins and reporting are straightforward; the team knows it; managed backups.
- Cons: schema changes need migrations; vertical scaling limits will need watching at higher volume.

### Option B: Document database (managed)
- Pros: flexible schema; scales horizontally.
- Cons: cross-collection reporting is harder; little team experience; transactions are more limited.

### Option C: Keep files, add a search index
- Pros: smallest change.
- Cons: does not solve concurrent updates; two systems to keep in sync.

## Decision

We will use a managed PostgreSQL database for the orders service, because it gives us transactional consistency and simple reporting with skills the team already has.

## Consequences

- Easier: reporting queries, consistent updates, local development with a standard database.
- Harder: schema changes now need reviewed migrations; we must monitor database size and connections.
- Follow-up work: migrate existing order files (separate plan), add connection pooling, set up migration checks in CI.

## References

- Load test results from February
- Reporting requirements document
