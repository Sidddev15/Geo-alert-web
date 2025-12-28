export function getEnv(name: keyof ImportMetaEnv): string | null {
    const v = import.meta.env[name] as string | undefined;
    return v && v.trim() !== '' ? v : null;
}
