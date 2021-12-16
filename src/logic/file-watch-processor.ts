import { Provider } from "nconf";
import { ILogger } from "tsdatautils-core";
import { BasicDictionary } from "../models/basicdictionary";
import { FileWatchController } from "../models/file-watch-controller";
import { FileWatcher } from "../models/file-watcher";
import { DirectoryFiles, FileHelper } from "./helpers/file.helper";
import { existsSync, mkdirSync } from 'fs';
import * as path from 'path';
import { Difference, DifferenceType, DiffHelper } from "./helpers/diff.helper";
import { FileInput, FileProcessFilters, FileProcessResult } from "../models/file-processor";

export class FileWatchProcessor {
    private logger: ILogger;
    private conf: Provider;
    private watcherFiles: BasicDictionary<BasicDictionary<Set<string>>>;
    private watcherFolders: BasicDictionary<Set<string>>;

    public constructor(logger: ILogger, conf: Provider) {
        this.logger = logger;
        this.conf = conf;

        this.watcherFiles = {};
        this.watcherFolders = {};
    }

    public async processWatchControllers(controllers: FileWatchController[]): Promise<void> {
        await this.initializeWatchers(controllers);

        let fileHelper: FileHelper = new FileHelper(this.logger, this.conf);
        let diffHelper: DiffHelper = new DiffHelper();
        while(true) {
            try {
                let newEvent: boolean = false;
                for (let controller of controllers) {
                    for (let watcher of controller.watchers) {
                        let watcherSubFolders: Set<string> = this.getSubfolderNames(watcher);

                        let existingWatcherDirectories: Set<string> = this.watcherFolders[watcher.id];

                        let directoryFiles: DirectoryFiles = null;
                        if (watcher.recursive) {
                            directoryFiles = fileHelper.getFilesRecursive(watcher.path, !watcher.watchRootFolder);
                        } else {
                            if (watcher.watchRootFolder) {
                                directoryFiles = fileHelper.getFiles(watcher.path);
                            }
                        }

                        // Directory Handling
                        let existingDirectories: string[] = Array.from(existingWatcherDirectories.values());
                        if (directoryFiles) {
                            let directoryDifferences: Difference<string, string>[] = diffHelper.calculateDifferences<string>(existingDirectories, directoryFiles.directories, null, true);
                            if (directoryDifferences.length > 0) {
                                for (let directoryDifference of directoryDifferences) {
                                    if (directoryDifference.diffType === DifferenceType.Added) {
                                        // process new folder
                                        // assume new folder is a sub-folder
                                        let newDirectoryName: string = path.basename(directoryDifference.target);

                                        if (watcher.recursive) {
                                            // process new folder
                                            if (watcher.createSubfolders && !watcherSubFolders.has(newDirectoryName)) {
                                                for (let watchProcessor of watcher.watchProcessors) {
                                                    let subfolder: string = path.join(directoryDifference.target, watchProcessor.processorInput.id);
                                                    if (!existsSync(subfolder)) {
                                                        mkdirSync(subfolder);
                                                    }
                                                }
                                            }
                                        }

                                        existingWatcherDirectories.add(directoryDifference.target);
                                        newEvent = true;
                                    } else if (directoryDifference.diffType === DifferenceType.Removed) {
                                        if (existingWatcherDirectories.has(directoryDifference.source)) {
                                            existingWatcherDirectories.delete(directoryDifference.source);
                                        }
                                    }
                                }
                            }
                        }

                        // File Handling
                        if (directoryFiles) {
                            for (let watcherProcessor of watcher.watchProcessors) {
                                let existingWatcherFiles: Set<string> = this.watcherFiles[watcher.id][watcherProcessor.processorInput.id];
                                let existingDirectoryFiles: string[] = Array.from(existingWatcherFiles.values());
                                
                                let differences: Difference<string, string>[] = diffHelper.calculateDifferences<string>(existingDirectoryFiles, directoryFiles.files, null, true);
                                if (differences.length > 0) {
                                    for (let difference of differences) {
                                        if (difference.diffType === DifferenceType.Added) {
                                            // process new file
                                            let newFileDirectory: string = path.dirname(difference.target);
                                            let newFileDirectoryName: string = path.basename(newFileDirectory);
                                            let newFileExtName: string = path.extname(difference.target);

                                            let isValid: boolean = true;

                                            if (watcher.createSubfolders) {
                                                if (newFileDirectoryName !== watcherProcessor.processorInput.id) {
                                                    isValid = false;
                                                }
                                            }

                                            if (isValid) {
                                                let fileFilters: FileProcessFilters = await watcherProcessor.processor.getFileFilters();

                                                if (fileFilters.fileExtensionTypes.length > 0) {
                                                    if (!fileFilters.fileExtensionTypes.includes(newFileExtName)) {
                                                        isValid = false;
                                                    }
                                                }
                                            }

                                            if (isValid) {
                                                let fileInput: FileInput = new FileInput();
                                                fileInput.path = difference.target;

                                                fileInput.interpolationData = {};
                                                fileInput.interpolationData['fileFullPath'] = fileInput.path;
                                                fileInput.interpolationData['fileName'] = path.basename(fileInput.path);
                                                fileInput.interpolationData['fileExt'] = path.extname(fileInput.path);
                                                fileInput.interpolationData['fileNameNoExt'] = fileInput.interpolationData['fileName'].replace(fileInput.interpolationData['fileExt'], '');
                                                fileInput.interpolationData['fileFullDirectory'] = path.dirname(fileInput.path);

                                                let fileDirectory: string = fileInput.interpolationData['fileFullDirectory'];
                                                if (watcher.createSubfolders) {
                                                    fileDirectory = path.join(fileDirectory, '..\\');
                                                }
                                                fileInput.interpolationData['fileDirectoryName'] = path.basename(fileDirectory);
                                                
    
                                                let fileProcessResult: FileProcessResult = await watcherProcessor.processor.processFile(fileInput, watcherProcessor.processorInput);

                                                newEvent = true;
                                            }

                                            existingWatcherFiles.add(difference.target);
                                        } else if (difference.diffType === DifferenceType.Removed) {
                                            if (existingWatcherFiles.has(difference.source)) {
                                                existingWatcherFiles.delete(difference.source);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                if (newEvent) {
                    await this.delay(200); // might be more stuff, react faster
                } else {
                    await this.delay(5000); // nothing new has happened
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
        if (!existsSync(watcher.path)) {
            throw new Error('Path for watcher ' + watcher.id + ' does not exist.');
        }

        let watcherSubFolders: Set<string> = this.getSubfolderNames(watcher);

        this.watcherFolders[watcher.id] = new Set();

        if (watcher.watchRootFolder) {
            this.watcherFolders[watcher.id].add(watcher.path);            
        }

        this.watcherFiles[watcher.id] = {};
        for (let watcherProcessor of watcher.watchProcessors) {
            this.watcherFiles[watcher.id][watcherProcessor.processorInput.id] = new Set();
        }
        
        if (watcher.recursive) {
            // Recursive
            let fileHelper: FileHelper = new FileHelper(this.logger, this.conf);
            let directoryFiles: DirectoryFiles = fileHelper.getFilesRecursive(watcher.path, !watcher.watchRootFolder);

            for (let directory of directoryFiles.directories) {
                this.watcherFolders[watcher.id].add(directory);
            }
            
            if (!watcher.processInitial) {
                for (let file of directoryFiles.files) {
                    for (let watcherProcessor of watcher.watchProcessors) {
                        this.watcherFiles[watcher.id][watcherProcessor.processorInput.id].add(file);
                    }
                }
            }
        } else {
            if (watcher.watchRootFolder && !watcher.processInitial) {
                let fileHelper: FileHelper = new FileHelper(this.logger, this.conf);
                let directoryFiles: DirectoryFiles = fileHelper.getFiles(watcher.path);

                for (let file of directoryFiles.files) {
                    for (let watcherProcessor of watcher.watchProcessors) {
                        this.watcherFiles[watcher.id][watcherProcessor.processorInput.id].add(file);
                    }
                }
            }
        }

        if (watcher.createSubfolders) {
            for (let folder of this.watcherFolders[watcher.id]) {
                let folderName: string = path.basename(folder);

                if (!watcherSubFolders.has(folderName)) {
                    for (let watchProcessor of watcher.watchProcessors) {
                        let subfolder: string = path.join(folder, watchProcessor.processorInput.id);
                        if (!existsSync(subfolder)) {
                            mkdirSync(subfolder);
                        }
                    }
                }
            }            
        }
    }

    private getSubfolderNames(watcher: FileWatcher): Set<string> {
        let subfolderNames: Set<string> = new Set();

        for (let watcherProcessor of watcher.watchProcessors) {
            subfolderNames.add(watcherProcessor.processorInput.id);
        }

        return subfolderNames;
    }

    private delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }
}