import { React } from "jimu-core";
import { LayerHelper, ArcGISJSAPIModuleLoader } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import LayerConfigurationContext from "../contexts/LayerConfigurationContext";

const ModuleLoader = new ArcGISJSAPIModuleLoader(["FeatureLayer"]);

/**
 * - Při {@link isEditing započatí editace}, zjistí zda je {@link feature prvek} editovatelný, na základě {@link ISublayerEditabilityConfiguration.updateCondition podmínek editovatelnosti}.
 * @param feature - Prvek u kterého zjišťujeme editovatelnost. 
 * @param isEditing - Je pro {@link feature prvek} zaplý režim editace?
 */
export default function(feature: __esri.Graphic, isEditing: boolean): IState {
    const [state, dispatchState] = React.useState<IState>({ isEditable: false, isLoaded: false });
    const jimuMapView = React.useContext(JimuMapViewContext);
    /** - Konfigurace editovatelnosti prvku {@link feature}. */
    const editabilityConfiguration = React.useContext(LayerConfigurationContext);

    /** - Při změně prvku {@link feature} se vynulují hodnoty {@link state}. */
    React.useEffect(() => {
        const isEditable = !Array.isArray(editabilityConfiguration?.updateCondition) || editabilityConfiguration.updateCondition.length < 1;
        dispatchState({ isEditable, isLoaded: isEditable });
    }, [feature, editabilityConfiguration?.updateCondition]);

    /** - Pokud je zaplá editace {@link isEditing}, tak se dodačte editovatelnost prvku {@link feature} (pokud ještě není načtená). */
    React.useEffect(() => {
        const abortController = new AbortController();

        if (!state.isLoaded && isEditing && Array.isArray(editabilityConfiguration?.updateCondition) && editabilityConfiguration.updateCondition.length > 0) {
            (async function() {
                try {
                    const results = await Promise.all<boolean>(editabilityConfiguration.updateCondition.map(async updateCondition => {
                        switch (updateCondition.type) {
                            case "feature-must-not-exist":
                                const mapImageLayer = LayerHelper.getMapImageLayerFromFeature(jimuMapView, feature);
                                if (!ModuleLoader.isLoaded) {
                                    await ModuleLoader.load();
                                }
            
                                const featureLayer = new (ModuleLoader.getModule("FeatureLayer"))({
                                    url: `${mapImageLayer.url}/${updateCondition.conditionLayerId}`
                                });

                                const featureCount = await featureLayer.queryFeatureCount({
                                    where: `${updateCondition.conditionAttribute} LIKE '${feature.getAttribute(updateCondition.attribute)}'`
                                }, { signal: abortController.signal });
                                
                                return featureCount === 0;
                            default:
                                throw new Error(`Unhandled update condition type '${updateCondition.type}'`)
                        }
                    }));

                    if (!abortController.signal.aborted) {
                        dispatchState({
                            isEditable: !results.includes(false),
                            isLoaded: true,
                            message: editabilityConfiguration.updateCondition
                                .filter((updateCondition, index) => !results[index])
                                .map(updateCondition => updateCondition.message)
                                .join('\n')
                        });
                    }
                } catch(err) {
                    if (!abortController.signal.aborted) {
                        console.warn(err);
                    }
                }
            })();
        }

        return function () {
            abortController.abort();
        }
    }, [feature, editabilityConfiguration?.updateCondition, state.isLoaded, isEditing, jimuMapView]);

    return state;
}

interface IState {
    /** - Probíhá zjišťování editovatelnosti? */
    isLoaded: boolean;
    /** - Je prvek editovatelný? */
    isEditable: boolean;
    /** - Zpráva vysvětlujicí, proč prvek není editovatelný. */
    message?: string;
}