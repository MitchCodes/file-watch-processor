import { FileWatchProcessInput } from "../file-processor";

export class HandbrakeVideoConverterWatchProcessInput extends FileWatchProcessInput {
    public outputFilePath: string;
    public convertPreset: string;
    public lastSecondsToKeep: number;
    public debugLogProgress: boolean;

    public constructor() {
        super();

        this.debugLogProgress = false;
    }
}