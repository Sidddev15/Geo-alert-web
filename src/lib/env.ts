export function mustEnv(name: string): string {
    const value = import.meta.env[name as keyof ImportMetaEnv] as string | undefined;

    if (!value || value.trim() === '') {
        throw new Error(
            `Missing required env variable: ${name}. ` +
            `Make sure it is defined in Netlify AND the site was redeployed.`
        );
    }

    return value;
}
