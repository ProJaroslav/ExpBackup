import { type extensionSpec, type AppConfig, getAppStore } from 'jimu-core';
import { WidgetStateHelper, UrlParamsHandler, ArcGISJSAPIModuleLoader, NotificationHelper } from "widgets/shared-code/helpers";
import { EConstants } from "widgets/shared-code/enums";
import { type InitialMapState, type IMJimuMapConfig } from 'jimu-ui/advanced/map';
import translations from "./translations/default";

/**
 * - Změma DataSource mapového widgetu na základě URL parametrů.
 * - K aplikaci je potřeba mít v aplikaci widget environment-processor.
 * - Používá se na SD.
 */
export default class EnvironmentProcessor implements extensionSpec.AppConfigProcessorExtension {
    id = 'environment-processor';
    widgetId: string;
    
    async process(appConfig: AppConfig): Promise<AppConfig> {
        try {
            if (!window.jimuConfig.isInBuilder && WidgetStateHelper.containsWidgetWithName("environment-processor", appConfig)) {
                const mapWidgetId = appConfig.widgets[WidgetStateHelper.getWidgetsByName("environment-processor", appConfig)[0].id].useMapWidgetIds[0];
                if (!!mapWidgetId) {
                    const mapWidgetConfig: IMJimuMapConfig = appConfig.widgets[mapWidgetId].config;
                    const config = WidgetStateHelper.getWidgetConfigurationByName("environment-processor", appConfig)[0];
                    
                    //#region - Nastavení extentu
                    if (config.preserveExtent) {
                        const initialMapState = UrlParamsHandler.parseUrlQueryJson<InitialMapState>(EConstants.mapStateUrl);
                        if (!!initialMapState) {
                            //@ts-ignore
                            mapWidgetConfig.initialMapState = initialMapState;
                            UrlParamsHandler.deleteUrlParameter(EConstants.mapStateUrl);
                        }
                    }
                    //#endregion END - Nastavení extentu
    
                    let itemId = getAppStore().getState().queryObject?.getIn([EConstants.itemIdUrl]);
    
                    //#region - Ověření dostupnosti webové mapy
                    if (!!itemId && !!mapWidgetConfig.initialMapDataSourceID) {
                        const mapDataSource = appConfig.dataSources[mapWidgetConfig.initialMapDataSourceID];
                        if (config.validateEnvironment && mapDataSource.itemId !== itemId) {
                            const request = await ArcGISJSAPIModuleLoader.getModule("request");
    
                            try {
                                await request(`${mapDataSource.portalUrl}/sharing/rest/content/items/${itemId}?f=json`);
                            } catch(err) {
                                console.warn(err);
                                throw new Error(translations.inaccessibleMap.replace("{0}", itemId));
                            }
                        }
                        mapDataSource.itemId = itemId;
                    }
                    //#endregion END - Ověření dostupnosti webové mapy
                }
            }
        } catch(err) {
            console.warn(err);
            NotificationHelper.handleError(translations.failedToUpdateConfig, err);
        }
    
        return appConfig;
    }
}