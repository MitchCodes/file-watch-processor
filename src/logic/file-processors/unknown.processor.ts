import { Provider } from "nconf";
import { ILogger } from "tsdatautils-core";
import { FileInput, FileProcessFilters, FileProcessor, FileProcessorType, FileProcessResult, FileWatchProcessInput } from "../../models/file-processor";

export class UnknownProcessor implements FileProcessor {
    public id: string;
    public type: FileProcessorType;
    public conf: Provider;
    public logger: ILogger;

    public constructor(id: string, logger: ILogger, conf: Provider) {
        this.id = id;
        this.logger = logger;
        this.conf = conf;
    }

    public processFile(fileInput: FileInput, watcherInput: FileWatchProcessInput): Promise<FileProcessResult> {
        this.logger.error('Unknown processor type.');
        throw new Error('Unknown processor type.');
    }

    public getFileFilters(): Promise<FileProcessFilters> {
        this.logger.error('Unknown processor type.');
        throw new Error('Unknown processor type.');
    }

}