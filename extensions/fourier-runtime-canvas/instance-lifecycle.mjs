import {
    enqueueInstanceLifecycle,
    getOrCreateAsync,
} from "./mutation-queue.mjs";

export class InstanceLifecycle {
    constructor({ pending, start, stop, values }) {
        this.pending = pending;
        this.start = start;
        this.stop = stop;
        this.values = values;
    }

    open(instanceId, input) {
        return enqueueInstanceLifecycle(
            instanceId,
            () => getOrCreateAsync(
                this.values,
                this.pending,
                instanceId,
                () => this.start(instanceId, input),
            ),
        );
    }

    close(instanceId) {
        return enqueueInstanceLifecycle(instanceId, async () => {
            const entry = this.values.get(instanceId)
                ?? await this.pending.get(instanceId)?.catch(() => null);
            if (!entry) {
                return;
            }
            this.values.delete(instanceId);
            await this.stop(entry);
        });
    }
}
