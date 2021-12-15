import { Provider } from "nconf";
import { ILogger } from "tsdatautils-core";

export class FileInput {
    public path: string;
}

export class FileWatchProcessInput {
    public processorId: string;
}

export class FileProcessResult {

}

export class FileProcessFilters {
    public fileExtensionTypes: string[];

    public constructor() {
        this.fileExtensionTypes = [];
    }
}

export interface FileProcessor {
    id: string;
    type: FileProcessorType;
    logger: ILogger;
    conf: Provider;
    processFile(fileInput: FileInput, watcherInput: FileWatchProcessInput): Promise<FileProcessResult>;
    getFileFilters(): Promise<FileProcessFilters>;
}

export enum FileProcessorType {
    Unknown = 'Unknown',
    HandbrakeVideoConverter = 'HandbrakeVideoConverter',
}

export class FileProcessorConfiguration {
    public id: string = '';
    public type: FileProcessorType = FileProcessorType.HandbrakeVideoConverter;
}