import { FeatureHelper } from "widgets/shared-code/helpers";
import { useHsiSelection } from "widgets/shared-code/hooks";

/**
 * - Poskytuje grafické prvky ve výběru uložené pod jejich GisId.
 * @param options - Rozšířené možnosti.
 */
export function useHsiSelectionDictionary(options: IUseHsiSelectionDictionaryOptions = {}): HSI.IHsiSelectionDictionary {
    const selection = useHsiSelection({ populate: true, jimuMapView: options.jimuMapView });
    const featureDictionary: {[gisId: string]: __esri.Graphic} = {};

    for (let sublayerGisId of Object.keys(selection.selection)) {
        if (!Array.isArray(options.filterSublayers) || options.filterSublayers.includes(sublayerGisId)) {
            for (let feature of selection.selection[sublayerGisId]?.featureSet?.features || []) {
                featureDictionary[FeatureHelper.getFeatureGisId(feature)] = feature;
            }
        }
    }

    return featureDictionary;
}

interface IUseHsiSelectionDictionaryOptions extends Pick<HSI.IUseHsiSelection, "jimuMapView"> {
    /**
     * - GisId podvrstev jejichž prvky chceme poskytnout.
     * - Pokud není definováno, poskytnou se všechny prvky z výběru.
     */
    filterSublayers?: Array<string>;
};

export default useHsiSelectionDictionary;