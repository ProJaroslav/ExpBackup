import { JimuMapView } from "jimu-arcgis";
import { getAppStore, appActions } from "jimu-core";
import { DbRegistryLoader, LayerHelper, FeatureHelper, LayerDefinitionHelper } from "widgets/shared-code/helpers";
import { EConstants, EDbRegistryKeys, EFeatureType } from "widgets/shared-code/enums";

export default class FloorHelper {
    /**
     * - Změna podlaží podle prvku {@link feature}.
     * @param jimuMapView - Aktivní view mapy.
     * @param feature - Prvek podle jehož hodnoty atributu se změní podlaží.
     */
    public static async setFloorByFeature(jimuMapView: JimuMapView, feature: __esri.Graphic) {
        const sourceLayerInfo = await FloorHelper.getSourceLayerInfo(jimuMapView, feature);
        const floorSettings = await FloorHelper.getFloorSettings(jimuMapView, sourceLayerInfo);
    
        /** Změna podlaží ve widgetu "FloorSwitch". */
        if (sourceLayerInfo.fields.findIndex(field => FeatureHelper.compareFieldName(field, floorSettings?.attribute)) !== -1) {
            const value = feature.getAttribute(floorSettings.attribute);
            if (typeof value === "number" || typeof value === "string") {
                FloorHelper.setFloorValues({
                    [floorSettings.settingKey]: value
                });
            }
        }
    }
    
    /**
     * - Změna podlaží podle skupiny prvků {@link featureSet}.
     * - Pokud prvky nemají stejné podlaží, nastaví se výchozí podlaží podle konfigurace.
     * - Prvky {@link featureSet} musé pocházet ze stejné vrstvy/podvrstvy.
     * @param jimuMapView - Aktivní view mapy.
     * @param featureSet - Prvky podle kterých se mění podlaží.
     */
    public static async setFloorByFeatureSet(jimuMapView: JimuMapView, featureSet: __esri.FeatureSet | Array<__esri.Graphic>): Promise<void> {
        const features = Array.isArray(featureSet) ? featureSet : Array.isArray(featureSet?.features) ? featureSet.features : [];
        if (features.length > 0) {
            const sourceLayerInfo = await FloorHelper.getSourceLayerInfo(jimuMapView, features[0]);
            const floorSettings = await FloorHelper.getFloorSettings(jimuMapView, sourceLayerInfo);
    
            if (sourceLayerInfo.fields.findIndex(field => FeatureHelper.compareFieldName(field, floorSettings?.attribute)) !== -1) {
                let floor: number | string;
                for (var feature of features) {
                    let currentFloor = feature.getAttribute(floorSettings.attribute);
                    if (typeof currentFloor === "string" || typeof currentFloor === "number") {
                        if (typeof floor === "string" || typeof floor === "number") {
                            if (currentFloor != floor) {
                                floor = floorSettings.defaultValue;
                                break;
                            }
                        } else {
                            floor = currentFloor;   
                        }
                    }
                } 
    
                FloorHelper.setFloorValues({
                    [floorSettings.settingKey]: floor
                });
            }
    
        }
    }
    
    /**
     * - Získání parametrů vrstvy, ze které pochází prvek {@link feature}, potřebných k přepnutí podlaží.
     * @param jimuMapView - Aktivní view mapy.
     * @param feature - Prvek podle kzerého přepínáme podlaží.
     */
    public static async getSourceLayerInfo(jimuMapView: JimuMapView, feature: __esri.Graphic): Promise<ISourceLayerInfo> {
        let sourceLayer: __esri.Sublayer | __esri.FeatureLayer;
        let sourceLayerId: number;
        let parentMapImageLayer: __esri.MapImageLayer;
        const featureType = FeatureHelper.getFeatureType(feature);
    
        if (featureType === EFeatureType.Sublayer) {
            sourceLayer = LayerHelper.getSublayerFromFeature(feature); 
            parentMapImageLayer = sourceLayer.layer as __esri.MapImageLayer;
            sourceLayerId = sourceLayer.id;
        } else if (featureType === EFeatureType.Table) {
            sourceLayer = LayerHelper.getTableFromFeature(feature);
            parentMapImageLayer = LayerHelper.getMapImageLayerFromTable(jimuMapView, sourceLayer);
            sourceLayerId = sourceLayer.layerId;
        } else {
            throw new Error(`Unhandled feature type ${featureType}`);
        }
    
        await Promise.all([sourceLayer.load(), parentMapImageLayer.load()]);
    
        return { sourceLayerId, parentMapImageLayer, fields: sourceLayer.fields };
    }
    
