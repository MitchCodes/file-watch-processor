import { FileWatchProcessInput } from "./file-processor";

export class FileWatcherConfiguration {
    public watchRootFolder: boolean;
    public recursive: boolean;
    public createSubfolders: boolean;
    public watchProcessInputs: FileWatchProcessInput[];

    public constructor() {
        this.watchRootFolder = true;
        this.recursive = true;
        this.createSubfolders = false;
        this.watchProcessInputs = [];
    }
}