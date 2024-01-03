export interface InputReceiver {
    OnInput(e: KeyboardEvent): void;
}

export function IsInputReceiver(x: any): x is InputReceiver {
    return typeof x === 'object' && 'OnInput' in x;
}