    /**
     * - Získání potřebných hodnot z konfigurace, pro přepnutí podlaží.
     * @param jimuMapView - Aktivní view mapy.
     * @param layerInfo - Informace o vrstvě, podle které přepínámě podlaží.
     */
    public static async getFloorSettings(jimuMapView: JimuMapView, layerInfo: Omit<ISourceLayerInfo, "fields">): Promise<Pick<HSI.DbRegistry.IFloorDbValue['any'], "defaultValue"> & Pick<HSI.DbRegistry.IFloorDbValue['any']['restrict'][0], "attribute"> & { settingKey: string; }> {
        /** - Konfigurace pro widget 'FloorSwitch'. */
        const dbConfiguration = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { type: "json", name: EDbRegistryKeys.Floors, scope: "g" });
    
        for (let settingKey in dbConfiguration) {
            for (let layerSetting of dbConfiguration[settingKey].restrict) {
                let mapImageLayer = await LayerDefinitionHelper.findMapImageLayerByDefinition(jimuMapView, layerSetting.layer);
                if (mapImageLayer === layerInfo.parentMapImageLayer) {
                    for (let sublayerSetting of layerSetting.sublayers) {
                        if (layerInfo.sourceLayerId === sublayerSetting.layerId) {
                            return {
                                defaultValue: dbConfiguration[settingKey].defaultValue,
                                attribute: sublayerSetting.attribute || layerSetting.attribute,
                                settingKey
                            }
                        }
                    }
                }
            }
        }
    }
    
    /** - Poskytuje hodnoty aktivních podlaží pod identifikátorem druhu podlaží (podlaží, úroveň ploch, atd...)  */
    public static getAllFloorValues(): HSI.FloorHelper.IFloorValues {
        const floorWidgets = Object.values(getAppStore().getState().appConfig.widgets).filter(widget => widget.manifest.name === "FloorSwitch");
        const values: HSI.FloorHelper.IFloorValues = {};
    
        for (let floorWidget of floorWidgets) {
            values[floorWidget.config.dbRegistryConfigKey] = getAppStore().getState().widgetsState[floorWidget.id]?.[EConstants.floorKey];
        }
    
        return values;
    }
    
    /**
     * - Změna hodnoty aktivního podlaží/plochy.
     * @param values - Hodnoty aktivních podlaží pod identifikátorem druhu podlaží (podlaží, úroveň ploch, atd...)
     */
    public static setFloorValues(values: HSI.FloorHelper.IFloorValues) {
        const floorWidgets = Object.values(getAppStore().getState().appConfig.widgets).filter(widget => widget.manifest.name === "FloorSwitch");
        for (let floorWidget of floorWidgets) {
            if (floorWidget.config.dbRegistryConfigKey in values) {
                getAppStore().dispatch(appActions.widgetStatePropChange(floorWidget.id, EConstants.floorKey, values[floorWidget.config.dbRegistryConfigKey]));
            }
        }
    }
    
};

interface ISourceLayerInfo extends Pick<__esri.FeatureLayer, "fields"> {
    /** - Mapová služba, ze které pochází vrstva/podvrstva {@link sourceLayerId}. */
    parentMapImageLayer: __esri.MapImageLayer;
    /** - Identifikátor (v rámci mapové služby {@link parentMapImageLayer}) vrstvy/podvrstvy ze které prvek pochází. */
    sourceLayerId: number;
}