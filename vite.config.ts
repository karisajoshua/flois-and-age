import {defineConfig, loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {rsvpDevPlugin} from './server/dev-rsvp.mjs';
export default defineConfig(({mode}) => ({plugins: [react(), tailwind(), rsvpDevPlugin(loadEnv(mode, '.', ''))]}));
