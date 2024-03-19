export class AbortOperationException extends Error { }

export interface FileStorage {
    Open(): Promise<string>;
    Save(content: string): Promise<void>;
}
