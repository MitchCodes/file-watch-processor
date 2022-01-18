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
        let fileWatchControllers: FileWatchController[] = null;

        let hasControllers: boolean = false;
        while (!hasControllers) {
            fileWatchControllers = await fileWatchControllerLoader.getFileWatchControllers();
    
            if (!fileWatchControllers) {
                this.logger.info('No file watch controllers. Retrying in 60 seconds.');
                await this.delay(60000);
            } else {
                hasControllers = true;
            }
        }

        let fileWatchProcessor: FileWatchProcessor = new FileWatchProcessor(this.logger, this.conf);
        await fileWatchProcessor.processWatchControllers(fileWatchControllers);

        // todo: Docker setup for linux handbrake. need to install handbrake using apt
        // Docker setup for mounting data configuration file
        // Docker setup for mounting watched folders
        // Docker setup documented in README

        // todo eventually: add functionality to hot-load new processors. have logic in processWatchControllers that will occasionally re-load the processors and then compare them for differences.
        // try to reserve file lists if possible

        this.logger.info('Stopping program.');

        return;
    }

    private delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }
}
