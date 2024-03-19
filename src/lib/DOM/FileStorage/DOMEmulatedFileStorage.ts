import { injectable } from "inversify";

import { WaitEvent } from "../EventWaiter";

import { FileStorage } from "./FileStorage";

@injectable()
export class DOMEmulatedFileStorage implements FileStorage {
    private openedFilename = 'befunge.txt';

    async Open(): Promise<string> {
        const input = document.createElement('input');

        input.type = 'file';
        const onChange = WaitEvent(input, 'change');

        input.click();

        const onChangeResult = await onChange;

        const target = onChangeResult.target as HTMLInputElement | null;

        if ((target?.files?.length ?? 0) === 0) {
            throw new Error('Failed to load file');
        }

        this.openedFilename = target!.files![0].name;

        return target!.files![0].text();
    }

    async Save(content: string): Promise<void> {
        const blob = new Blob([content], { type: 'text/plain' });

        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = this.openedFilename;

        a.click();

        window.URL.revokeObjectURL(url);
    }
}
