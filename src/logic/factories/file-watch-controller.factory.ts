import { Provider } from "nconf";
import { ILogger } from "tsdatautils-core";
import { BasicDictionary } from "../../models/basicdictionary";
import { FileProcessor } from "../../models/file-processor";
import { FileWatchController, FileWatchControllerConfiguration } from "../../models/file-watch-controller";
import { FileWatcher, FileWatcherProcessor } from "../../models/file-watcher";
import { FileProcessorFactory } from "./file-processor.factory";

export class FileWatchControllerFactory {
    private logger: ILogger;
    private conf: Provider;

    public constructor(logger: ILogger, conf: Provider) {
        this.logger = logger;
        this.conf = conf;
    }

    public async buildFileWatchController(fileWatchControllerConfig: FileWatchControllerConfiguration): Promise<FileWatchController> {
        let returnController: FileWatchController = new FileWatchController();
        returnController.processors = [];

        let fileProcessorFactory: FileProcessorFactory = new FileProcessorFactory();

        let processorsById: BasicDictionary<FileProcessor> = {};
        for (let processorConfig of fileWatchControllerConfig.processors) {
            let fileProcessor: FileProcessor = await fileProcessorFactory.getFileProcessor(processorConfig, this.logger, this.conf);
            fileProcessor.id = processorConfig.id;

            returnController.processors.push(fileProcessor);
            processorsById[fileProcessor.id] = fileProcessor;
        }


        returnController.watchers = [];

        for (let watcherConfig of fileWatchControllerConfig.watchers) {
            let fileWatcher: FileWatcher = new FileWatcher();
            fileWatcher.id = watcherConfig.id;
            fileWatcher.path = watcherConfig.path;
            fileWatcher.createSubfolders = watcherConfig.createSubfolders;
            fileWatcher.recursive = watcherConfig.recursive;
            fileWatcher.watchRootFolder = watcherConfig.watchRootFolder;

            fileWatcher.watchProcessors = [];

            for (let fileWatchProcessInput of watcherConfig.watchProcessInputs) {
                if (processorsById[fileWatchProcessInput.processorId]) {
                    fileWatcher.watchProcessors.push(new FileWatcherProcessor(processorsById[fileWatchProcessInput.processorId], fileWatchProcessInput));
                }
            }

            returnController.watchers.push(fileWatcher);
        }

        return returnController;
    }
}