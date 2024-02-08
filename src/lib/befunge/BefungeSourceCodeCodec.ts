export class DecodingErrorException extends Error {
    constructor() { super('Failed to decode shared url') }
}

export class BefungeSourceCodeCodec {
    static Encode(decoded: string): string {
        return btoa(decoded);
    }

    static Decode(encoded: string): string {
        try {
            return atob(encoded);
        } catch (e) {
            if (e instanceof DOMException) {
                switch (e.name) {
                    case 'InvalidCharacterError':
                        throw new DecodingErrorException();
                }
            }

            throw e;
        }
    }
}
