import { Observable } from "../Observable";

export interface InputReceiver {
    OnDestroy: Observable<void>;
    OnInput(e: KeyboardEvent): void;
    Focus(): void;
    Blur(): void;
}

export function IsInputReceiver(x: any): x is InputReceiver {
    return typeof x === 'object' && 'OnInput' in x;
}
