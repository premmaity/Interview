# Privacy and retention policy

Interview Mentor collects account identifiers, a candidate-entered profile, interview configurations, question/answer text, and coaching reports. Voice mode temporarily processes raw audio to create an editable transcript. The product does not collect protected attributes for evaluation and does not make employment decisions.

Default retention:

- raw voice audio: deleted in request memory immediately after transcription (`RAW_AUDIO_RETENTION_HOURS=0`);
- generated audio: not enabled; future objects must use immutable IDs and short TTL lifecycle rules;
- sessions, transcripts, and reports: retained until the candidate deletes the interview or account policy removes it;
- auth sessions: retained through expiry/revocation plus a short security-audit window;
- audit events: retain 90 days unless legal/incident needs require a documented exception;
- backups: daily, encrypted, 30-day rolling retention; deletion propagates as backups expire.

Candidates can delete individual sessions or delete their account and all owned database records after password and typed-phrase confirmation. Future object-backed artifacts must participate in the same deletion workflow. Operators must document subprocessors, region, legal basis, and contact route before public launch.
