// Vercel serverless entry point. Do NOT call app.listen() — Vercel
// provides its own listener. src/index.ts remains the source of truth
// for the long-lived Docker server.
import { app } from '../src/app';

export default app;
