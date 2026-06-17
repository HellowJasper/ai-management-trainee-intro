# Team Formation Screen Design

## Goal

Add a dedicated team formation big-screen view opened from `5 CORE SECTORS`. It shows the same five tracks as the business scenario screen, with one advisor and four placeholder teammates per track.

## Scope

- Add a new `team` view/stage instead of using a temporary panel.
- Keep the visual language aligned with the existing business scenario page: dark matrix rain, glass cards, five-column layout, cyan/lime track accents.
- Seed placeholder data from `data/teams.json`.
- Expose `GET /api/teams` so future backend/admin controls can replace the JSON source without changing the UI contract.
- Update admin stage mapping so the existing `team` phase opens the new team screen.

## Data Contract

`/api/teams` returns an array of five track objects:

```json
{
  "id": "pharma",
  "index": "01",
  "name": "药学",
  "nameEn": "PHARMACEUTICALS",
  "hostDepartment": "药学研发中心",
  "color": "var(--neon)",
  "colorRgb": "40, 255, 200",
  "advisor": {
    "name": "赛道顾问 A",
    "department": "药学研发中心",
    "role": "赛道顾问"
  },
  "members": [
    {
      "name": "黄钊强",
      "department": "药学研发中心",
      "role": "队友 01",
      "photo": "./assets/trainees/huang-zhaoqiang/idPhoto.jpg"
    }
  ]
}
```

## Interaction

- Business scenario header button `5 CORE SECTORS` navigates to `team`.
- Team screen header left button returns to the business scenario page.
- Bottom footer keeps the current HUD style.
- If `/api/teams` is unavailable, the frontend falls back to `./data/teams.json`.

## Future Backend Control

The first backend boundary is read-only: `GET /api/teams`. Later admin controls can add write endpoints without changing the screen renderer:

- `PATCH /api/teams/:trackId/advisor`
- `PATCH /api/teams/:trackId/members`
- `PATCH /api/admin/stage` already supports switching to the `team` stage.
