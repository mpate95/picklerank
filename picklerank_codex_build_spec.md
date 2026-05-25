# PickleRank Build Spec

## 1. Project Overview

### App Name
PickleRank

### Purpose
PickleRank is a private web application for tracking weekly pickleball games among a small friend group. The app should allow users to manage players, record weekly sessions, enter doubles match results, calculate player stats, maintain Elo-style rankings, and display a clean dashboard with leaderboard and historical trends.

### Expected Scale
This is a low-volume private app.

- Approximately 20 active players maximum
- Weekly pickleball sessions
- Mostly doubles matches
- Low concurrent traffic
- Designed for learning and clean architecture, not enterprise complexity

### Primary Goal
Build a well-designed MVP that supports the core loop:

1. Add players
2. Create a weekly session
3. Enter match results
4. Calculate stats
5. Update player ratings
6. Show rankings and dashboard

### Out of Scope for MVP
The following should not be implemented in the MVP:

- Tournament brackets
- Native mobile app
- Push notifications
- Payments
- Public SaaS multi-tenancy
- Complex permissions
- Social feed
- AI recaps
- Real-time WebSocket updates

These may be added later after the core app is working.

---

## 2. Tech Stack

### Backend
Use:

- Python
- FastAPI
- SQLAlchemy 2.0
- Pydantic
- Alembic
- PostgreSQL
- Pytest

### Frontend
Use:

- Next.js
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts
- TanStack Query

### Local Development
Use Docker Compose for PostgreSQL.

Recommended local services:

- Postgres database
- FastAPI backend
- Next.js frontend

The frontend and backend may run as separate local processes during development.

---

## 3. Design Principles

### General Principles

- Keep the app simple but properly structured.
- Do not over-engineer for enterprise scale.
- Prioritize clean domain modeling.
- Prioritize readable, maintainable code.
- Prefer explicit business logic over clever abstractions.
- Keep backend business logic in service classes/functions, not API routes.
- Use migrations for database schema changes.
- Use tests for ranking, match validation, and stats logic.

### Backend Architecture Rules

API routes should be thin.

Routes should:

- Parse request data
- Call services
- Return response schemas

Routes should not:

- Calculate Elo ratings directly
- Contain complex stats logic
- Contain database-heavy query logic
- Know too much about implementation details

Business logic should live in services.

Database access should be separated from route logic. Repository functions are optional but preferred where they improve readability.

### Frontend Architecture Rules

Frontend should:

- Use reusable components
- Keep API calls isolated in a lib/api layer
- Use typed API response models
- Use TanStack Query for server-state fetching/mutation
- Use shadcn/ui for polished UI primitives
- Use Recharts for dashboard charts

Frontend should not:

- Reimplement ranking logic
- Calculate official stats independently from backend
- Own the source of truth for player records or ratings

---

## 4. MVP Scope

The MVP should include the following features.

### Player Management

- Create player
- List players
- View player profile
- Edit player
- Deactivate player

Deletion should be soft deletion via `is_active = false`, not hard deletion.

### Session Management

A session represents one weekly meetup or event.

- Create session
- List sessions
- View session detail
- Edit session
- Delete session only if no matches exist, or otherwise mark inactive/cancelled

### Match Tracking

The MVP should support doubles matches.

- Create match result
- Select session
- Select two players for Team 1
- Select two players for Team 2
- Enter scores
- Mark match as ranked or unranked
- Save completed match
- View match list
- Edit match if needed
- Void/delete match if entered incorrectly

### Stats

Calculate and display player stats:

- Games played
- Wins
- Losses
- Win percentage
- Points scored
- Points allowed
- Point differential
- Average points scored per game
- Average points allowed per game
- Current win/loss streak

### Rankings

Use an Elo-style rating system.

- Every player starts at 1000
- Team rating is average rating of players on that team
- Match result updates each player rating
- Store rating change events
- Display current leaderboard
- Display rating history over time

### Dashboard

The dashboard should be included in the MVP because it makes the app immediately useful and fun.

