export type Observer<T> = (target: T) => void;

export type ObserverDetacher = () => void;

interface ObserverDescriptor<T> {
    id: symbol;
    priority: number;
    observer: Observer<T>;
}

interface AttachOptions {
    priority: number;
}

export const ObservablePriority = {
    Low: Number.NEGATIVE_INFINITY,
    Normal: 0,
    High: Number.POSITIVE_INFINITY
}

export interface Observable<T> {
    Attach(observer: Observer<T>, options?: AttachOptions): ObserverDetacher;
}

export class ObservableController<T> implements Observable<T> {
    private observers: ObserverDescriptor<T>[] = [];

    Attach(observer: Observer<T>, options: AttachOptions = { priority: ObservablePriority.Normal }): ObserverDetacher {
        const descriptor: ObserverDescriptor<T> = {
            id: Symbol(),
            priority: options.priority,
            observer
        };

        this.observers.push(descriptor);

        this.MaintainSorted();

        return () => this.observers.splice(this.observers.findIndex(x => x.id === descriptor.id), 1);
    }

    DetachAll(): void {
        this.observers = [];
    }

    Notify(sender: T): void {
        this.observers.forEach(o => o.observer(sender));
    }

    private MaintainSorted(): void {
        for (let n = this.observers.length - 1;
            n > 0 && this.observers[n].priority > this.observers[n - 1].priority;
            --n) {
            const temp = this.observers[n - 1];
            this.observers[n - 1] = this.observers[n];
            this.observers[n] = temp;
        }
    }
}
