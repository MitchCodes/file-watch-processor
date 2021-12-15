import { Provider } from "nconf";
import { ILogger } from "tsdatautils-core";
import { FileProcessor, FileProcessorConfiguration, FileProcessorType } from "../../models/file-processor";
import { HandbrakeVideoConverterFileProcessor } from "../file-processors/handbrake-video-converter.processor";
import { UnknownProcessor } from "../file-processors/unknown.processor";

export class FileProcessorFactory {
    public async getFileProcessor(processorConfiguration: FileProcessorConfiguration, logger: ILogger, conf: Provider): Promise<FileProcessor> {
        if (processorConfiguration.type === FileProcessorType.HandbrakeVideoConverter) {
            return new HandbrakeVideoConverterFileProcessor(processorConfiguration.id, logger, conf);
        }

        return new UnknownProcessor(processorConfiguration.id, logger, conf);
    }
}