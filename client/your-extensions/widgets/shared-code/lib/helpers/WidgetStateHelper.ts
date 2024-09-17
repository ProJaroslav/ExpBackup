import { getAppStore, WidgetManager, appActions, type WidgetJson, type ImmutableObject, type WidgetManifest, type ExtensionProperties, type AppConfig } from "jimu-core";
import { JimuMapView } from "jimu-arcgis";
import { DbRegistryLoader, LayerDefinitionHelper } from "widgets/shared-code/helpers";
import { EConstants, EDbRegistryKeys, EKnownWidgetExtentison } from "widgets/shared-code/enums";

export default class WidgetStateHelper {
    /**
     * - Otevírá všechny widgety, které mají název {@link name}.
     * - Pokud je widget v postraním panelu (widget sidebar), tak otevře panel.
     * @param name - Název widgetu, který chcheme otevřít.
     * @returns Identifikátory widgetů s názvem {@link name}.
     */
    public static async openWidgetsByName(name: string): Promise<Array<string>> {
        /** - Wydgety s názvem {@link name}. */
        const widgets = WidgetStateHelper.getWidgetsByName(name);
    
        const widgetIds = await Promise.all(widgets.map(async widget => {
            let isClassLoaded = getAppStore().getState().widgetsRuntimeInfo?.[widget.id]?.isClassLoaded;
    
            if (!isClassLoaded) {
                await WidgetManager.getInstance().loadWidgetClass(widget.id);
            }
    
            WidgetManager.getInstance().openWidget(widget.id);
    
            WidgetStateHelper.openSidebarThatContainsWidget(widget.id);
    
            return widget.id;
        }));
    
        return widgetIds;
    }

    /**
     * - Ověření zda v aplikaci je widget s názvem {@link widgetName}.
     * @param widgetName - Název widgetu jehož existenci ověřujeme.
     * @param appConfig - Kofigurace aplikace.
     */
    public static containsWidgetWithName(widgetName: keyof HSI.IWidgetConfig, appConfig?: AppConfig | ImmutableObject<AppConfig>): boolean {
        if (!appConfig) {
            appConfig = getAppStore().getState().appConfig;
        }
        return Object.values(appConfig.widgets).some(widget => widget.manifest.name === widgetName);
    }

    /**
     * - Poskytuje configurace widgetů s názvem {@link widgetName}.
     * @param widgetName - Nazev widgetu jehož konfiguraci získáváme.
     * @param appConfig - Kofigurace aplikace.
     */
    public static getWidgetConfigurationByName<N extends keyof HSI.IWidgetConfig>(widgetName: N, appConfig?: AppConfig | ImmutableObject<AppConfig>): Array<HSI.IWidgetConfig[N]> {
        return WidgetStateHelper.getWidgetsByName(widgetName, appConfig).map(widget => {
            return widget.config;
        });
    }

    /**
     * - Poskytue všechny widgety v aplikaci s názvem {@link widgetName}.
     * @param widgetName - Název požadovaného widgetu.
     * @param appConfig - Kofigurace aplikace.
     */
    public static getWidgetsByName(widgetName: string, appConfig?: AppConfig | ImmutableObject<AppConfig>): Array<ImmutableObject<WidgetJson>> {
        if (!appConfig) {
            appConfig = getAppStore().getState().appConfig;
        }
        return Object.values(appConfig.widgets).filter(widget => widget.manifest.name === widgetName);;
    }
    
    /**
     * - Zavírá všechny widgety, které mají název {@link name}.
     * - Pokud je widget v postraním panelu (widget sidebar), tak zavře panel.
     * @param name - Název widgetu, který chcheme zavřít.
     * @returns Identifikátory widgetů s názvem {@link name}.
     */
    public static closeWidgetsByName(name: string): Array<string> {
        /** - Identifikátory Wydgetů s názvem {@link name}. */
        const widgetIds = WidgetStateHelper.getWidgetsByName(name).map(widget => widget.id);
    
        widgetIds.forEach(WidgetStateHelper.closeWidgetById);
    
        return widgetIds;
    }
    
    /**
     * - Zavření widgetu podle jeho ID.
     * @param widgetId - Identifikátor widgetu, který chceme zavřít.
     */
    public static closeWidgetById(widgetId: string): void {
        WidgetManager.getInstance().closeWidget(widgetId);
        WidgetStateHelper.closeSidebarThatContainsWidget(widgetId);
    }
    
    /**
     * - Otevírá postraní panel (widget sidebar), který obsahuje widget s id {@link widgetId}.
     * @param widgetId - Id widgetu, který chceme zobrazit.
     */
    public static openSidebarThatContainsWidget(widgetId: string) {
        WidgetStateHelper.setCollapseStateOfSidebarThatContainsWidget(widgetId, true);
    }
    
    /**
     * - Zavírá postraní panel (widget sidebar), který obsahuje widget s id {@link widgetId}.
     * @param widgetId - Id widgetu.
     */
    public static closeSidebarThatContainsWidget(widgetId: string) {
        WidgetStateHelper.setCollapseStateOfSidebarThatContainsWidget(widgetId, false);
    }
    
