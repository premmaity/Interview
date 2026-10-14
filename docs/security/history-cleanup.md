# Compromised-secret response and optional history cleanup

The original repository tracked `Backend/.env` from its first commit. Removing it in a new commit does not remove it from Git history.

## Owner actions required now

1. Revoke both exposed Groq credentials in the provider console.
2. Replace the signing secret everywhere it was deployed and revoke all legacy sessions/tokens.
3. Review provider usage and hosting logs for abuse. Do not paste old values into issues, chat, CI, or terminal transcripts.
4. Coordinate a maintenance window before rewriting shared history. Every collaborator must re-clone afterward.

## Coordinated cleanup

Run from a fresh mirror clone after rotation:

```bash
git clone --mirror https://github.com/premmaity/Interview.git interview-cleanup.git
cd interview-cleanup.git
git filter-repo --path Backend/.env --invert-paths
git push --force --mirror origin
```

Then invalidate caches/forks where the hosting provider permits, verify the path is absent from all refs, and enable secret scanning/push protection. History rewriting is deliberately not performed automatically by this rebuild.
