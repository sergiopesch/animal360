# Review Reminder Operations

`A360_Review_Due_Reminder_Flow` and `A360ReviewReminderService` are packaged as reusable reminder logic. The package does not hardcode a schedule because reminder cadence is an org operations decision.

## Schedule Options

Use one of these org-level patterns:

1. Create a scheduled-triggered flow that runs daily and calls `A360_Review_Due_Reminder_Flow` as a subflow.
2. Invoke `A360_Review_Due_Reminder_Flow` from Flow Orchestrator or another existing operations cadence.
3. Run the reminder flow manually during pilot validation before enabling a recurring schedule.

Recommended pilot cadence:

- Frequency: daily
- Time: outside peak operating hours
- Input defaults: use the packaged defaults from `Animal360_Automation_Setting__mdt.DEFAULT`
- Owner: Animal360 application admin or operations admin

## Verify Schedule

From the repository root:

```bash
scripts/check-review-reminder-schedule.sh --target-org animal360
```

The script queries `CronTrigger` for scheduled jobs whose names begin with `A360` or contain `Review`. It does not create, update, or delete jobs.

An empty result means the reminder logic is deployed but not currently scheduled in that org.
