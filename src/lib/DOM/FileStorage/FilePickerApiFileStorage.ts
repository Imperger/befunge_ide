import { injectable } from "inversify";

import { AbortOperationException, FileStorage } from "./FileStorage";

@injectable()
export class FilePickerApiDiskStorage implements FileStorage {
    private openedFilename = 'befunge.txt';

    async Open(): Promise<string> {
        try {
            const [fileHandle] = await window.showOpenFilePicker({ multiple: false });

            if (fileHandle.kind !== "file") {
                throw new AbortOperationException();
            }
            this.openedFilename = fileHandle.name;
            const file = await fileHandle.getFile();

            return file.text();
        } catch (e) {
            if (e instanceof DOMException) {
                switch (e.name) {
                    case 'AbortError':
                        throw new AbortOperationException();
                }
            }

            throw e;
        }
    }

    async Save(content: string): Promise<void> {
        try {
            const fileHandle = await window.showSaveFilePicker({ suggestedName: this.openedFilename });

            const stream = await fileHandle.createWritable();

            await stream.write(content);

            await stream.close();
        } catch (e) {
            if (e instanceof DOMException) {
                switch (e.name) {
                    case 'AbortError':
                        throw new AbortOperationException();
                }
            }

            throw e;
        }
    }
}
