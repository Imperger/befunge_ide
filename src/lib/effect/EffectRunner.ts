import { injectable } from "inversify";

import { Effect } from "./Effect";

import { Inversify } from "@/Inversify";

export enum RegistrationCollisionResolver { Add, Replace, Skip }

export interface RegistrationPolicy<T> {
    id: T;
    rule: RegistrationCollisionResolver;
}

interface EffectItem {
    effect: Effect;
    policy: RegistrationPolicy<unknown>;
}

@injectable()
export class EffectRunner {
    private defaultPolicy: RegistrationPolicy<any>;
    private effects: EffectItem[] = [];

    constructor() {
        this.defaultPolicy = { id: Symbol('Default policy id'), rule: RegistrationCollisionResolver.Add };
    }

    Register<T>(effect: Effect, policy: RegistrationPolicy<T> = this.defaultPolicy): void {
        const item = this.effects.findLast(x => x.policy.id === policy.id);

        if (item === undefined || item.policy.rule === RegistrationCollisionResolver.Add) {
            this.effects.push({ effect, policy });
        } else if (item.policy.rule === RegistrationCollisionResolver.Replace) {
            item.effect = effect;
        }
    }

    Draw(elapsed: number): boolean {
        for (let n = 0; n < this.effects.length; ++n) {
            const item = this.effects[n];

            if (item.effect.IsDone) {
                this.effects.splice(n--, 1);
            } else {
                item.effect.Draw(elapsed);
            }
        }

        return this.effects.length > 0;
    }
}

Inversify.bind(EffectRunner).toSelf().inSingletonScope();
