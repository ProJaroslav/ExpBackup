import { type extensionSpec, type AppConfig } from 'jimu-core';
import CheckPermissions from "./check-permissions";
import EnvironmentProcessor from "./environment-processor";
import { GlobalSettingHelper } from 'widgets/shared-code/helpers';

export default class AppConfigProcessor implements extensionSpec.AppConfigProcessorExtension {
    id = 'app-config-processor';
    widgetId: string;
    
    async process(appConfig: AppConfig): Promise<AppConfig> {
        try {
            if (!appConfig.attributes.HSI_Setting) {
                return appConfig;
            }

            const promises: Array<Promise<AppConfig>> = [];

            if (GlobalSettingHelper.get("checkPermissions")) {
                new CheckPermissions().process(appConfig);
            }

            if (GlobalSettingHelper.get("environmentProcessor")) {
                new EnvironmentProcessor().process(appConfig);
            }
    
            await Promise.all(promises);
        } catch(err) {
            console.warn(err);
        }

        return appConfig;
    }
}