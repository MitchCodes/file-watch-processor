import { ILogger } from "tsdatautils-core";
import { FileWatchControllerConfiguration } from "../../../models/file-watch-controller";
import { ConfigFactory } from "./config-factory";

export class FileWatchControllerConfigFactory extends ConfigFactory {
    public buildFileWatchController(json: string, logger: ILogger): FileWatchControllerConfiguration {
        let basicParse: FileWatchControllerConfiguration = <FileWatchControllerConfiguration>JSON.parse(json);
        let returnParse: FileWatchControllerConfiguration = new FileWatchControllerConfiguration();

        this.deserialize(basicParse, returnParse);

        return returnParse;
    }
}