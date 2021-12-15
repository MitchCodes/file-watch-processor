import { Provider } from "nconf";
import { ILogger } from "tsdatautils-core";
import { BasicDictionary } from "../models/basicdictionary";
import { FileWatchController } from "../models/file-watch-controller";
import { FileWatcher } from "../models/file-watcher";
import { DirectoryFiles, FileHelper } from "./helpers/file.helper";
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';

export class FileWatchProcessor {
    private logger: ILogger;
    private conf: Provider;
    private watcherFiles: BasicDictionary<Set<string>>;
    private watcherFolders: BasicDictionary<Set<string>>;

    public constructor(logger: ILogger, conf: Provider) {
        this.logger = logger;
        this.conf = conf;

        this.watcherFiles = {};
        this.watcherFolders = {};
    }

    public async processWatchControllers(controllers: FileWatchController[]): Promise<void> {
        await this.initializeWatchers(controllers);

        while(true) {
            try {
                for (let controller of controllers) {
                    for (let watcher of controller.watchers) {
                        // todo: compare files & folders to existing
                        // on new file or folder, call processor logic. add process folder to interface for processor
                        
                        
                        // todo: if no new files or folders, wait 5-10s
                        // if new files or folders, wait like 2s
                    }
                }

                await this.delay(2000);
            } catch (err) {
                this.logger.error('Watcher error: ' + err);
                await this.delay(5000);
            }
        }
    }

    private async initializeWatchers(controllers: FileWatchController[]): Promise<void> {
        for (let controller of controllers) {
            for (let watcher of controller.watchers) {
                await this.initializeWatcher(controller, watcher);
            }
        }
    }

    private async initializeWatcher(controller: FileWatchController, watcher: FileWatcher): Promise<void> {
        //todo: get, recursively, all files & folders for watcher
        // if create subfolders & recursive turned on, create folders if needed
        if (!existsSync(watcher.path)) {
            throw new Error('Path for watcher ' + watcher.id + ' does not exist.');
        }

        this.watcherFolders[watcher.id] = new Set();
        if (watcher.watchRootFolder) {
            this.watcherFolders[watcher.id].add(watcher.path);
        }

        this.watcherFiles[watcher.id] = new Set();
        if (watcher.recursive) {
            // Recursive
            let fileHelper: FileHelper = new FileHelper(this.logger, this.conf);
            let directoryFiles: DirectoryFiles = fileHelper.getFilesRecursive(watcher.path, !watcher.watchRootFolder);

            for (let directory of directoryFiles.directories) {
                this.watcherFolders[watcher.id].add(directory);
            }
            
            if (!watcher.processInitial) {
                for (let file of directoryFiles.files) {
                    this.watcherFiles[watcher.id].add(file);
                }
            }
        } else {
            if (watcher.watchRootFolder && !watcher.processInitial) {
                let fileHelper: FileHelper = new FileHelper(this.logger, this.conf);
                let directoryFiles: DirectoryFiles = fileHelper.getFiles(watcher.path);

                for (let file of directoryFiles.files) {
                    this.watcherFiles[watcher.id].add(file);
                }
            }
        }

        if (watcher.createSubfolders) {
            for (let folder of this.watcherFolders[watcher.id]) {
                for (let watchProcessor of watcher.watchProcessors) {
                    let subfolder: string = path.join(folder, watchProcessor.processorInput.id);
                    if (!existsSync(subfolder)) {
                        mkdirSync(subfolder);
                    }
                }
            }            
        }
    }

    private delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }
}