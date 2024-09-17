import { React } from "jimu-core";
import LayerConfigurationContext from "../contexts/LayerConfigurationContext";
import translations from "../translations/default";
import { NotificationHelper, FeatureHelper, LayerHelper } from "widgets/shared-code/helpers";
import { ELoadStatus, EFeatureType } from "widgets/shared-code/enums";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { useMessageFormater } from "widgets/shared-code/hooks";

const defaultState: IFieldOrder = {
    fields: [],
    loadingState: ELoadStatus.Pending
};

/**
 * - Poskytuje sloupce, které chceme zobrazit v atributové tabule včetně informace zda jsou editovatelné.
 * - Sloupce jsou seřazeny podle konfigurace.
 * @param feature - Prvek pro který načítáme sloupce.
 * @param featureServerFields - Chceme aby poskytnuté sloupce byly načtěny z Fetaure služby? Chceme vynechat joinované sloupce? (ve Feature službách nejsou joinované sloupce)
 */
export default function(feature: __esri.Graphic, featureServerFields: boolean = false): IFieldOrder {
    const layerConfiguration = React.useContext(LayerConfigurationContext);
    const messageFormater = useMessageFormater(translations);
    const [state, steState] = React.useState<IFieldOrder>(defaultState);
    const jimuMapView = React.useContext(JimuMapViewContext);
    
    const featureType = FeatureHelper.getFeatureType(feature);
    /** - Podvrstva / negrafická vrstva (tabulka) ze které {@link feature prvek} pochází. */
    const layer = featureType === EFeatureType.Table ? LayerHelper.getTableFromFeature(feature) : LayerHelper.getSublayerFromFeature(feature);
    
    React.useEffect(() => {
        const abortController = new AbortController();

        steState(defaultState);

        (async function() {
            try {
                if (layer.loadStatus !== "loaded") {
                    await layer.load();
                }
                let fields = layer.fields;

                if (featureServerFields) {
                    const featuteLayer = await (featureType === EFeatureType.Table ? LayerHelper.duplicateTable(jimuMapView, layer as __esri.FeatureLayer, true) : LayerHelper.createFeatureLayer(layer as __esri.Sublayer, true));

                    if (!!featuteLayer) {
                        fields = featuteLayer.fields;
                    }
                }

                const fieldsInConfig: Array<HSI.SelectionResultWidget.IField & { order: number; }> = [];
                const fieldsNotInConfig: Array<HSI.SelectionResultWidget.IField> = [];
        
                const fieldInfos = layerConfiguration?.fieldInfos || [];
                for (let field of fields) {
                    let attributeConfigurationIndex = fieldInfos.findIndex(fieldInfo => FeatureHelper.compareFieldName(fieldInfo.fieldName, field));
                    if (attributeConfigurationIndex === -1) {
                        fieldsNotInConfig.push({
                            field,
                            editable: false,
                            required: false
                        });
                    } else if (fieldInfos[attributeConfigurationIndex].visible !== false) {
                        const editable = layerConfiguration?.allowUpdate && fieldInfos[attributeConfigurationIndex].isEditable;
                        fieldsInConfig.push({
                            order: attributeConfigurationIndex,
                            editable,
                            field,
                            required: editable && fieldInfos[attributeConfigurationIndex].isRequired
                        });
                    }
                }
        
                fieldsInConfig.sort((a, b) => a.order - b.order);
                
                steState({ loadingState: ELoadStatus.Loaded, fields: fieldsInConfig.map(({ field, editable, required }) => ({ field, editable, required })).concat(...fieldsNotInConfig) });
            } catch(err) {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                    NotificationHelper.addNotification({ message: messageFormater("failedToLoadFields"), type: "warning" });
                    steState({ fields: [], loadingState: ELoadStatus.Error });
                }
            }
        })();

        return function() {
            abortController.abort();
        }
    }, [layer, layerConfiguration, featureType, featureServerFields, jimuMapView]);

    return state;
}

interface IFieldOrder {
    /**
     * - Sloupce, které chceme zobrazit v atributové tabule včetně informace zda jsou editovatelné.
     * - Sloupce jsou seřazeny podle konfigurace.
     */
    fields: Array<HSI.SelectionResultWidget.IField>;
    /** - Stav načtení {@link fields sloupců}. */
    loadingState: ELoadStatus;
}