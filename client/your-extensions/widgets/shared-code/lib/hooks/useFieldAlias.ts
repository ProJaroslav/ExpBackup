import { FeatureHelper } from "widgets/shared-code/helpers";
import { useForceUpdate } from "widgets/shared-code/hooks";
import { EFieldAlias } from "widgets/shared-code/enums";

/**
 * - Poskytuje funkci pro získání aliasu pole.
 * @param feature - Vrstva nebo prvek obsahující pole.
 * @param aliasType - Způsob získávání aliasu.
 */
export default function(feature: __esri.Graphic | __esri.Sublayer | __esri.FeatureLayer, aliasType: EFieldAlias) {
    const forceUpdate = useForceUpdate();

    return function(field: __esri.Field): string {
        switch (aliasType) {
            case EFieldAlias.popup:
                return FeatureHelper.popupAlias(feature, field, forceUpdate);
            default:
                console.warn(`Unhandled alias type: ${aliasType}`);
            case EFieldAlias.default:
                return field.alias;
        }
    }
}