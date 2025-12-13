import { defineConfig } from 'pnpm-dev-kit'

export default defineConfig({
    autoCreateReleaseBranch: true,
    build: true,
    tagPrefix: 'pdk@',
    pushTag: true,
    ignoreScripts: true,
}); 