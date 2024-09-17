import { React, useIntl } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { FeatureHelper, DbRegistryLoader } from "widgets/shared-code/helpers";
import { EDbRegistryKeys } from "widgets/shared-code/enums";

/**
 * - Poskytuje funkci pro zobrazení prvku podle formátu z konfigurace.
 * @param options - Specifikace formátování.
 */
export default function(options?: IUseDisplayFeatureOptions): (feature: __esri.Graphic) => string {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const intl = useIntl();
    const formatKey = options?.formatKey || "default";
    const [style, setStyle] = React.useState<HSI.Feature.IDisplayFeatureOptions['style']>(formatKey === "withLayerTitle" ? "{layerTitle} - {diplayField} - {OID}" : "{diplayField} ({OID})");

    React.useEffect(() => {
        if (jimuMapView) {
            let isActive = true;

            DbRegistryLoader
                .fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.DisplayFeatureFormat, scope: "g", type: "json" })
                .then(dbConfig => {
                    if (isActive && typeof dbConfig?.[formatKey] === "string") {
                        setStyle(dbConfig[formatKey]);
                    }
                })
                .catch(err => {
                    console.warn(err);
                })

            return function() {
                isActive = false;
            }
        }
    }, [jimuMapView, formatKey]);

    return function(feature) {
        return FeatureHelper.displayFeature(feature, { intl, style, displayField: options?.displayField, featureSet: options?.featureSet });
    }
}

interface IUseDisplayFeatureOptions extends Pick<HSI.Feature.IDisplayFeatureOptions, "featureSet" | "displayField"> {
    /**
     * - Klíč pod kterým je v konfiguraci definován formát, podle kterého se zobrazuje prvek.
     * @default "default"
     */
    formatKey?: keyof HSI.IDisplayFeatureFormatDbValue;
}