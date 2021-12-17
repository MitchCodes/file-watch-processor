import { Provider } from "nconf";
import { ILogger } from "tsdatautils-core";
import { BasicDictionary } from "../models/basicdictionary";
import { FileWatchController } from "../models/file-watch-controller";
import { FileWatcher, FileWatcherProcessor } from "../models/file-watcher";
import { DirectoryFiles, FileHelper } from "./helpers/file.helper";
import { existsSync, mkdirSync, Stats, statSync, rmSync } from 'fs';
import * as path from 'path';
import { Difference, DifferenceType, DiffHelper } from "./helpers/diff.helper";
import { FileInput, FileProcessFilters, FileProcessResult, FileProcessResultStatus } from "../models/file-processor";
import { FileDateSize } from "../models/file-date-size";
import { DateTime } from 'luxon';

export class FileWatchProcessor {
    private logger: ILogger;
    private conf: Provider;
    private watcherFiles: BasicDictionary<BasicDictionary<Set<string>>>;
    private watcherFolders: BasicDictionary<Set<string>>;
    private fileSizeTimes: BasicDictionary<BasicDictionary<BasicDictionary<FileDateSize>>>;
    private filesToDelete: Set<string>;

    private bytesPerSecondAssumedTransferSpeed: number;

    public constructor(logger: ILogger, conf: Provider) {
        this.logger = logger;
        this.conf = conf;

        this.watcherFiles = {};
        this.watcherFolders = {};
        this.fileSizeTimes = {};
        this.filesToDelete = new Set();

        this.bytesPerSecondAssumedTransferSpeed = 20000000;
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
                                    let newDirectoryEvent: boolean = await this.handleDirectoryDifference(watcherSubFolders, watcher, existingWatcherDirectories, directoryDifference);
                                    if (newDirectoryEvent) {
                                        newEvent = true;
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
                                        let newFileEvent: boolean = await this.handleFileDifference(watcher, watcherProcessor, existingWatcherFiles, difference);
                                        if (newFileEvent) {
                                            newEvent = true;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                for (let fileToDelete of this.filesToDelete) {
                    try {
                        rmSync(fileToDelete);
                        this.fileDeleted(fileToDelete);
                    } catch (err) {
                        this.logger.error('Error deleting file ' + fileToDelete + ' due to error: ' + err);
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

    private async handleDirectoryDifference(watcherSubFolders: Set<string>, watcher: FileWatcher, existingWatcherDirectories: Set<string>, directoryDifference: Difference<string, string>): Promise<boolean> {
        let newEvent: boolean = false;

        if (directoryDifference.diffType === DifferenceType.Added) {
            newEvent = await this.handleDirectoryAdded(watcherSubFolders, watcher, existingWatcherDirectories, directoryDifference);
        } else if (directoryDifference.diffType === DifferenceType.Removed) {
            newEvent = await this.handleDirectoryRemoved(watcherSubFolders, watcher, existingWatcherDirectories, directoryDifference);
        }

        return newEvent;
    }

    private async handleDirectoryAdded(watcherSubFolders: Set<string>, watcher: FileWatcher, existingWatcherDirectories: Set<string>, directoryDifference: Difference<string, string>): Promise<boolean> {
        let newEvent: boolean = false;

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

        return newEvent;
    }

    private async handleDirectoryRemoved(watcherSubFolders: Set<string>, watcher: FileWatcher, existingWatcherDirectories: Set<string>, directoryDifference: Difference<string, string>): Promise<boolean> {
        let newEvent: boolean = false;
        
        if (existingWatcherDirectories.has(directoryDifference.source)) {
            existingWatcherDirectories.delete(directoryDifference.source);
        }

        return newEvent;
    }

    private async handleFileDifference(watcher: FileWatcher, watcherProcessor: FileWatcherProcessor, existingWatcherFiles: Set<string>, difference: Difference<string, string>): Promise<boolean> {
        let newEvent: boolean = false;

        if (difference.diffType === DifferenceType.Added) {
            newEvent = await this.handleFileAdded(watcher, watcherProcessor, existingWatcherFiles, difference);
        } else if (difference.diffType === DifferenceType.Removed) {
            newEvent = await this.handleFileRemoved(watcher, watcherProcessor, existingWatcherFiles, difference);
        }

        return newEvent;
    }

    private async handleFileAdded(watcher: FileWatcher, watcherProcessor: FileWatcherProcessor, existingWatcherFiles: Set<string>, difference: Difference<string, string>): Promise<boolean> {
        let newEvent: boolean = false;

        let waitForFile: boolean = await this.shouldWaitForFile(watcher, watcherProcessor, existingWatcherFiles, difference.target);

        if (!waitForFile) {
            let isValid: boolean = await this.isNewFileValidToProcess(watcher, watcherProcessor, existingWatcherFiles, difference);

            if (isValid) {
                let fileInput: FileInput = this.setupFileInput(watcher, watcherProcessor, difference);

                let fileProcessResult: FileProcessResult = await watcherProcessor.processor.processFile(fileInput, watcherProcessor.processorInput);

                if (fileProcessResult.status === FileProcessResultStatus.Success) {
                    if (watcherProcessor.processorInput.removeFileAfterProcess) {
                        this.addFileToDelete(difference.target);
                    }
                }

                newEvent = true;
            }

            existingWatcherFiles.add(difference.target);
        }

        return newEvent;
    }

    private async shouldWaitForFile(watcher: FileWatcher, watcherProcessor: FileWatcherProcessor, existingWatcherFiles: Set<string>, filePath: string): Promise<boolean> {
        let shouldWaitForFile: boolean = false;

        if (this.fileSizeTimes[watcher.id] && this.fileSizeTimes[watcher.id][watcherProcessor.processorInput.id]) {
            try {
                let fileStats: Stats = statSync(filePath);
                let latestFileChange: DateTime = this.getLatestFileTime(fileStats);
                let timeToCopySeconds: number = fileStats.size / this.bytesPerSecondAssumedTransferSpeed;

                if (fileStats) {
                    let fileSizeDictionary: BasicDictionary<FileDateSize> = this.fileSizeTimes[watcher.id] && this.fileSizeTimes[watcher.id][watcherProcessor.processorInput.id];
                    if (fileSizeDictionary[filePath]) {
                        let fileDateSize: FileDateSize = fileSizeDictionary[filePath];
                        if (fileDateSize.size !== fileStats.size) {
                            fileDateSize.size = fileStats.size;
                            fileDateSize.time = DateTime.now();
                        } else if (DateTime.now() < latestFileChange.plus({ seconds: timeToCopySeconds })) {
                            // use various times from fileStats (atime, ctime, mtime, etc). get latest time
                            // assume 5MB/s (or similar) transfer and takes size / 5MB (or similar) per sec to get how long it should transfer
                            // make sure that the time it should take to transfer has elapsed since latest time
                            fileDateSize.time = DateTime.now();
                        }

                        if (DateTime.now() > fileDateSize.time.plus({ seconds: 10 })) {
                            shouldWaitForFile = false;
                        } else {
                            shouldWaitForFile = true;
                        }
                    } else {
                        let fileDateSize: FileDateSize = new FileDateSize(fileStats.size, DateTime.now());
                        fileSizeDictionary[filePath] = fileDateSize;
                        shouldWaitForFile = true;
                    }
                } else {
                    shouldWaitForFile = true;
                }
            } catch (err) {
                this.logger.error('Error getting file size for file' + filePath + ': ' + err);
                shouldWaitForFile = true;
            }
        } else {
            shouldWaitForFile = true;
        }

        return shouldWaitForFile;
    }

    private getLatestFileTime(fileStats: Stats): DateTime {
        let returnTime: DateTime = DateTime.now().minus({years: 5});

        if (fileStats.atime) {
            let atime: DateTime = DateTime.fromJSDate(fileStats.atime);
            if (atime > returnTime) {
                returnTime = atime;
            }
        }

        if (fileStats.birthtime) {
            let birthtime: DateTime = DateTime.fromJSDate(fileStats.birthtime);
            if (birthtime > returnTime) {
                returnTime = birthtime;
            }
        }

        if (fileStats.ctime) {
            let ctime: DateTime = DateTime.fromJSDate(fileStats.ctime);
            if (ctime > returnTime) {
                returnTime = ctime;
            }
        }

        if (fileStats.mtime) {
            let mtime: DateTime = DateTime.fromJSDate(fileStats.mtime);
            if (mtime > returnTime) {
                returnTime = mtime;
            }
        }

        return returnTime;
    }

    private async isNewFileValidToProcess(watcher: FileWatcher, watcherProcessor: FileWatcherProcessor, existingWatcherFiles: Set<string>, difference: Difference<string, string>): Promise<boolean> {
        let isValid: boolean = true;

        let newFileDirectory: string = path.dirname(difference.target);
        let newFileDirectoryName: string = path.basename(newFileDirectory);
        let newFileExtName: string = path.extname(difference.target);

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

        return isValid;
    }

    private setupFileInput(watcher: FileWatcher, watcherProcessor: FileWatcherProcessor, difference: Difference<string, string>): FileInput {
        let fileInput: FileInput = new FileInput();
        fileInput.path = difference.target;

        this.setupInterpolationData(watcher, watcherProcessor, fileInput);

        return fileInput;
    }

    private setupInterpolationData(watcher: FileWatcher, watcherProcessor: FileWatcherProcessor, fileInput: FileInput): void {
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
    }

    private async handleFileRemoved(watcher: FileWatcher, watcherProcessor: FileWatcherProcessor, existingWatcherFiles: Set<string>, difference: Difference<string, string>): Promise<boolean> {
        let newEvent: boolean = false;

        if (existingWatcherFiles.has(difference.source)) {
            existingWatcherFiles.delete(difference.source);
        }

        return newEvent;
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
        this.fileSizeTimes[watcher.id] = {};
        for (let watcherProcessor of watcher.watchProcessors) {
            this.watcherFiles[watcher.id][watcherProcessor.processorInput.id] = new Set();
            this.fileSizeTimes[watcher.id][watcherProcessor.processorInput.id] = {};
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

    private addFileToDelete(file: string): void {
        if (!this.filesToDelete.has(file)) {
            this.filesToDelete.add(file);
        }
    }

    private fileDeleted(file: string): void {
        if (this.filesToDelete.has(file)) {
            this.filesToDelete.delete(file)
        }
    }

    private delay(ms: number) {
        return new Promise( resolve => setTimeout(resolve, ms) );
    }
}