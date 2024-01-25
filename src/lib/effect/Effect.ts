export interface Effect {
    IsDone: boolean;
    Draw(_elapsed: number): void;
}
