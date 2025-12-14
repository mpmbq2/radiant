# Development Guide

## Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

## Installation
```bash
npm install
```

## Running in Development
```bash
npm start
```
This starts the Electron app with hot module replacement.

## Project Structure
- `src/main.ts` - Main process (Node.js)
- `src/preload.ts` - Secure IPC bridge
- `src/renderer.ts` - Renderer process entry point
- `src/App.svelte` - Main Svelte component
- `forge.config.ts` - Electron Forge configuration
- `vite.renderer.config.ts` - Vite configuration for renderer

## Building
```bash
npm run package
```

## Code Formatting
```bash
npm run format
```
