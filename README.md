# GoalFlow

GoalFlow is a simple goal-based task planner for workouts, study, and habit building.

## Features

- Create goals with category, deadline, and notes
- Save reusable tasks
- Drag saved tasks into weekly or monthly calendar views
- Set reminder timing on each task
- Track today's, weekly, and overall completion rates
- View progress with bar charts, a completion pie chart, and a goal report table
- Data is saved in the browser with `localStorage`
- First-run onboarding guides users through goal -> task -> today
- Mobile-focused navigation with touch-friendly controls
- PWA manifest, app icon, service worker, and notification permission test

## Run Locally

Run a local server:

```sh
npm run dev
```

Then open:

```txt
http://127.0.0.1:4174/index.html
```

To preview on another device on the same Wi-Fi, open the Mac's local IP address with the same port, for example:

```txt
http://192.168.0.4:4174/index.html
```

Avoid opening `index.html` with a `file://` URL while developing. Some browser environments restrict local file behavior, which can make interactions or saved state feel broken.

## Project Structure

```txt
todo-ui/
  index.html
  styles.css
  app.js
  manifest.webmanifest
  sw.js
  icons/
  docs/
    product-notes.md
  .vscode/
    settings.json
    extensions.json
```

## Development Notes

This is currently a dependency-free static prototype. Data is persisted locally in the browser, so clearing browser storage will reset the app.

PWA support is included. On iPhone, notifications require adding GoalFlow to the Home Screen and opening it from that icon. The current notification button verifies permission and sends a test notification; real scheduled reminders will need a push backend.

If the app grows, good next steps are:

- Move to a component-based structure such as Vite + React or Vue
- Add push notification scheduling on a backend
- Add cloud sync and login
