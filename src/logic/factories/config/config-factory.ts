export class ConfigFactory {
    protected deserialize<T>(deserialized: T, newObj: T) {
        // Note this.active will not be listed in keys since it's declared, but not defined
        const keys = Object.keys(newObj);

        for (const key of keys) {
            if (deserialized.hasOwnProperty(key)) {
                newObj[key] = deserialized[key];
            }
        }
    }
}