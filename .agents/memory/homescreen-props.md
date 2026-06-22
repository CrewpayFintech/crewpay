---
name: HomeScreen props
description: Props added to HomeScreen for team/task/submission counts.
---

## The Rule
HomeScreen now accepts `submissionCount: number`, `taskCount: number`, `teamCount: number` in addition to its existing props.

**Why:** Stats row on home page shows live counts for Teams, Tasks, and Submissions (or Reviews for crewlead).

## How to apply
In App.tsx at the `<HomeScreen ... />` call site (~line 1623), pass:
- `teamCount={availableTeams.length}`
- `taskCount={createdTasks.length}`
- `submissionCount={myTaskSubmissions.length}`
