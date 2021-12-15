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

        return;
    }
}