Dashboard should include:

- Current #1 ranked player
- Current leaderboard
- Recent matches
- Biggest mover
- Best win percentage
- Most games played
- Rating trend chart

Keep the first version simple.

---

## 5. Domain Model

### Player

Represents a person who plays pickleball.

Fields:

```text
id
first_name
last_name
display_name
email
is_active
created_at
updated_at
```

Notes:

- `display_name` should be required.
- `email` is optional for MVP.
- `is_active` allows deactivation without destroying historical match data.

### Session

Represents a weekly pickleball meetup.

Fields:

```text
id
name
session_date
location
notes
created_at
updated_at
```

Example session names:

- Saturday Pickleball - May 30, 2026
- Wednesday Night Pickleball

### Match

Represents a single game.

Fields:

```text
id
session_id
match_type
is_ranked
status
created_at
updated_at
```

MVP values:

- `match_type`: `doubles`
- `status`: `completed`, `voided`

### MatchTeam

Represents one side of a match.

Fields:

```text
id
match_id
team_number
score
is_winner
```

Rules:

- Every match has exactly two teams.
- `team_number` is 1 or 2.
- One team must be winner.
- One team must be loser.

### MatchTeamPlayer

Join table connecting players to a match team.

Fields:

```text
id
match_team_id
player_id
```

Rules:

- For MVP doubles, each team should have exactly two players.
- A player cannot appear on both teams in the same match.
- A player cannot appear twice in the same match.

### PlayerRating

Stores the current rating for each player.

Fields:

```text
id
player_id
rating
created_at
updated_at
```

Rules:

- Each player has one current rating row.
- New players start at 1000.

### RatingEvent

Stores rating changes after ranked matches.

Fields:

```text
id
match_id
player_id
rating_before
rating_after
rating_change
created_at
```

Rules:

- Created only for ranked matches.
- Allows historical trend charts.
- Allows auditability when ratings change.

### RatingSnapshot

Optional but recommended for weekly/session-level historical leaderboard snapshots.

Fields:

```text
id
player_id
session_id
rating
rank
games_played
wins
losses
win_percentage
point_differential
created_at
```

Notes:

- This can be created after a session is completed or after each match.
- For MVP, rating history can be based on RatingEvent. RatingSnapshot can be added once dashboard history needs it.

---

## 6. Database Schema

Use UUID primary keys.

### players

```text
id UUID primary key
first_name text nullable
last_name text nullable
display_name text not null
email text nullable
is_active boolean default true
created_at timestamp not null
updated_at timestamp not null
```

### sessions

```text
id UUID primary key
name text not null
session_date date not null
location text nullable
notes text nullable
created_at timestamp not null
updated_at timestamp not null
```

### matches

```text
id UUID primary key
session_id UUID not null references sessions(id)
match_type text not null default 'doubles'
is_ranked boolean not null default true
status text not null default 'completed'
created_at timestamp not null
updated_at timestamp not null
```

### match_teams

```text
id UUID primary key
match_id UUID not null references matches(id)
team_number integer not null
score integer not null
is_winner boolean not null
```

Constraints:

```text
unique(match_id, team_number)
team_number in (1, 2)
score >= 0
```

### match_team_players

```text
id UUID primary key
match_team_id UUID not null references match_teams(id)
player_id UUID not null references players(id)
```

Constraints:

```text
unique(match_team_id, player_id)
```

### player_ratings

```text
id UUID primary key
player_id UUID not null unique references players(id)
rating numeric not null default 1000
created_at timestamp not null
updated_at timestamp not null
```

### rating_events

```text
id UUID primary key
match_id UUID not null references matches(id)
player_id UUID not null references players(id)
rating_before numeric not null
rating_after numeric not null
rating_change numeric not null
created_at timestamp not null
```

### rating_snapshots

```text
id UUID primary key
player_id UUID not null references players(id)
session_id UUID nullable references sessions(id)
rating numeric not null
rank integer not null
games_played integer not null
wins integer not null
losses integer not null
win_percentage numeric not null
point_differential integer not null
created_at timestamp not null
```

