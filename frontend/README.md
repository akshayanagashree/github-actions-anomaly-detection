# GitHub Actions Anomaly Detection - Frontend Application

Welcome to the frontend application for the **Machine Learning-Based Discovery of Anomalous Structural Changes in GitHub Actions Workflows** project.

This application is built and maintained by **Partner B** using **React**, **Vite**, and **Tailwind CSS**.

---

## 📁 Directory Architecture

```text
frontend/
├── public/                 # Static assets served directly (e.g., favicon, icons)
├── src/
│   ├── assets/             # Images, SVG graphics, and brand assets
│   ├── components/         # Reusable React components
│   │   ├── common/         # Generic UI blocks (StatCard, Badge, Button, Alert)
│   │   └── layout/         # Application shell, Sidebar, TopHeader
│   ├── pages/              # Route views (Dashboard, Upload, Results, Comparison, History)
│   ├── services/           # Backend API integration layer (apiClient.js, analysisService.js)
│   ├── hooks/              # Custom reusable React hooks (e.g., useAnalysis)
│   ├── utils/              # Pure utility functions (formatting, date parsing, anomaly calculations)
│   ├── data/               # MOCK data fixtures (strictly separated from live backend data)
│   ├── styles/             # Global CSS and Tailwind CSS directives
│   ├── test/               # Component and unit tests using Vitest and Testing Library
│   ├── App.jsx             # Root application component & layout coordinator
│   └── main.jsx            # Entry point initializing React DOM
├── .env.example            # Template for environment configuration
├── .gitignore              # Ignores node_modules, build outputs, and local env files
├── index.html              # HTML shell containing the root DOM element
├── package.json            # Node.js project manifest & dependencies
├── postcss.config.js       # PostCSS configuration for Tailwind CSS
├── tailwind.config.js      # Custom theme colors and cybersecurity styling
└── vite.config.js          # Vite build and Vitest test runner configuration
```

---

## 🚀 Available Scripts

From inside the `frontend/` directory, you can run:

### `npm install`
Installs all project dependencies specified in `package.json`.

### `npm run dev`
Starts the Vite development server locally at `http://localhost:3000` with fast Hot Module Replacement (HMR).

### `npm run build`
Compiles and optimizes the React application into static production assets inside the `dist/` directory.

### `npm run test`
Runs all unit and component tests using **Vitest** in single-run mode.

### `npm run test:watch`
Runs tests in interactive watch mode, re-running tests whenever a source file changes.

### `npm run preview`
Locally previews the production build created by `npm run build`.

---

## 💡 Beginner's Guide: Core Concepts Explained

### 1. What is React?
React is a JavaScript library for building user interfaces. Instead of manually updating HTML elements with `document.getElementById`, React allows you to build **components**—independent, reusable pieces of code that define what a part of the screen should look like based on data.

### 2. What is JSX?
JSX stands for JavaScript XML. It is a syntax extension that lets you write HTML-like elements directly inside JavaScript files.
Example:
```jsx
// This looks like HTML, but it's JavaScript!
function WelcomeBadge({ name }) {
  return <div className="p-2 bg-blue-900 text-white rounded">Hello, {name}!</div>;
}
```
Under the hood, Vite converts JSX into standard JavaScript function calls (`React.createElement`).

### 3. What is Vite?
Vite is a fast modern build tool. In older tools (like Create React App / Webpack), the entire application had to be bundled together before you could preview a single change. Vite uses native browser ES modules during development, meaning changes appear instantly without restarting the server.

### 4. What are Components, Props, and State?
- **Component**: A JavaScript function that returns JSX (e.g., `Header`, `StatCard`, `Dashboard`).
- **Props (Properties)**: Arguments passed into a component from its parent (like arguments to a function). They are read-only.
- **State**: Data stored inside a component that can change over time (e.g., the currently selected file, or whether a loading spinner is visible). When state changes, React re-renders that component.

### 5. What is Tailwind CSS?
Tailwind CSS provides single-purpose utility classes (like `bg-slate-900`, `text-white`, `p-4`, `flex`). Rather than writing custom CSS rules in `.css` files, you style components directly in JSX. This keeps styles scoped, maintainable, and uniform across the application.

---

## 🔒 Cybersecurity Design Language

To represent a professional security monitoring platform:
- Base tones: Dark slate palette (`slate-950`, `slate-900`, `slate-800`).
- Semantic alerts:
  - 🟢 **Safe / Normal**: Emerald (`#10B981`)
  - 🟡 **Suspicious / Moderate Anomaly**: Amber (`#F59E0B`)
  - 🔴 **High Anomaly / Dangerous Structural Change**: Rose / Red (`#EF4444`)
  - 🔵 **Baseline / System**: Blue (`#3B82F6`)

---

## 🤝 Collaboration & Backend Integration

- **Partner B Branch**: `feature/frontend`
- **FastAPI Integration**: Fully integrated in **Phase 7** and verified in **Phase 8**.
- **Live API Service Layer**: Isolated in `src/services/analysisService.js` and `src/services/apiClient.js`.
- **Integrated Endpoints**:
  - `POST /api/analyze`: Multipart `FormData` file upload with optional baseline comparison.
  - `GET /api/history`: SQLite query for previous workflow analysis records.
  - `GET /api/results/{id}`: Detailed retrieval of single analysis by UUID.
  - `GET /api/health`: Periodic health and ML model status verification.
- **Contract & Review Documentation**:
  - `docs/api_contract.md`: Full FastAPI contract specifications.
  - `docs/frontend_review_and_test_report.md`: Complete review, a11y audit, and integration report.
  - `PROJECT_HANDOVER.md`: Master handover document and status ledger.
