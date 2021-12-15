import { readdirSync, statSync, readFileSync } from 'fs';
import { Provider } from 'nconf';
import * as path from 'path';
import { ILogger } from 'tsdatautils-core';

export class DirectoryFiles {
    public directories: string[];
    public files: string[];

    public constructor() {
        this.directories = [];
        this.files = [];
    }
}

export class FileHelper {
    private logger: ILogger;
    private conf: Provider;

    public constructor(logger: ILogger, conf: Provider) {
        this.logger = logger;
        this.conf = conf;
    }

    public getFilesRecursive(directory, ignoreRootFiles: boolean = false, directoryFiles: DirectoryFiles = null): DirectoryFiles {
        let isRoot = false;
        if (directoryFiles === null) {
            directoryFiles = new DirectoryFiles();
            isRoot = true;
        }
        
        readdirSync(directory).forEach(file => {
            const fullPath = path.join(directory, file);
            if (statSync(fullPath).isDirectory()) {
                directoryFiles.directories.push(fullPath);
                return this.getFilesRecursive(fullPath, ignoreRootFiles, directoryFiles);
            }
            else {
                if (!ignoreRootFiles || !isRoot) {
                    directoryFiles.files.push(fullPath);
                }
                return directoryFiles;
            }
        });

        return directoryFiles;
    }

    public getFiles(directory: string): DirectoryFiles {
        let directoryFiles: DirectoryFiles = new DirectoryFiles();

        readdirSync(directory).forEach(file => {
            const fullPath = path.join(directory, file);
            if (statSync(fullPath).isDirectory()) {
                directoryFiles.directories.push(fullPath);
                return directoryFiles;
            }
            else {
                directoryFiles.files.push(fullPath);
                return directoryFiles;
            }
        });

        return directoryFiles;
    }
}