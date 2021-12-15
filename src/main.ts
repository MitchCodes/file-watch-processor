import { Logger, createLogger, transports } from 'winston';
import { MainController } from './logic/main.controller';
// tslint:disable-next-line:no-import-side-effect
import 'winston-daily-rotate-file';
import * as nconf from 'nconf';
import { IBasicAsyncCache, ILogger, WinstonLogger, IBasicAsyncTimedCache } from 'tsdatautils-core';
import { BasicMemoryCache } from 'tsdatautils-memorycache';
import { AzureApplicationInsightsWinstonTransport } from 'tsdatautils-azuretablestorage';
import { setup, start, defaultClient } from 'applicationinsights';
import * as moment from 'moment';

// Configurations
nconf.argv().env();
nconf.file({ file: './build/config.json' });

// Logging
let transportsArray: any[] = [];
transportsArray.push(new transports.Console());

let logToFile: string = nconf.get('logToFile');
if (logToFile && logToFile.toLowerCase() === 'true') {
  const fileTransport = new (<any>transports).DailyRotateFile({
    filename: 'bot-%DATE%.log',
    dirname: './logs/',
    datePattern: 'YYYY-MM-DD',
    maxFiles: 90,
  });
  
  transportsArray.push(fileTransport);
}

let logAppInsightInstrumentKey: string = nconf.get('logAppInsightsInstrumentKey');
if (logAppInsightInstrumentKey) {
  setup(logAppInsightInstrumentKey).start();
  let azureAppInsightTransport: AzureApplicationInsightsWinstonTransport = new AzureApplicationInsightsWinstonTransport(true, defaultClient);
  transportsArray.push(azureAppInsightTransport);
}

let loggerLevel: string = 'debug';
let loggerLevelConf: string = nconf.get('logLevel');
if (loggerLevelConf) {
  loggerLevel = loggerLevelConf;
}

const winstonLogger = createLogger({
  level: loggerLevel,
  transports: transportsArray,
});
winstonLogger.info('Logger level: ' + winstonLogger.level);

let logger: ILogger = new WinstonLogger(winstonLogger);
logger.info('Process ID: ' + process.pid);

// Caching
let cacheService: IBasicAsyncCache & IBasicAsyncTimedCache = new BasicMemoryCache();

let mainController : MainController = new MainController();
mainController.startProgram(logger, nconf, cacheService);
