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

## Run Locally

Open `index.html` directly in a browser, or run a local server:

```sh
npm run dev
```

Then open:

```txt
http://127.0.0.1:4173/index.html
```

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

This is currently a dependency-free static prototype. If the app grows, a good next step is moving it to a component-based structure such as Vite + React or Vue.