    /**
     * - Změna stavu otevření postraního panelu (widget sidebar), který obsahuje widget s id {@link widgetId}.
     * @param widgetId - Id widgetu, který je v panelu jehož stav chceme změnit.
     * @param expanded - Chceme aby byl panel otevřený?
     */
    public static setCollapseStateOfSidebarThatContainsWidget(widgetId: string, expanded: boolean) {
        /** - Identifikátor layoutu ve kterém je widget {@link widgetId} */
        let layoutId = Object.values(getAppStore().getState().appConfig.layouts).find(layout => {
            return Object.values(layout.content || {}).findIndex(widgetInLayout => {
                return widgetInLayout.widgetId === widgetId;
            }) !== -1;
        })?.id;
        
        if (layoutId) {
            /** - Sidebar widget který v sobě má layout s id {@link layoutId}. */
            let sidebarWidget = Object.values(getAppStore().getState().appConfig.widgets).find(sidebarWidget => {
                if (sidebarWidget.manifest.name !== "sidebar") {
                    return false;
                }
        
                return Object.values(sidebarWidget.layouts || {}).findIndex(layout => layout['LARGE'] === layoutId) !== -1;
            })
        
            if (sidebarWidget?.id) {
                getAppStore().dispatch(appActions.widgetStatePropChange(sidebarWidget.id, "collapse", expanded));
            }
        }
    }
    
    /**
     * - Změna vlastností stavů v appStore (externí state widgetu) všem widgetů s náznem {@link widgetName}.
     * @param widgetName - Název widgetů, kterým chceme přepsat vlastnost.
     * @param propKey - Klíč vlastnosti, kterou chceme přepsat.
     * @param value - Nová hodnota vlastnosti.
     */
    public static setWidgetStatePropByName(widgetName: string, propKey: string, value: any) {
        WidgetStateHelper.getWidgetsByName(widgetName).forEach(widget => {
            getAppStore().dispatch(appActions.widgetStatePropChange(widget.id, propKey, value));
        });
    }
    
    /**
     * - Poskyteje manifest widgetu. 
     * @param widgetId - Id widgetu jehož manifest chceme poskytnout.
     */
    public static getManifest(widgetId: string): ImmutableObject<WidgetManifest> {
        return getAppStore().getState().appConfig.widgets[widgetId].manifest;
    }
    
    /**
     * - Ověřuje zda {@link widgetId widget} má {@link ExtensionProperties.uri rozšíření s URI} rovno {@link extensionUri}.
     * @param widgetId - Id widgetu jehož rozšíření zjišťujeme.
     * @param extensionUri - URI požadovaného rozšíření.
     */
    public static hasExtension(widgetId: string, extensionUri: EKnownWidgetExtentison): boolean {
        const manifest = WidgetStateHelper.getManifest(widgetId);
        if (!manifest?.extensions) {
            return false;
        }
    
        return manifest.extensions.some(extension => extension.uri === extensionUri);
    }
    
    // Pokud neexistuje TOC, nebo existuje TOC bez klíče v konfiguraci, tak se zobrazují 
    /**
     * - Poskytuje {@link callback funkci} pro zjištění, zda se podvrtva zobazuje ve widgetu TableOfContents (TOC).
     * - Pokud neexistuje TOC, nebo existuje TOC bez klíče v konfiguraci, tak {@link funkce} vrací vždy true.
     * @param jimuMapView - View mapy.
     * @param callback - Funkce pro zjištění, zda se podvrtva zobazuje ve widgetu TableOfContents.
     */
    public static async provideIsInToc(jimuMapView: JimuMapView, callback: (isIsInToc: (sublayer: HSI.ISublayerDefinition) => boolean) => void): Promise<void> {
        const tocConfigs = WidgetStateHelper.getWidgetConfigurationByName("TableOfContents")
        if (tocConfigs.length > 0 && tocConfigs.every(tocConfig => !!tocConfig[EConstants.tocSettingKey])) { 
            /** - Konfigurace v databázovém registru pro widget TableOfContents. */
            const tableOfContentsDbConfig = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { scope: "g", name: EDbRegistryKeys.TableOfContents, type: "json" });
    
            function inToc(sublayerDefinition: HSI.ISublayerDefinition, layerStructure: typeof tableOfContentsDbConfig[string]['layerStructure']): boolean {
                if (!sublayerDefinition || !Array.isArray(layerStructure)) {
                    return false;
                }
            
                for (let layerStructureItem of layerStructure) {
                    if (("layerId" in layerStructureItem.layer && LayerDefinitionHelper.matchDefinition(layerStructureItem.layer, sublayerDefinition)) || inToc(sublayerDefinition, layerStructureItem.children)) {
                        return true;
                    }
                }
            
                return false;
            }
    
            callback(sublayerDefinition => {
                for (let tableOfContentsConfig of tocConfigs) {
                    let layerStructure = tableOfContentsDbConfig?.[tableOfContentsConfig[EConstants.tocSettingKey]]?.layerStructure;
                    if (!Array.isArray(layerStructure) || layerStructure.length < 1 || inToc(sublayerDefinition, layerStructure)) {
                        return true;
                    }
                }
    
                return false;
            })
    
        } else {
            callback(() => true);
        }
    }

    /**
     * - Odebrání {@link widgetId widgetu} z {@link appConfig konfigurace}.
     * @param appConfig - Konfigurace aplikace.
     * @param widgetId - Id widgetu, který chceme odebrat z {@link appConfig konfigurace}.
     */
    public static removeWidget(appConfig: AppConfig, widgetId: string) {
        delete appConfig.widgets[widgetId];
        for (let layoutWidget of Object.values(appConfig.layouts)) {
            const widgetOrdersToRemove: Array<string> = [];
            for (let order of Object.keys(layoutWidget.content)) {
                if (layoutWidget.content[order].widgetId === widgetId) {
                    widgetOrdersToRemove.push(order);
                }
            }

            if (widgetOrdersToRemove.length > 0) {
                for (let order of widgetOrdersToRemove) {
                    delete layoutWidget.content[order];
                    layoutWidget.order = layoutWidget.order.filter(o => o !== order);
                }
            }
            
        }
    }
};