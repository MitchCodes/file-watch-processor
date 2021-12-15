import { FileProcessor, FileWatchProcessInput } from "./file-processor";

export class FileWatcher {
    public id: string;
    public path: string;
    public watchRootFolder: boolean;
    public recursive: boolean;
    public createSubfolders: boolean;
    public watchProcessors: FileWatcherProcessor[];

    public constructor() {
        this.watchRootFolder = true;
        this.recursive = true;
        this.createSubfolders = false;
        this.watchProcessors = [];
    }
}

export class FileWatcherProcessor {
    public processor: FileProcessor;
    public processorInput: FileWatchProcessInput;

    public constructor(processor: FileProcessor = null, processorInput: FileWatchProcessInput = null) {
        this.processor = processor;
        this.processorInput = processorInput;
    }
}

export class FileWatcherConfiguration {
    public id: string = '';
    public path: string = '';
    public watchRootFolder: boolean = true;
    public recursive: boolean = false;
    public createSubfolders: boolean = false;
    public watchProcessInputs: FileWatchProcessInput[] = [];

    public constructor() {
        this.watchRootFolder = true;
        this.recursive = true;
        this.createSubfolders = false;
        this.watchProcessInputs = [];
    }
}