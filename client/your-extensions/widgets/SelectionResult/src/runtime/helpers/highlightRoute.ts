import { JimuMapView } from "jimu-arcgis";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { LayerDefinitionHelper, GeometryHelper } from "widgets/shared-code/helpers";
import { EContextMenuKeys } from "widgets/shared-code/enums";

/**
 * - Zvíraznění v mapě trasy odpovídající {@link feature kabelu}.
 * @param jimuMapView - Aktivní view mapy.
 * @param feature - Prvek (kabel), nad kterým se vyvolává {@link action akce}.
 * @param action - Konfigurace akce zvýraznění trasy v mapě.
 */
export default async function(jimuMapView: JimuMapView, feature: __esri.Graphic, action: HSI.DbRegistry.IContextMenuAction<EContextMenuKeys.RouteHighlight>): Promise<boolean> {
    //#region - Validace

    /** - Chybějící položky v konfiguraci. */
    const missingConfiguration: Array<keyof typeof action> = [];
    /** - Položky v konfiguraci. */
    const configurationItems: typeof missingConfiguration = ["cableAttribute", "highVoltageCableAttribute", "highVoltageLayer", "highVoltageSearchAttribute", "lowVoltageAttribute", "lowVoltageLayer"];

    for (let item of configurationItems) {
        if (!action[item]) {
            missingConfiguration.push(item);
        }
    }

    if (missingConfiguration.length > 0) {
        throw new Error(`Incorrect configuration. Missing parameters: '${missingConfiguration.join("', '")}'`);
    }

    if (!feature.getAttribute(action.cableAttribute)) {
        throw new Error(`Feature does not have attribut: '${action.cableAttribute}'`);
    }

    //#endregion
    const [highVoltageLayer, lowVoltageLayer] = await Promise.all([
        LayerDefinitionHelper.findLayerByDefinition(jimuMapView, action.highVoltageLayer),
        LayerDefinitionHelper.findLayerByDefinition(jimuMapView, action.lowVoltageLayer)
    ]);

    //#region - Validace

    if (!highVoltageLayer) {
        throw new Error(`Application does not contain layer: ${JSON.stringify(action.highVoltageLayer)}`);
    }
    if (!lowVoltageLayer) {
        throw new Error(`Application does not contain layer: ${JSON.stringify(action.lowVoltageLayer)}`);
    }

    if (highVoltageLayer.loadStatus !== "loaded") {
        await highVoltageLayer.load();
    }

    if (lowVoltageLayer.loadStatus !== "loaded") {
        await lowVoltageLayer.load();
    }

    if (!highVoltageLayer.fields.some(f => f.name === action.highVoltageSearchAttribute)) {
        throw new Error(`Layer does not contain field '${action.highVoltageSearchAttribute}'`);
    }

    if (!highVoltageLayer.fields.some(f => f.name === action.highVoltageCableAttribute)) {
        throw new Error(`Layer does not contain field '${action.highVoltageCableAttribute}'`);
    }

    if (!lowVoltageLayer.fields.some(f => f.name === action.lowVoltageAttribute)) {
        throw new Error(`Layer does not contain field '${action.lowVoltageAttribute}'`);
    }

    //#endregion

    const highVoltageFeatureSet = await highVoltageLayer.queryFeatures({
        where: `${action.highVoltageCableAttribute}=${feature.getAttribute(action.cableAttribute)}`,
        outFields: [action.highVoltageSearchAttribute],
        returnGeometry: false
    });

    if (highVoltageFeatureSet.features?.length > 0) {
        const lowVoltageFeatureSet = await lowVoltageLayer.queryFeatures({
            where: `${action.lowVoltageAttribute} IN (${highVoltageFeatureSet.features.map(f => f.getAttribute(action.highVoltageSearchAttribute)).join(",")})`,
            outFields: ["*"],
            returnGeometry: true
        });

        if (lowVoltageFeatureSet.features.length > 0) {
            
            await GeometryHelper.zoom(jimuMapView, lowVoltageFeatureSet.features);
            
            await SelectionManager
                .getSelectionSet(jimuMapView)
                .addFetureSet(lowVoltageFeatureSet);


            return true;
        }
    }

    return false;
}