---

## 7. Backend Project Structure

Use this structure:

```text
backend/
  app/
    main.py
    core/
      config.py
      database.py
      errors.py
    models/
      __init__.py
      player.py
      session.py
      match.py
      rating.py
    schemas/
      __init__.py
      player.py
      session.py
      match.py
      stats.py
      ranking.py
      dashboard.py
    api/
      __init__.py
      routes/
        __init__.py
        players.py
        sessions.py
        matches.py
        stats.py
        rankings.py
        dashboard.py
    services/
      __init__.py
      player_service.py
      session_service.py
      match_service.py
      stats_service.py
      ranking_service.py
      dashboard_service.py
    repositories/
      __init__.py
      player_repository.py
      session_repository.py
      match_repository.py
      ranking_repository.py
    tests/
      test_players.py
      test_sessions.py
      test_matches.py
      test_stats.py
      test_rankings.py
  alembic/
  alembic.ini
  pyproject.toml
```

---

## 8. API Design

### Health Check

```http
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

---

## 9. Player APIs

### List Players

```http
GET /players
```

Query params:

```text
active_only: boolean optional default true
```

Response:

```json
[
  {
    "id": "uuid",
    "display_name": "Mike",
    "first_name": "Michael",
    "last_name": "Patel",
    "email": null,
    "is_active": true,
    "rating": 1042.5
  }
]
```

### Create Player

```http
POST /players
```

Request:

```json
{
  "display_name": "Mike",
  "first_name": "Michael",
  "last_name": "Patel",
  "email": null
}
```

Response:

```json
{
  "id": "uuid",
  "display_name": "Mike",
  "first_name": "Michael",
  "last_name": "Patel",
  "email": null,
  "is_active": true,
  "rating": 1000
}
```

Important behavior:

- Creating a player should also create a `player_ratings` row with rating 1000.

### Get Player

```http
GET /players/{player_id}
```

Response should include player details, current stats, current rank, and recent matches.

### Update Player

```http
PATCH /players/{player_id}
```

Request:

```json
{
  "display_name": "Mike P"
}
```

### Deactivate Player

```http
DELETE /players/{player_id}
```

Behavior:

- Set `is_active = false`.
- Do not delete historical match records.

---

## 10. Session APIs

### List Sessions

```http
GET /sessions
```

Response:

```json
[
  {
    "id": "uuid",
    "name": "Saturday Pickleball - May 30, 2026",
    "session_date": "2026-05-30",
    "location": "Local Courts",
    "match_count": 8
  }
]
```

### Create Session

```http
POST /sessions
```

Request:

```json
{
  "name": "Saturday Pickleball - May 30, 2026",
  "session_date": "2026-05-30",
  "location": "Local Courts",
  "notes": "Weekly games"
}
```

### Get Session

```http
GET /sessions/{session_id}
```

Response should include:

- Session details
- Match list
- Session-level stats if available

### Update Session

```http
PATCH /sessions/{session_id}
```

### Delete Session

```http
DELETE /sessions/{session_id}
```

Rules:

- If the session has no matches, it may be hard deleted.
- If the session has matches, avoid hard deletion unless cascading behavior is intentionally implemented.

---

## 11. Match APIs

### List Matches

```http
GET /matches
```

Query params:

```text
session_id optional
player_id optional
ranked_only optional
```

### Create Match

```http
POST /matches
```

Request:

```json
{
  "session_id": "uuid",
  "match_type": "doubles",
  "is_ranked": true,
  "team_1": {
    "player_ids": ["uuid", "uuid"],
    "score": 11
  },
  "team_2": {
    "player_ids": ["uuid", "uuid"],
    "score": 8
  }
}
```

Response:

```json
{
  "id": "uuid",
  "session_id": "uuid",
  "match_type": "doubles",
  "is_ranked": true,
  "status": "completed",
  "team_1": {
    "players": [
      { "id": "uuid", "display_name": "Mike" },
      { "id": "uuid", "display_name": "Alex" }
    ],
    "score": 11,
    "is_winner": true
  },
  "team_2": {
    "players": [
      { "id": "uuid", "display_name": "John" },
      { "id": "uuid", "display_name": "Chris" }
    ],
    "score": 8,
    "is_winner": false
  },
  "rating_events": [
    {
      "player_id": "uuid",
      "rating_before": 1000,
      "rating_after": 1012.4,
      "rating_change": 12.4
    }
  ]
}
```

### Match Validation Rules

When creating a match:

- Session must exist.
- All players must exist.
- All selected players must be active.
- For MVP doubles, each team must have exactly two players.
- There must be four unique players.
- Team scores cannot be equal.
- Scores cannot be negative.
- Winner is inferred from higher score.
- `match_type` should be `doubles` for MVP.
- If `is_ranked = true`, apply Elo rating changes.
- If `is_ranked = false`, save match but do not update ratings.

### Get Match

```http
GET /matches/{match_id}
```

### Update Match

```http
PATCH /matches/{match_id}
```

For MVP, match editing can be limited.

Recommended behavior:

- If a ranked match is edited after rating events were created, recalculate ratings carefully or temporarily block editing ranked completed matches.
- Simpler MVP option: allow voiding and re-entering instead of editing ranked match results.

### Void Match

```http
DELETE /matches/{match_id}
```

Recommended behavior:

- Set `status = 'voided'`.
- For MVP, avoid deleting match rows.
- If the match was ranked, decide whether to recalculate all subsequent ratings or block voiding ranked matches until recalculation logic exists.

Preferred MVP rule:

- Allow deleting/voiding only the most recent ranked match.
- When voiding the most recent ranked match, reverse its rating events.
- For older ranked matches, return an error that historical recalculation is not implemented yet.

---

## 12. Stats APIs

### Get Player Stats

```http
GET /stats/players
```

Response:

```json
[
  {
    "player_id": "uuid",
    "display_name": "Mike",
    "games_played": 12,
    "wins": 8,
    "losses": 4,
    "win_percentage": 0.667,
    "points_for": 124,
    "points_against": 99,
    "point_differential": 25,
    "avg_points_for": 10.33,
    "avg_points_against": 8.25,
    "current_streak": "W3"
  }
]
```

### Get Single Player Stats

```http
GET /stats/players/{player_id}
```

Should include:

- Overall stats
- Recent form
- Match history
- Rating history

### Get Team Stats

```http
GET /stats/teams
```

Team stats should be derived from pairings.

Response example:

```json
[
  {
    "player_1_id": "uuid",
    "player_1_name": "Mike",
    "player_2_id": "uuid",
    "player_2_name": "Alex",
    "games_played": 6,
    "wins": 5,
    "losses": 1,
    "win_percentage": 0.833,
    "point_differential": 20
  }
]
```

### Head-to-Head Stats

```http
GET /stats/head-to-head?player_a_id=uuid&player_b_id=uuid
```

This should eventually support rivalry tracking.

MVP can defer this unless easy to implement.

---

## 13. Ranking APIs

### Current Rankings

```http
GET /rankings/current
```

Response:

```json
[
  {
    "rank": 1,
    "player_id": "uuid",
    "display_name": "Mike",
    "rating": 1084.2,
    "rating_change_last_session": 24.6,
    "games_played": 12,
    "wins": 8,
    "losses": 4,
    "win_percentage": 0.667
  }
]
```

### Player Rating History

```http
GET /rankings/history/{player_id}
```

Response:

```json
[
  {
    "date": "2026-05-30T15:20:00Z",
    "rating": 1000,
    "rating_change": 0
  },
  {
    "date": "2026-05-30T15:45:00Z",
    "rating": 1012.4,
    "rating_change": 12.4
  }
]
```

### All Rating Trends

```http
GET /rankings/history
```

Optional query params:

```text
player_ids optional comma-separated
```

Use this for dashboard charting.

---

## 14. Dashboard API

### Dashboard Summary

```http
GET /dashboard/summary
```

Response:

```json
{
  "top_player": {
    "player_id": "uuid",
    "display_name": "Mike",
    "rating": 1084.2
  },
  "biggest_mover": {
    "player_id": "uuid",
    "display_name": "Sarah",
    "rating_change": 32.7
  },
  "best_win_percentage": {
    "player_id": "uuid",
    "display_name": "Alex",
    "win_percentage": 0.75,
    "games_played": 8
  },
  "most_games_played": {
    "player_id": "uuid",
    "display_name": "John",
    "games_played": 16
  },
  "leaderboard": [
    {
      "rank": 1,
      "player_id": "uuid",
      "display_name": "Mike",
      "rating": 1084.2,
      "wins": 8,
      "losses": 4,
      "win_percentage": 0.667
    }
  ],
  "recent_matches": [
    {
      "match_id": "uuid",
      "session_date": "2026-05-30",
      "team_1_names": ["Mike", "Alex"],
      "team_1_score": 11,
      "team_2_names": ["John", "Chris"],
      "team_2_score": 8,
      "winner_team_number": 1
    }
  ],
  "rating_trends": [
    {
      "player_id": "uuid",
      "display_name": "Mike",
      "points": [
        { "date": "2026-05-30", "rating": 1000 },
        { "date": "2026-06-06", "rating": 1040 }
      ]
    }
  ]
}
```

---

## 15. Elo Ranking Logic

### Starting Rating

Every player starts with rating:

```text
1000
```

### K-Factor

Use:

```text
K = 32
```

This can later become configurable.

### Team Rating

For doubles:

```text
team_rating = average(player ratings on team)
```

Example:

```text
Team 1: Mike 1020, Alex 980
Team 1 rating = 1000
```

### Expected Score

Use standard Elo expected probability:

```text
expected_team_1 = 1 / (1 + 10 ^ ((team_2_rating - team_1_rating) / 400))
expected_team_2 = 1 - expected_team_1
```

### Actual Score

Winner:

```text
actual = 1
```

Loser:

```text
actual = 0
```

### Rating Change

```text
rating_change = K * (actual - expected)
```

Each player on the same team receives the same rating change.

Example:

```text
Team 1 expected = 0.50
Team 1 wins
Rating change = 32 * (1 - 0.50) = +16
Each player on Team 1 gains 16
Each player on Team 2 loses 16
```

### Optional Future Adjustment

Later, margin of victory may be incorporated.

Do not include margin of victory in MVP unless requested.

Reason: basic Elo is simpler, explainable, and less prone to weird incentives.

---

## 16. Business Logic Details

### Creating a Player

When creating a player:

1. Insert player row.
2. Insert player_ratings row with rating 1000.
3. Return player response including rating.

### Creating a Match

When creating a ranked match:

1. Validate session exists.
2. Validate all players exist and are active.
3. Validate teams.
4. Validate scores.
5. Create match row.
6. Create two match_team rows.
7. Create four match_team_player rows.
8. Determine winner.
9. Load current player ratings.
10. Calculate team ratings.
11. Calculate expected result.
12. Calculate rating change.
13. Update player_ratings for all players.
14. Create rating_events for all players.
15. Return match response with rating events.

When creating an unranked match:

- Do steps 1 through 8.
- Do not update ratings.
- Do not create rating_events.

### Calculating Stats

Stats should be derived from completed, non-voided matches.

For player stats:

- A game played is any completed match where the player appears on either team.
- A win is a completed match where the player's team is winner.
- A loss is a completed match where the player's team is loser.
- Points for are the player's team score.
- Points against are the opposing team score.
- Point differential is points for minus points against.

### Current Streak

Current streak should be calculated from most recent matches backward.

Examples:

- `W3` means won last three matches.
- `L2` means lost last two matches.
- `-` means no matches played.

---

## 17. Backend Testing Requirements

Use Pytest.

Minimum tests:

### Player Tests

- Can create player
- New player starts with 1000 rating
- Can list active players
- Can deactivate player
- Deactivated player does not appear in active-only list

### Session Tests

- Can create session
- Can list sessions
- Can get session detail

### Match Validation Tests

- Cannot create match with missing session
- Cannot create match with inactive player
- Cannot create doubles match with fewer than four players
- Cannot create match with duplicate player
- Cannot create match with tied score
- Cannot create match with negative score
- Winner is inferred correctly

### Ranking Tests

- Ranked match updates player ratings
- Unranked match does not update player ratings
- Rating events are created for ranked matches
- Rating events are not created for unranked matches
- Underdog win gives larger rating gain than favorite win

### Stats Tests

- Games played calculates correctly
- Wins/losses calculate correctly
- Points for/against calculate correctly
- Win percentage calculates correctly
- Current streak calculates correctly

---

## 18. Frontend Pages

### `/dashboard`

Primary landing page.

Show:

- Stat cards
- Current leaderboard
- Recent matches
- Rating trend chart

### `/players`

Show:

- List/table of players
- Current rating
- Win/loss record
- Add player button

### `/players/[id]`

Show:

- Player profile
- Current rating
- Rank
- Win/loss record
- Point differential
- Rating trend
- Recent matches

### `/sessions`

Show:

- List of sessions
- Session date
- Location
- Match count
- Create session button

### `/sessions/[id]`

Show:

- Session detail
- Matches for that session
- Add match button
- Session leaderboard if easy

### `/matches/new`

Show match entry form.

The form should make it easy to quickly enter results after games.

Fields:

- Session
- Team 1 Player 1
- Team 1 Player 2
- Team 1 Score
- Team 2 Player 1
- Team 2 Player 2
- Team 2 Score
- Ranked toggle
- Save button

### `/rankings`

Show:

- Full leaderboard
- Rating
- Rank
- Change
- Record
- Win percentage

---

## 19. Frontend Project Structure

Use this structure:

```text
frontend/
  app/
    page.tsx
    dashboard/
      page.tsx
    players/
      page.tsx
      [id]/
        page.tsx
    sessions/
      page.tsx
      [id]/
        page.tsx
    matches/
      new/
        page.tsx
    rankings/
      page.tsx
  components/
    ui/
    layout/
      AppShell.tsx
      Sidebar.tsx
      Header.tsx
    dashboard/
      DashboardStatCard.tsx
      LeaderboardPreview.tsx
      RecentMatches.tsx
      RatingTrendChart.tsx
    players/
      PlayerTable.tsx
      PlayerCard.tsx
      PlayerForm.tsx
    sessions/
      SessionTable.tsx
      SessionForm.tsx
      SessionMatchList.tsx
    matches/
      MatchResultForm.tsx
      TeamSelector.tsx
    rankings/
      RankingsTable.tsx
  lib/
    api.ts
    queryClient.ts
    types.ts
    formatters.ts
