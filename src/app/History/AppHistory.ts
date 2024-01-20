import { injectable } from "inversify";

import { Command } from "./Commands/Command";

import { Inversify } from "@/Inversify";
import { Observable, ObservableController } from "@/lib/Observable";

@injectable()
export class AppHistory {
    private history: Command[] = [];

    private cursor = -1;

    private updateObservable = new ObservableController<void>();

    Push(command: Command): void {
        if (this.CanRedo) {
            this.history.splice(this.cursor + 1);
        }

        this.history.push(command);
        this.cursor = this.history.length - 1;

        this.updateObservable.Notify();
    }

    Undo(): void {
        if (!this.CanUndo) {
            return;
        }

        this.history[this.cursor--].Undo();

        this.updateObservable.Notify();
    }

    Redo(): void {
        if (!this.CanRedo) {
            return;
        }

        this.history[++this.cursor].Apply();

        this.updateObservable.Notify();
    }

    get CanUndo(): boolean {
        return this.cursor >= 0;
    }

    get CanRedo(): boolean {
        return this.cursor < this.history.length - 1;
    }

    get UpdateObservable(): Observable<void> {
        return this.updateObservable;
    }
}

Inversify.bind(AppHistory).toSelf().inSingletonScope();
