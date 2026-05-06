MutualServerCounter

A lightweight BetterDiscord plugin that displays mutual server counts directly beside usernames in chat.

Instead of opening user profiles manually, MutualServerCounter instantly shows how many servers you share with other users, complete with color-coded indicators and optional hover tooltips listing mutual guild names.

Features
Displays mutual server counts beside usernames in chat
Color-coded badges based on mutual server count
Hover tooltip showing shared server names
Lightweight and fully client-side
Automatically updates while scrolling chat
No external API requests
No token usage or account modification
Badge Colors
Count	Color
0–2	Gray
3–10	Yellow
11–30	Green
30+	Purple
Example
JohnDoe   [18 Mutual]

Hovering the badge displays:
Notes
Mutual server counts are calculated locally using Discord's cached guild/member stores
No external services are used
Does not send or collect user data
Designed to remain lightweight and low-overhead

Known Limitations
Discord internal updates may occasionally require selector/store adjustments
Extremely large server lists may slightly increase processing time
Some usernames rendered in uncommon layouts may not inject properly

Disclaimer
This plugin is intended for informational and quality-of-life purposes only. It does not bypass Discord permissions, moderation systems, or privacy restrictions.
