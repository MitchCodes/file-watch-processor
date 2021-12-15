import { Logger, createLogger, transports } from 'winston';
import { Provider } from 'nconf';
import { IBasicAsyncCache, IBasicAsyncTimedCache, ILogger } from 'tsdatautils-core';

export class MainController {
    private logger: ILogger;
    private cacheService: IBasicAsyncCache & IBasicAsyncTimedCache = null;

    public async startProgram(logger: ILogger, conf: Provider, cacheService: IBasicAsyncCache & IBasicAsyncTimedCache): Promise<void> {
        this.logger = logger;
        this.logger.info('Starting program.');

        this.cacheService = cacheService;

        // todo: main logic loop:
        // load FileWatchController from data configuration
        // based on watchers, have infinite loop for watching files
        // if new file event, run processor 1 at a time generically
        // if new folder event, run processor 1 at a time generically (if recursive?). file processor class have new folder event in interface. needs File Watch Processor Input as well


        // todo: Docker setup for linux handbrake. need to install handbrake using apt
        // Docker setup for mounting data configuration file
        // Docker setup for mounting watched folders
        // Docker setup documented in README

        return;
    }
}
