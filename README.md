# GoalFlow

GoalFlow is a goal-based planner that turns long-term goals into today’s next action.

## Features

- Create goals with category, deadline, and notes
- Add and remove custom category suggestions
- Save reusable tasks
- Drag saved tasks into weekly or monthly calendar views
- Tap a saved task's date action to schedule it when drag is awkward on mobile
- Track today's, weekly, and overall completion rates
- View progress with bar charts, a completion pie chart, and a goal report table
- Data is saved in the browser with `localStorage`
- First-run onboarding guides users through goal -> task -> today
- Focused pages for Home, Progress, Goals, Schedule, and Today
- Quiet motion and completion feedback with GSAP
- PWA manifest, app icon, and service worker

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
  ios/
    GoalFlow/
      GoalFlow.xcodeproj
      GoalFlow/
  icons/
  docs/
    product-notes.md
  .vscode/
    settings.json
    extensions.json
```

## Development Notes

This is currently a static prototype. Data is persisted locally in the browser, so clearing browser storage will reset the app.

The public app should be opened through a web server or GitHub Pages URL. The UI no longer shows local-server warnings on the page.

## iOS Prototype

A native SwiftUI prototype is available at `ios/GoalFlow/GoalFlow.xcodeproj`.

It includes goals, actions, scheduling, today's tasks, progress, local JSON persistence, and basic haptic feedback.

If the app grows, good next steps are:

- Move to a component-based structure such as Vite + React or Vue
- Add push notification scheduling on a backend
- Add cloud sync and login
- Add cross-device sync for goals, tasks, and progress
