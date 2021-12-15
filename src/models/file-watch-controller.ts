import { FileProcessor, FileProcessorConfiguration } from "./file-processor";
import { FileWatcher, FileWatcherConfiguration } from "./file-watcher";

export class FileWatchController {
    public processors: FileProcessor[];
    public watchers: FileWatcher[];
}

export class FileWatchControllerConfiguration {
    public enabled: boolean = false;
    public processors: FileProcessorConfiguration[] = [];
    public watchers: FileWatcherConfiguration[] = [];
}