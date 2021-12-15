import { Provider } from "nconf";
import { ILogger } from "tsdatautils-core";
import { BasicDictionary } from "../models/basicdictionary";
import { FileWatchController } from "../models/file-watch-controller";
import { FileWatcher } from "../models/file-watcher";

export class FileWatchProcessor {
    private logger: ILogger;
    private conf: Provider;
    private watcherFiles: BasicDictionary<string[]>;
    private watcherFolders: BasicDictionary<string[]>;

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

        // put files & folders in the watcherFiles and watcherFolders dictionaries
    }

    private delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }
}