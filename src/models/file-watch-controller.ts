import { FileProcessorConfiguration } from "./file-processor";
import { FileWatcherConfiguration } from "./file-watcher";

export class FileWatchController {
    public processors: FileProcessorConfiguration[];
    public watchers: FileWatcherConfiguration[];
}