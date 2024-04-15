export interface ShareableAppSettings {
    heatmap?: boolean;
    input?: string;
}

export class DecodingException extends Error { }

type SettingsAssertion = [keyof ShareableAppSettings, (prop: keyof ShareableAppSettings, settings: ShareableAppSettings) => boolean];

export class AppSettingsCodec {
    static Encode(settings: ShareableAppSettings): string {
        return btoa(JSON.stringify(settings));
    }

    static Decode(encoded: string): ShareableAppSettings {
        try {
            const settings = JSON.parse(atob(encoded));

            AppSettingsCodec.PropsValidation(settings);

            return settings;
        } catch (e) {
            if (e instanceof DOMException) {
                switch (e.name) {
                    case 'InvalidCharacterError':
                        throw new DecodingException('Failed to decode base64 shared settings url');
                }
            } else if (e instanceof SyntaxError) {
                throw new DecodingException('Failed to decode json shared settings url');
            }

            throw e;
        }
    }

    private static PropsValidation(settings: ShareableAppSettings): void {
        const assertions: SettingsAssertion[] = [
            ['heatmap', (p, x) => typeof x[p] === 'boolean'],
            ['input', (p, x) => typeof x[p] === 'string']
        ];

        if (!assertions.every(x => x[0] in settings ? x[1](x[0], settings) : true)) {
            throw new DecodingException('Failed to validate settings properties');
        }
    }
}
