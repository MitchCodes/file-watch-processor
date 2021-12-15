import { readdirSync, statSync, readFileSync } from 'fs';
import { Provider } from 'nconf';
import * as path from 'path';
import { ILogger } from 'tsdatautils-core';
import { FileWatchController, FileWatchControllerConfiguration } from '../models/file-watch-controller';
import { FileWatchControllerConfigFactory } from './factories/config/file-watch-controller-factory';
import { FileWatchControllerFactory } from './factories/file-watch-controller.factory';
import { DirectoryFiles, FileHelper } from './helpers/file.helper';

export class FileWatchControllerLoader {
    private logger: ILogger;
    private conf: Provider;

    public constructor(logger: ILogger, conf: Provider) {
        this.logger = logger;
        this.conf = conf;
    }

    public async getFileWatchControllers(): Promise<FileWatchController[]> {
        let controllersFolder: string = <string>this.conf.get('controllersFolder');

        return await this.getFileWatchControllersFromFolder(controllersFolder);
    }

    private async getFileWatchControllersFromFolder(configFilesFolder: string): Promise<FileWatchController[]> {
        let fileWatchControllerConfigFactory: FileWatchControllerConfigFactory = new FileWatchControllerConfigFactory();
        let fileWatchControllerFactory: FileWatchControllerFactory = new FileWatchControllerFactory(this.logger, this.conf);

        let fileHelper: FileHelper = new FileHelper(this.logger, this.conf);
        let allConfigFiles: DirectoryFiles = fileHelper.getFilesRecursive(configFilesFolder);
        this.logger.debug('Found ' + allConfigFiles.files.length + ' file watch controller(s).');

        let fileWatchControllers: FileWatchController[] = [];
        for (let configFile of allConfigFiles.files) {
            let configJson: string = readFileSync(configFile, {
                encoding: 'utf8'
            });

            if (configJson) {
                let fileWatchControllerConfig: FileWatchControllerConfiguration = fileWatchControllerConfigFactory.buildFileWatchController(configJson, this.logger);
                if (fileWatchControllerConfig && fileWatchControllerConfig.enabled) {
                    let fileWatchController: FileWatchController = await fileWatchControllerFactory.buildFileWatchController(fileWatchControllerConfig);
                    fileWatchControllers.push(fileWatchController);
                }
            }
        }

        return fileWatchControllers;
    }
}