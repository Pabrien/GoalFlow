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

## Run Locally

Run a local server:

```sh
npm run dev
```

Then open:

```txt
http://127.0.0.1:4173/index.html
```

Avoid opening `index.html` with a `file://` URL while developing. Some browser environments restrict local file behavior, which can make interactions or saved state feel broken.

## Project Structure

```txt
todo-ui/
  index.html
  styles.css
  app.js
  docs/
    product-notes.md
  .vscode/
    settings.json
    extensions.json
```

## Development Notes

This is currently a dependency-free static prototype. Data is persisted locally in the browser, so clearing browser storage will reset the app.

## AI Today Planner

The app includes an optional AI planner endpoint for Vercel.

1. Import this repository into Vercel.
2. Add `OPENAI_API_KEY` in Vercel project environment variables.
3. Optional: add `OPENAI_MODEL` to override the default model.
4. Deploy the project and open the Vercel URL.

The GitHub Pages version remains static. It can show the AI button, but a serverless deployment is required for the real AI request because API keys must not be exposed in browser code.

If the app grows, good next steps are:

- Move to a component-based structure such as Vite + React or Vue
- Add real notification support
- Add cloud sync and login
