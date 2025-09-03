# Bridges BIM Viewer

A web-based BIM viewer for bridge models using ThatOpen Components.

## Features

- View IFC models in 3D
- Stream IFC models from API
- Measure and analyze BIM elements
- Select and view element properties

## Setup and Running

### Prerequisites

- Node.js 20.x or later
- Azure Functions Core Tools v4

### Installation

1. Install dependencies for the frontend:

```bash
npm install
```

2. Install dependencies for the API:

```bash
cd api
npm install
```

### Running the Application

1. Start the API (in one terminal):

```bash
cd api
npm start
```

This will start the Azure Functions runtime on http://localhost:7071.

2. Start the frontend (in another terminal):

```bash
npm run dev
```

This will start the Vite development server with the frontend application.

3. Open your browser and navigate to the URL shown in the terminal (typically http://localhost:5173).

## Using the Application

1. Click on the "Test IFC" button in the Import toolbar to load the test bridge IFC model from the API.
2. Use the camera controls to navigate around the model.
3. Select elements to view their properties in the selection panel.

## Development

- The frontend is built with React, TypeScript, and ThatOpen Components.
- The API is built with Azure Functions.
- The IFC model is streamed from the API to the frontend.

## Project Structure

- `/src` - Frontend source code
- `/api` - Azure Functions API
- `/ws/node/api/src/model` - IFC model files