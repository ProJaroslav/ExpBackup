import { React } from "jimu-core";
import translations from "../translations/default";
import { NotificationHelper, FeatureHelper, LayerHelper } from "widgets/shared-code/helpers";
import { EFeatureType } from "widgets/shared-code/enums";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { useMessageFormater, useForceUpdate } from "widgets/shared-code/hooks";

/**
 * - Rozšíření {@link fields polí} o vlastnosti nullable, editable a defaultValue.
 * - Toto rozšíření se provede z polí načtených přes FeatureSever.
 * - Toto rozšíření se provede pouze pokud je {@link extend} rovno "true", a pouze pro {@link IField.editable editovatelná pole}.
 * - Vrací informaci zda probíhá rozšiřování.
 * @param fields - Pole, které chceme rozšířit (Počítá se s tím, že pole byla načtena přes MapServer, tudíž nemají vlastnosti nullable, editable, ani defaultValue).
 * @param feature - Prvek, pro jehož atributům odpovídají {@link fields tato pole}.
 * @param extend - Chceme aby se při tomto rendereru {@link fields pole} rozšířila?
 */
export default function(fields: Array<HSI.SelectionResultWidget.IField>, feature: __esri.Graphic, extend: boolean): boolean {
    const [isLoading, toggleIsLoading] = React.useState<boolean>(false);
    const jimuMapView = React.useContext(JimuMapViewContext);
    const messageFormater = useMessageFormater(translations);
    const forceUpdate = useForceUpdate(); 
    const lastLoadedLayerRef = React.useRef<typeof layer.id>();

    const featureType = FeatureHelper.getFeatureType(feature);
    /** - Podvrstva / negrafická vrstva (tabulka) ze které {@link feature prvek} pochází. */
    const layer = featureType === EFeatureType.Table ? LayerHelper.getTableFromFeature(feature) : LayerHelper.getSublayerFromFeature(feature);

    React.useEffect(() => {
        let isActive = true;

        if (!!layer && lastLoadedLayerRef.current !== layer.id && extend) {
            (async function() {
                try {
                    let editableFields = fields.filter(field => field.editable);
    
                    if (editableFields.length > 0) {
                        toggleIsLoading(true);
                        lastLoadedLayerRef.current = layer.id;
    
                        const featureLayer = featureType === EFeatureType.Table ? await LayerHelper.duplicateTable(jimuMapView, layer as __esri.FeatureLayer) : await LayerHelper.createFeatureLayer(layer as __esri.Sublayer, true);
    
                        if (!featureLayer.loaded) {
                            await featureLayer.load();
                        }
    
                        for (let editableField of editableFields) {
                            const fetureLayerField = featureLayer.fields.find(field => FeatureHelper.compareFieldName(field, editableField.field));

                            if (!!fetureLayerField) {
                                editableField.field.nullable = fetureLayerField.nullable;
                                editableField.field.editable = fetureLayerField.editable;
                                editableField.field.defaultValue = fetureLayerField.defaultValue;
                            }
                        }
    
                        if (isActive) {
                            toggleIsLoading(false);
                        } else {
                            forceUpdate(); // Může se stát, že byla akce vyvolána v jiném renderu, ale fields jsou pořád aktuální.
                        }
                    }
                } catch(err) {
                    console.warn(err);
                    toggleIsLoading(false);
                    NotificationHelper.addNotification({ message: messageFormater("failedToLoadFields"), type: "warning" });
                }
            })();
        }

        return function() {
            isActive = false;
            toggleIsLoading(false);
        }
    }, [lastLoadedLayerRef, layer, fields, extend]);

    return isLoading;
}