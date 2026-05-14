# AGENTS.md instructions for Ltryi_database

## Encoding Rules
- Read and write files with explicit UTF-8 encoding.
- Preserve existing BOM state when editing existing files.
- Current checked files:
  - `server.js`: UTF-8 no BOM
  - `package.json`: UTF-8 no BOM
  - `AGENTS.md`: UTF-8 no BOM
- Do not use implicit/default encodings for scripted edits.

## Current Live Ink State
- Socket.IO realtime relay has already been applied.
- `package.json` includes `socket.io`.
- `server.js` now creates an HTTP server with `http.createServer(app)` and attaches Socket.IO to that server.
- Existing Express REST APIs still use the same `app`; startup is now `server.listen(process.env.PORT || 3000, ...)`.
- Test page exists at `public/live-ink-test.html`.
- Health endpoint exists at `/api/live-ink/health`.

## Realtime Relay Behavior
- Clients connect with Socket.IO query values like `{ roomId, role }`.
- Valid roles are `teacher`, `student`, and `viewer`; unknown roles become `viewer`.
- `roomId` is trimmed and limited to 120 characters.
- The relay is volatile only. It does not write strokes/events to DB.
- Events are broadcast only to other sockets in the same room with `socket.to(roomId).emit(...)`.
- The sender does not receive its own event back from the server, so clients should render local actions immediately.

## Open Event Names
- The server currently relays:
  - `live-event`
  - `ink-start`
  - `ink-move`
  - `ink-end`
  - `star`
  - `clear-ink`
- To create a brand-new event name, add it to `LIVE_INK_EVENTS` in `server.js`.
- To send more data on an existing event, no server change is needed.
- Prefer `live-event` for flexible frontend experiments, with a payload `type` field such as `star`, `stroke`, `cursor`, `answer`, or `page-sync`.

## Payload Freedom
- The relay forwards arbitrary object fields from the client payload.
- Server-added/overridden fields:
  - `roomId`
  - `senderId`
  - `senderRole`
  - `serverTime`
- Avoid relying on the client to control those four fields after relay.
- Suggested normalized coordinate fields remain `x` and `y` in `0..1`, but frontend code may add any extra fields it needs, such as `pageId`, `lessonId`, `tool`, `color`, `size`, `points`, `pressure`, `target`, or `action`.

## Local Test
- Start the server:
  - `node server.js`
- Open two browser tabs:
  - `http://localhost:3000/live-ink-test.html`
- Use the same room id in both tabs and draw/star/clear from one tab.
- The other tab should receive the relay.
