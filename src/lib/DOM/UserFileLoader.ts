import { WaitEvent } from "./EventWaiter";

export class UserFileLoader {
    static async ReadAsText(): Promise<string> {
        return ReadTextFile();
    }
}


async function ReadTextFile(): Promise<string> {
    const input = document.createElement('input');
    input.type = 'file';
    const onChange = WaitEvent(input, 'change');

    input.click();

    const onChangeResult = await onChange;

    const target = onChangeResult.target as HTMLInputElement | null;

    if ((target?.files?.length ?? 0) === 0) {
        throw new Error('Failed to load file');
    }

    return target!.files![0].text();
}
