import { Provider } from "nconf";
import { ILogger } from "tsdatautils-core";
import { FileInput, FileProcessFilters, FileProcessor, FileProcessorType, FileProcessResult, FileWatchProcessInput } from "../../models/file-processor";
import { HandbrakeVideoConverterWatchProcessInput } from "../../models/file-watch-processor-input/handbrake-video-converter.input";

export class HandbrakeVideoConverterFileProcessor implements FileProcessor {
    private hbjs: any;
    
    public id: string;
    public type: FileProcessorType;
    public conf: Provider;
    public logger: ILogger;

    public progressCallback: (progress: any) => void;
    public finishConvertCallback: () => void;
    public handbrakeErrorCallback: (err: any) => void;


    public constructor(id: string, logger: ILogger, conf: Provider) {
        this.hbjs = require('handbrake-js');
        
        this.id = id;
        this.type = FileProcessorType.HandbrakeVideoConverter;
        this.logger = logger;
        this.conf = conf;
    }
    
    private instanceOfProperInput(object: any): object is HandbrakeVideoConverterWatchProcessInput {
        return 'outputFilePath' in object && 'convertPreset' in object;
    }

    public async getFileFilters(): Promise<FileProcessFilters> {
        let fileProcessFilters: FileProcessFilters = new FileProcessFilters();
        fileProcessFilters.fileExtensionTypes = ['.mp4', '.avi', '.mkv'];

        return fileProcessFilters;
    }

    public async processFile(fileInput: FileInput, watcherInput: FileWatchProcessInput): Promise<FileProcessResult> {
        let fileProcessResult: FileProcessResult = new FileProcessResult();

        if (!this.instanceOfProperInput(watcherInput)) {
            throw new Error('Watcher input is not the proper HandbrakeVideoConverterProcessInput type');
        }

        await this.validatePreset(watcherInput);

        let videoLengthSeconds: number = await this.getVideoLengthInSeconds(fileInput);

        if (videoLengthSeconds > 0) {
            await this.convertFile(fileInput, watcherInput, videoLengthSeconds);
        } else {
            throw new Error('Video length could not be calculated.');
        }

        return fileProcessResult;
    }

    private async validatePreset(watcherInput: HandbrakeVideoConverterWatchProcessInput): Promise<void> {
        const result = await this.hbjs.run({ 'preset-list': true });

        if (!result.stderr.includes(watcherInput.convertPreset)) {
            throw new Error('Preset ' + watcherInput.convertPreset + ' not available');
        }
        this.logger.debug('Handbrake presets: ' + result.stderr);

        //Vimeo YouTube HQ 1440p60 2.5K
    }

    private convertFile(fileInput: FileInput, watcherInput: HandbrakeVideoConverterWatchProcessInput, videoLengthSeconds: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            let hbjsSpawnSettings: any = {
                input: fileInput.path, 
                output: watcherInput.outputFilePath, 
                'preset': watcherInput.convertPreset
            };

            if (watcherInput.lastSecondsToKeep > 0 && videoLengthSeconds > watcherInput.lastSecondsToKeep) {
                let startSeconds: number = videoLengthSeconds - watcherInput.lastSecondsToKeep;
                hbjsSpawnSettings['start-at'] = 'seconds:' + startSeconds;
            }

            let job: any = this.hbjs.spawn(hbjsSpawnSettings)
                .on('error', err => {
                    this.logger.error('Error processing handbrake: ' + err);

                    if (this.handbrakeErrorCallback) {
                        this.handbrakeErrorCallback(err);
                    }

                    reject(err);
                })
                .on('progress', progress => {
                    if (watcherInput.debugLogProgress) {
                        this.logger.debug('Percent complete: ' + progress.percentComplete + ', ETA: ' + progress.eta);
                    }

                    if (this.progressCallback) {
                        this.progressCallback(progress);
                    }
                    
                    if (progress.percentComplete >= 100) {
                        if (this.finishConvertCallback) {
                            this.finishConvertCallback();
                        }

                        resolve();
                    }
                });
        });
    }

    private async getVideoLengthInSeconds(fileInput: FileInput): Promise<number> {
        const result = await this.hbjs.run({ input: fileInput.path, scan: true });

        let durationMillis: number = this.getDurationMillisFromStdResult(result.stdout);
        if (durationMillis === -1) {
            durationMillis = this.getDurationMillisFromStdResult(result.stderr);
        }

        if (durationMillis === -1) {
            return 0;
        }

        return Math.floor(durationMillis / 1000);
    }

    private getDurationMillisFromStdResult(stdResult: string): number {
        if (!stdResult) {
            return -1;
        }

        let durationIndex = stdResult.indexOf('duration: ');

        if (durationIndex === -1) {
            return -1;
        }

        let stdResultSplit: string[] = stdResult.substring(durationIndex).split('\r');
        if (stdResultSplit.length === 0) {
            return -1;
        }

        let timeTrimmed: string = stdResultSplit[0].trim();
        let timeSplit: string[] = timeTrimmed.split(':');

        if (timeSplit.length !== 4) {
            return -1;
        }

        let hoursStr: string = timeSplit[1].trim();
        let minutesStr: string = timeSplit[2].trim();
        let secondsStr: string = timeSplit[3].trim();

        let hours: number = parseInt(hoursStr);
        let minutes: number = parseInt(minutesStr);
        let seconds: number = parseInt(secondsStr);

        minutes += (hours * 60);
        seconds += (minutes * 60);
        let millis: number = seconds * 1000;
        
        return millis;
    } 
}