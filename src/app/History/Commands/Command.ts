export interface Command {
    Apply(): void;
    Undo(): void;
}
