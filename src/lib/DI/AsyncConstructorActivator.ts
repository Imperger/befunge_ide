import { interfaces } from "inversify";

export interface AsyncConstructable {
    AsyncConstructor(): Promise<void>;
}

export async function AsyncConstructorActivator<T extends AsyncConstructable>(_context: interfaces.Context, constructable: T): Promise<T> {
    await constructable.AsyncConstructor();
    return constructable;
}
