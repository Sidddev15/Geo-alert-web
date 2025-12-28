export function mustEnv(name: keyof ImportMetaEnv): string {
    const v = import.meta.env[name] as string | undefined;
    if (!v || v.trim() === '') {
        throw new Error(
            `Missing required env: ${String(name)}. ` +
            `This is a Vite build-time env. Netlify must redeploy after setting it.`
        );
    }
    return v;
}
