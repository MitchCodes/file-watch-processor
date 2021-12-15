import { Logger, createLogger, transports } from 'winston';
import { Provider } from 'nconf';
import { IBasicAsyncCache, IBasicAsyncTimedCache, ILogger } from 'tsdatautils-core';
import { FileWatchControllerLoader } from './file-watch-controller-loader';
import { FileWatchController } from '../models/file-watch-controller';
import { FileWatchProcessor } from './file-watch-processor';

export class MainController {
    private logger: ILogger;
    private conf: Provider;
    private cacheService: IBasicAsyncCache & IBasicAsyncTimedCache = null;

    public async startProgram(logger: ILogger, conf: Provider, cacheService: IBasicAsyncCache & IBasicAsyncTimedCache): Promise<void> {
        this.logger = logger;
        this.logger.info('Starting program.');

        this.conf = conf;
        this.cacheService = cacheService;

        let fileWatchControllerLoader: FileWatchControllerLoader = new FileWatchControllerLoader(logger, conf);
        let fileWatchControllers: FileWatchController[] = await fileWatchControllerLoader.getFileWatchControllers();

        // todo: main logic loop:
        // based on watchers, have infinite loop for watching files
        // if new file event, run processor 1 at a time generically
        // if new folder event, run processor 1 at a time generically (if recursive?). file processor class have new folder event in interface. needs File Watch Processor Input as well

        if (!fileWatchControllers) {
            this.logger.info('No file watch controllers. Stopping application.');
            return;
        }

        let fileWatchProcessor: FileWatchProcessor = new FileWatchProcessor(this.logger, this.conf);
        await fileWatchProcessor.processWatchControllers(fileWatchControllers);

        // todo: Docker setup for linux handbrake. need to install handbrake using apt
        // Docker setup for mounting data configuration file
        // Docker setup for mounting watched folders
        // Docker setup documented in README

        this.logger.info('Stopping application.');

        return;
    }
}
