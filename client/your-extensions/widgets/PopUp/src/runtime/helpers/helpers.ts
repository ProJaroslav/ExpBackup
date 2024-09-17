import { JimuMapView } from "jimu-arcgis";
import { getAppStore, appActions } from "jimu-core";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { EDbRegistryKeys } from  "widgets/shared-code/enums";
import { WidgetStateHelper, LayerDefinitionHelper, RelationHelper, LayerHelper, FeatureHelper, DbRegistryLoader, NotificationHelper } from  "widgets/shared-code/helpers";

/**
 * - Otevření nového popupu pro prvky s vazbou na prvek {@link feature}.
 * - Vazba je definovaná v konfiguraci {@link EDbRegistryKeys.PopupFeatureQuery};
 * @param jimuMapView - Aktivní view mapy.
 * @param feature - Prvek s vazbou na prvky, které chceme přidat do výběru.
 * @param config - Konfigurace widgetu.
 */
export function openPopupForRelatedFeatures(jimuMapView: JimuMapView, feature: __esri.Graphic, config: HSI.PopUpWidget.IMConfig): void {
    Promise.all([
        LayerDefinitionHelper.getLayerDefinitionFromFeature(jimuMapView, feature),
        DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { type: "json", scope: "g", name: EDbRegistryKeys.PopupFeatureQuery })
    ])
    .then(([originLayerDefinition, popupFeatureQueryConfig]) => {
        let popupFeatureQueryDefinitions = (config.dbRegistryConfigKeyExtension in popupFeatureQueryConfig ? popupFeatureQueryConfig[config.dbRegistryConfigKeyExtension] : popupFeatureQueryConfig.default);
        if (!Array.isArray(popupFeatureQueryDefinitions)) {
            popupFeatureQueryDefinitions = [];
        }

        return popupFeatureQueryDefinitions.filter(popupFeatureQueryDefinition => LayerDefinitionHelper.matchDefinition(originLayerDefinition, popupFeatureQueryDefinition.originLayer));
    })
    .then(popupFeatureQueryDefinitions => {
        return Promise.all(popupFeatureQueryDefinitions.map<Promise<[HSI.DbRegistry.IPopupFeatureQueryDefinition, __esri.Sublayer | __esri.FeatureLayer]>>(async popupFeatureQueryDefinition => ([popupFeatureQueryDefinition, await LayerDefinitionHelper.findLayerByDefinition(jimuMapView, popupFeatureQueryDefinition.destinationLayer)])))
    })
    .then(layerDefinitionPairs => {
        const [popupFeatureQueryDefinition, destinationLayer] = layerDefinitionPairs.find(([_, destinationLayer]) => !!destinationLayer);

        let fieldsToFetch: Array<string> = [];

        if (!("relationshipClassId" in popupFeatureQueryDefinition)) {
            if (Array.isArray(popupFeatureQueryDefinition.originLayerAttributes) && Array.isArray(popupFeatureQueryDefinition.destinationLayerAttributes)) {
                fieldsToFetch = popupFeatureQueryDefinition.originLayerAttributes.filter(attribute => !(attribute in feature.attributes));
            } else if (typeof popupFeatureQueryDefinition.originLayerAttributes === "string" && typeof popupFeatureQueryDefinition.destinationLayerAttributes === "string") {
                if (!(popupFeatureQueryDefinition.originLayerAttributes in feature.attributes)) {
                    fieldsToFetch = [popupFeatureQueryDefinition.originLayerAttributes];
                }
            } else {
                throw new Error(`Configuration is incorrect`);
            }
        }

        let additionalFieldsPromise: Promise<__esri.FeatureSet>;

        if (fieldsToFetch.length > 0) {
            const sourceLayer = LayerHelper.getSourceLayerFromFeature(feature);
            additionalFieldsPromise = sourceLayer.queryFeatures({
                objectIds: [feature.getObjectId()],
                outFields: fieldsToFetch,
                returnGeometry: false
            });
        }

        return Promise.all([popupFeatureQueryDefinition, destinationLayer, additionalFieldsPromise]);
    })
    .then(([popupFeatureQueryDefinition, destinationLayer, additionalFieldsFeatureSet]) => {
        /** - Podmínka vyhledávání. */
        let where: string = '';

        if ("relationshipClassId" in popupFeatureQueryDefinition) {
            return RelationHelper.fetchRelationObjects(jimuMapView, feature, popupFeatureQueryDefinition.relationshipClassId);
        }

        if (additionalFieldsFeatureSet?.features?.length === 1) {
            for (let attributeName of Object.keys(additionalFieldsFeatureSet.features[0].attributes)) {
                if (!(attributeName in feature.attributes)) {
                    feature.setAttribute(attributeName, additionalFieldsFeatureSet.features[0].getAttribute(attributeName));
                }
            }
        }
        
        if (Array.isArray(popupFeatureQueryDefinition.originLayerAttributes) && Array.isArray(popupFeatureQueryDefinition.destinationLayerAttributes)) {
            where = popupFeatureQueryDefinition.destinationLayerAttributes
                .map((attribute, index) => FeatureHelper.getEqualCondition(attribute, destinationLayer.fields, feature.getAttribute(popupFeatureQueryDefinition.originLayerAttributes[index])))
                .filter(condition => !!condition)
                .join(" AND ");
        } else if (typeof popupFeatureQueryDefinition.originLayerAttributes === "string" && typeof popupFeatureQueryDefinition.destinationLayerAttributes === "string") {
            where = FeatureHelper.getEqualCondition(popupFeatureQueryDefinition.destinationLayerAttributes, destinationLayer.fields, feature.getAttribute(popupFeatureQueryDefinition.originLayerAttributes));
        }

        return destinationLayer.queryFeatures({
            where,
            outFields: ["*"],
            returnGeometry: true
        });
    })
    .then(featureSet => {
        if (featureSet?.features.length > 0) {
            jimuMapView.view.popup.open({ features: featureSet?.features, featureMenuOpen: true });
        } else {
            NotificationHelper.addNotification({ message: "Pro proklik nebyla nalezena data", type: "warning" });
        }
    })
    .catch(err => {
        console.warn(err);
    });
}

/**
 * - Otevření widgetu "RoomBooking".
 * @param jimuMapView - Aktivní view mapy.
 * @param featue - Prvek, který nastavíme jako aktivné ve widgetu "RoomBooking".
 */
export async function openRoomBooking(jimuMapView: JimuMapView, featue: __esri.Graphic) {
    try {
        const sublayer = LayerHelper.getSublayerFromFeature(featue);
        await sublayer.load();
        const widgetIds = await WidgetStateHelper.openWidgetsByName("RoomBooking")
            
        await SelectionManager.getSelectionSet(jimuMapView).updateByFeatureIds(LayerHelper.getGisIdLayersFromLayer(sublayer), [featue.getObjectId()], []);
    
        for (let widgetId of widgetIds) {
            let action = appActions.widgetStatePropChange(widgetId, "featureId", FeatureHelper.getFeatureGisId(featue));
            getAppStore().dispatch(action);
        }
    } catch(err) {
        console.warn(err);
    }
}