```

---

## 20. UI Requirements

The UI should feel polished, modern, and sports-oriented.

### General Style

- Clean dashboard layout
- Card-based sections
- Responsive design
- Mobile-friendly match entry
- Dark mode preferred
- Use shadcn/ui components
- Use Tailwind utility classes
- Use clear typography
- Use good spacing

### Dashboard UI

Dashboard should include:

- Large title
- Summary stat cards
- Leaderboard table
- Recent matches card
- Rating trend chart

Example stat cards:

- King of the Court
- Biggest Mover
- Best Win %
- Most Games Played

### Match Entry UI

Match entry should prioritize speed.

Requirements:

- Prevent selecting the same player twice
- Make score inputs easy on mobile
- Show validation errors clearly
- Show success toast after saving
- Allow quickly entering another match

### Rankings UI

Leaderboard should show:

- Rank
- Player
- Rating
- Rating change
- Record
- Win percentage

Highlight:

- Top player
- Positive rating movement
- Negative rating movement

---

## 21. Data Fetching Strategy

Use TanStack Query.

Suggested query keys:

```text
['players']
['player', playerId]
['sessions']
['session', sessionId]
['matches', filters]
['rankings', 'current']
['rankings', 'history', playerId]
['dashboard', 'summary']
```

After creating a match, invalidate:

```text
['matches']
['rankings', 'current']
['dashboard', 'summary']
['players']
['sessions']
```

---

## 22. MVP Implementation Phases

### Phase 0: Project Setup

Backend:

- Create FastAPI project
- Add health endpoint
- Configure SQLAlchemy
- Configure Alembic
- Configure Postgres connection
- Add Docker Compose for Postgres

Frontend:

- Create Next.js app
- Add Tailwind
- Add shadcn/ui
- Add app shell layout
- Add API client foundation

Success criteria:

- Backend health check works
- Frontend home page loads
- Backend connects to database
- Alembic migration runs

### Phase 1: Players

Backend:

- Player model
- Player schemas
- Player routes
- Player service
- Player rating creation on player create
- Tests

Frontend:

- Players page
- Add player form
- Player table

Success criteria:

- User can add players
- Players appear in table
- Each player starts at 1000 rating

### Phase 2: Sessions

Backend:

- Session model
- Session schemas
- Session routes
- Session service
- Tests

Frontend:

- Sessions page
- Create session form
- Session detail page

Success criteria:

- User can create weekly session
- User can view session detail

### Phase 3: Match Entry

Backend:

- Match models
- Match schemas
- Match validation
- Match creation service
- Match list endpoint
- Tests

Frontend:

- New match form
- Team selector
- Session match list

Success criteria:

- User can record doubles match result
- Match appears under session
- Invalid matches are blocked

### Phase 4: Elo Rankings

Backend:

- PlayerRating model
- RatingEvent model
- RankingService
- Apply Elo updates after ranked match
- Ranking endpoints
- Tests

Frontend:

- Rankings page
- Rating display on players table

Success criteria:

- Ranked match changes ratings
- Unranked match does not change ratings
- Leaderboard updates after match entry

### Phase 5: Stats

Backend:

- Stats service
- Player stats endpoint
- Team stats endpoint
- Tests

Frontend:

- Stats columns on players page
- Player profile stats

Success criteria:

- Wins/losses/points/win percentage are correct

### Phase 6: Dashboard

Backend:

- Dashboard summary endpoint
- Recent matches data
- Top player
- Biggest mover
- Rating trends

Frontend:

- Dashboard page
- Stat cards
- Leaderboard preview
- Recent matches
- Rating trend chart

Success criteria:

- Dashboard gives a useful overview of the league

### Phase 7: Polish

Backend:

- Improve error messages
- Add seed script
- Add more tests

Frontend:

- Loading states
- Empty states
- Error states
- Toast notifications
- Mobile polish

Success criteria:

- App feels usable by friends

---

## 23. Seed Data

Create a seed script for local development.

It should create:

- 8 sample players
- 2 sessions
- 10 sample matches
- Rating events from ranked matches

Example players:

```text
Mike
Alex
John
Chris
Sarah
Dan
Rob
Kevin
```

This allows the dashboard to look realistic during development.

---

## 24. Error Handling

Use consistent error responses.

Example:

```json
{
  "detail": {
    "code": "DUPLICATE_PLAYER_IN_MATCH",
    "message": "A player cannot appear more than once in the same match."
  }
}
```

Recommended error codes:

```text
PLAYER_NOT_FOUND
SESSION_NOT_FOUND
MATCH_NOT_FOUND
INACTIVE_PLAYER
DUPLICATE_PLAYER_IN_MATCH
INVALID_TEAM_SIZE
TIED_SCORE_NOT_ALLOWED
NEGATIVE_SCORE_NOT_ALLOWED
UNSUPPORTED_MATCH_TYPE
RANKED_MATCH_EDIT_NOT_ALLOWED
```

---

## 25. Configuration

Backend environment variables:

```text
DATABASE_URL
APP_ENV
CORS_ORIGINS
ELO_STARTING_RATING
ELO_K_FACTOR
```

Defaults:

```text
ELO_STARTING_RATING=1000
ELO_K_FACTOR=32
```

---

## 26. Authentication Strategy

Do not implement full authentication in the first backend milestone unless explicitly requested.

MVP local version can run without auth.

For deployed private version, use one of these simple options:

### Option A: Shared Access Code

- Simple app-level access code
- Good enough for small private group

### Option B: Basic Login

- Email/password or magic link
- More work but cleaner long term

### Option C: Google OAuth

- Convenient but unnecessary for MVP

Recommended path:

1. No auth for local MVP
2. Add simple shared access code before deploying to friends
3. Add real auth only if needed

---

## 27. Future Features

### Tournaments

Add later.

Potential tournament features:

- Create tournament
- Add players or teams
- Round robin format
- Single elimination format
- Seeding
- Bracket view
- Tournament champion history

### Team Balancer

Given available players, generate balanced teams based on ratings.

Inputs:

- Available player IDs
- Current ratings
- Optional avoid-repeat-partners flag

Output:

- Suggested balanced matchups

### Rivalry Tracker

Show head-to-head player history.

Examples:

- Mike vs John: Mike leads 8-5
- Sarah has won last 3 against Alex

### Duo Stats

Track best teammate pairings.

Examples:

- Mike + Alex: 8-2 record
- Sarah + Dan: +42 point differential

### Badges

Fun achievements:

- Hot Hand: 5 wins in a row
- Upset Alert: Beat a much higher-rated team
- Ironman: Most games played
- Clutch: Best record in close games

### Weekly Recap

Generate a recap after each session.

Example:

```text
This week Mike reclaimed the #1 spot after going 5-1. Sarah had the biggest jump at +32 rating points. The match of the week was Mike/Alex over John/Chris, 12-10.
```

### PWA

Before native mobile, make the webapp mobile-friendly and installable.

- Add to home screen
- Mobile-first match entry
- Fast dashboard

---

## 28. Codex Implementation Instructions

When implementing this project, proceed incrementally.

Do not generate the entire application in one step.

For each phase:

1. State the files that will be created or modified.
2. Implement only the current phase.
3. Include tests where applicable.
4. Explain how to run the code.
5. Do not skip migrations.
6. Do not put business logic directly in route handlers.
7. Keep API responses typed with Pydantic schemas.
8. Keep frontend components reusable.
9. Do not implement tournaments until the MVP is complete.
10. Do not implement advanced auth until the MVP works locally.

Recommended first task for Codex:

```text
Create the initial backend FastAPI project for PickleRank using SQLAlchemy 2.0, Alembic, PostgreSQL, and a /health endpoint. Include a Docker Compose file for Postgres, database config, and instructions for running locally. Do not implement players or matches yet.
```

Recommended second task:

```text
Implement Phase 1: Player management. Add the Player and PlayerRating models, Alembic migration, Pydantic schemas, player service, player routes, and tests. Creating a player must also create a PlayerRating row with starting rating 1000.
```

---

## 29. Definition of Done for MVP

The MVP is complete when:

- Players can be created and managed.
- Sessions can be created and viewed.
- Doubles match results can be entered.
- Invalid matches are rejected.
- Ranked matches update Elo ratings.
- Unranked matches do not update ratings.
- Current leaderboard works.
- Player stats are calculated correctly.
- Dashboard shows useful league summary.
- App has clean, usable UI.
- Backend tests cover core match, stats, and ranking logic.
- App can run locally with clear setup instructions.

---

## 30. MVP Summary

Build the app around this core flow:

```text
Players -> Sessions -> Matches -> Stats -> Rankings -> Dashboard
```

Do not start with tournaments.

Do not overbuild authentication.

Do not make the frontend responsible for official stats or ranking logic.

Focus on a polished, useful private league tracker that makes weekly pickleball more fun.

