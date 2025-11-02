# My Vite App

This is a Vite application built with React and TypeScript. Below are the instructions for setting up and running the project.

## Getting Started

To get started with this project, follow the steps below:

### Prerequisites

Make sure you have the following installed on your machine:

- Node.js (version 14 or higher)
- npm (comes with Node.js)

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd my-vite-app
   ```

2. Install the dependencies:

   ```bash
   npm install
   ```

### Running the Application

To start the development server, run:

```bash
npm run dev
```

This will start the Vite development server, and you can view the application in your browser at `http://localhost:3000`.

### Building for Production

To build the application for production, run:

```bash
npm run build
```

This will create an optimized build of your application in the `dist` directory.

### Folder Structure

- `index.html`: Main HTML file for the application.
- `package.json`: Configuration file for npm.
- `tsconfig.json`: TypeScript configuration file.
- `vite.config.ts`: Vite configuration file.
- `public/manifest.json`: Web app manifest.
- `src/`: Contains the source code for the application.
  - `main.tsx`: Entry point for the React application.
  - `App.tsx`: Main App component.
  - `components/`: Contains React components.
  - `styles/`: Contains global CSS styles.
  - `types/`: Contains TypeScript type declarations.

### License

This project is licensed under the MIT License. See the LICENSE file for more details.