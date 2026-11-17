# CodeLens

### AI-Powered Code Explanation & Learning Platform

CodeLens is an AI-powered web application designed to help developers understand, analyze and improve their code. It uses Google's Gemini AI to provide code explanations, debugging assistance and concept-based learning in a simple, interactive workspace.

**Live Demo:** https://code-lens-gamma-coral.vercel.app/

**GitHub Repository:** https://github.com/yashtiwari9320-a11y/CodeLens

---

## Features

- **AI Code Explanation:** Understand code with clear, structured explanations.
- **Debugging Assistance:** Identify potential errors and receive suggestions to fix them.
- **Concept Learning:** Explore programming concepts related to submitted code.
- **Multi-language Support:** Work with Python, C, C++ and JavaScript.
- **Code Saving:** Save useful code snippets for future reference.
- **Analysis History:** Access previous code analyses.
- **Dashboard:** View analysis statistics, recent activity and saved snippets.
- **Personalized Settings:** Configure the default programming language and interface theme.
- **Responsive Interface:** Access the application across desktop and mobile devices.

## Tech Stack

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development and build tool |
| CSS | Styling and responsive layouts |
| Node.js | Backend runtime |
| Express.js | Backend API |
| Google Gemini AI | AI-powered code analysis |
| LocalStorage | Client-side data persistence |
| Vercel | Frontend deployment |
| Render | Backend hosting |

## Application Architecture

CodeLens follows a frontend-backend architecture.

1. The user enters code and selects a programming language.
2. The React frontend sends the request to the Express backend.
3. The backend communicates with Google's Gemini AI.
4. Gemini generates the requested analysis.
5. The backend returns the response to the frontend.
6. The application displays the result and stores relevant history locally.

## Getting Started

### Prerequisites

- Node.js and npm installed.
- Git installed.
- A Google Gemini API key.

### 1. Clone the Repository

```bash
git clone https://github.com/yashtiwari9320-a11y/CodeLens.git
```

### 2. Navigate to the Project

```bash
cd CodeLens
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure the Backend

Navigate to the backend directory and install its dependencies.

```bash
cd backend
npm install
```

Create a `.env` file and configure the Gemini API key using the environment variable name expected by your backend source code.

**Important:** Never upload API keys or private environment files to GitHub.

### 5. Run the Application

Start the backend and frontend using their respective development commands.

```bash
npm run dev
```

Use the backend's configured start command to run the API server separately.

## Project Structure

```text
CodeLens/
│
├── backend/
│   ├── server.js
│   └── package.json
│
├── src/
│   ├── App.jsx
│   ├── App.css
│   └── ...
│
├── public/
├── package.json
└── README.md
```

*Note: Update this structure if your actual project folders or filenames differ.*

## Key Learning Outcomes

Developing CodeLens provided practical experience in:

- Building responsive interfaces using React.
- Managing application state with React Hooks.
- Integrating third-party AI APIs.
- Developing backend APIs using Express.js.
- Connecting frontend and backend services.
- Managing application data with LocalStorage.
- Deploying applications using Vercel and Render.
- Using Git and GitHub for version control.

## Future Enhancements

- User authentication and personalized accounts.
- Support for additional programming languages.
- Code execution and output preview.
- Exportable analysis reports.
- More advanced code quality and optimization suggestions.

## Author

**Yash Tiwari**

BSc Information Technology Student

[GitHub](https://github.com/yashtiwari9320-a11y)

---

*CodeLens is an educational project developed to make programming concepts easier to understand through AI-powered assistance.*