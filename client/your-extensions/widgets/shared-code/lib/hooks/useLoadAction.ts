import { React } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { DbRegistryLoader, LayerInfoHelper, FromDataHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys } from "widgets/shared-code/enums";

/**
 * Vrací @IFromAction, pokud ho má atribut v registru uvedený 
 * @param fieldName - Název atributu, pro který hledáme přiřažený action
 * @param subLayer - Slouží k načtení datasetu pro daný subLayer 
 */
export default function useLoadAction(fieldName: string, subLayer: __esri.Sublayer) {
    const [action, setAction] = React.useState<HSI.DbRegistry.IFromDataAction>(null);
    const jimuMapView = React.useContext(JimuMapViewContext);
    
    React.useEffect(() => {
        let isMounted = true; 

        (async () => {
            try {
                const matchingLayer = await LayerInfoHelper.findMatchingLayerBySublayer(subLayer);
                if (!matchingLayer) {
                    throw new Error("MatchingLayer nebyl nalezen.");
                }
                
                let formData = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, {
                    name: EDbRegistryKeys.FromData,
                    scope: "g",
                    type: "json"
                });
                
                if (!formData) {
                    throw new Error("V konfiguraci nejsou definovány dotazy.");
                }
                
                if (isMounted) {
                    const actionTest = FromDataHelper.findActionInFromData(fieldName, formData, matchingLayer);
                    setAction(actionTest);
                }

            } catch (err) {
                if (isMounted) {
                    console.warn(err);
                }
            }
        })();

        return () => {
            isMounted = false; 
        };
    }, [jimuMapView, subLayer, fieldName]);


    return action;
}