import { type extensionSpec, type AppConfig, ImmutableObject } from 'jimu-core';
import { NotificationHelper, RequestHelper, WidgetStateHelper } from "widgets/shared-code/helpers";

/**
 * - Schování widgetů na základě rolí uživatele.
 * - Používá se na SD:
 */
export default class CheckPermissions implements extensionSpec.AppConfigProcessorExtension {
    id = 'check-permissions';
    widgetId: string;
    
    async process(appConfig: AppConfig): Promise<AppConfig> {
        try {
            if (!window.jimuConfig.isInBuilder) {
                for (let widgetJson of Object.values(appConfig.widgets)) {
                    let config: ImmutableObject<HSI.ConfigExtensions.IRequiredRoles> = widgetJson.config;
                    
                    if (!!config?.requiredRoles && config.requiredRoles.length > 0) {
                        /** - Má dojít k odebrání widgetu? */
                        let removeWidget = true;
                        try {
                            const userPermissions = await RequestHelper.providePermissions();
                            removeWidget = config.requiredRoles.every(requiredRole => !userPermissions.UserRoles.includes(requiredRole));
                        } catch(err) {
                            console.warn(err);
                            NotificationHelper.handleError(`Nepodařilo se načíst oprávnění uživatele. Widget '${appConfig.widgets[widgetJson.id].label}' byl odebrán z aplikace`, err);
                        }
    
                        
                        if (removeWidget) {
                            WidgetStateHelper.removeWidget(appConfig, widgetJson.id);
                        }
                    }
                }
            }
        } catch(err) {
            console.warn(err);
        }

        return appConfig;
    }
}