# Gemini Productivity Guide: BIM Viewer

This document provides a quick overview of the project structure, key technologies, and common commands to streamline development with the Gemini CLI.

## Project Overview

This project is a web-based BIM viewer with a React frontend and a Node.js Azure Functions backend.

-   **Frontend:** A [React](https://react.dev/) application built with [Vite](https://vitejs.dev/) and written in [TypeScript](https://www.typescriptlang.org/). It handles the user interface and 3D visualization.
-   **Backend:** A serverless API built with [Azure Functions](https://azure.microsoft.com/en-us/products/functions/) for Node.js. It likely handles data processing, and interactions with other services.

## Key Libraries & Technologies

### Frontend
-   **`@thatopen/*`**: The core suite of libraries for BIM functionalities.
    -   `@thatopen/components`: Core components for building the BIM viewer.
    -   `@thatopen/components-front`: Frontend-specific components.
    -   `@thatopen/fragments`: For handling IFC model fragments.
    -   `@thatopen/ui`: UI components for the viewer.
-   **`three`**: A 3D graphics library for rendering scenes in the browser.
-   **`web-ifc`**: For parsing and handling Industry Foundation Classes (IFC) files directly in the browser.
-   **`react`**: The primary UI library.
-   **`vite`**: The build tool and development server.

### Backend (API)
-   **`@azure/functions`**: The framework for building serverless functions on Azure.
-   **`@azure/storage-blob`**: For interacting with Azure Blob Storage.

## Development Commands

To run these commands, use the `run_shell_command` tool.

### Frontend (from the root directory: `D:/Bridges/bridges-Bim-Viewer/`)

-   **`npm run dev`**: Starts the Vite development server for the frontend.
-   **`npm run build`**: Compiles the TypeScript and builds the frontend for production.
-   **`npm run lint`**: Lints the frontend code using ESLint.
-   **`npm run preview`**: Serves the production build locally for previewing.

### Backend (from the API directory: `D:/Bridges/bridges-Bim-Viewer/api/`)

-   **`npm start`**: Starts the Azure Functions development server locally.

## BIM & thatopen API

The core BIM logic is located in the frontend part of the application.
-   Look in `src/components/` for React components that use the `@thatopen` libraries.
-   The main viewer implementation is likely within `src/components/WorldViewerComponent.tsx` and its related files.
-   The Node.js API in the `/api` directory is used for data-related operations, such as fetching data from a database or storage, which the viewer then consumes.
