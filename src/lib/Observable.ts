export type Observer<T> = (target: T) => void;

export type ObserverDetacher = () => void;

interface ObserverDescriptor<T> {
    id: symbol;
    observer: Observer<T>;
}

export interface Observable<T> {
    Attach(observer: Observer<T>): ObserverDetacher;
}

export class ObservableController<T> implements Observable<T> {
    private observers: ObserverDescriptor<T>[] = [];

    Attach(observer: Observer<T>): ObserverDetacher {
        const descriptor: ObserverDescriptor<T> = {
            id: Symbol(),
            observer
        };

        this.observers.push(descriptor);

        return () => this.observers.splice(this.observers.findIndex(x => x.id === descriptor.id), 1);
    }

    Notify(sender: T): void {
        this.observers.forEach(o => o.observer(sender));
    }
}
