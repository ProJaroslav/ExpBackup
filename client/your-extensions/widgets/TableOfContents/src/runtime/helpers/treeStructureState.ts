import { JimuMapView } from "jimu-arcgis";
import LayerTree from "../components/LayerTree";
import ITreeStructureState from "../interfaces/ITreeStructureState";

/**
 * - Funkce která rozhoduje o změně state komponenty {@link LayerTree} na základě hodnot předaných ve vstupu "params".
 * @param currentState - Současné hodnoty state.
 * @param params - Parametry podle kterých se změní state.
 */
export function reducer(state: ITreeStructureState, params: IStateChangeParams): ITreeStructureState {
    try {
        const stateCopy = { ...state };
        switch(params.type) {
            case EStateChange.OnJimuMapChange:

                return params.defaultState;

            case EStateChange.OnScaleChange:
                stateCopy.scale = params.scale;

                return stateCopy;

            case EStateChange.ToggleExpand:
                if (!(params.gisId in stateCopy.layerStructure)) {
                    return state;
                }

                stateCopy.layerStructure[params.gisId].expanded = !stateCopy.layerStructure[params.gisId].expanded;

                return stateCopy;

            default:
                throw new Error(`Unhandled state change '${params['type']}'`);
        }
    } catch(err) {
        console.warn(err);
        return state;
    }
}

/** - Poskytuje výchozí hodnoty state komponenty {@link LayerTree}. */
export function initializer(jimuMapView: JimuMapView): ITreeStructureState {
    return {
        scale: jimuMapView?.view?.scale || 0,
        layerStructure:  {},
        baseLayers: [],
        canValidateData: false
    };
}

/** - Možné změny state komponenty {@link LayerTree}. */
type IStateChangeParams = (
    {
        /** - Typ změny state. */
        type: EStateChange.OnScaleChange;
        /** - Měřítko mapy. */
        scale: number;
    } | {
        /** - Typ změny state. */
        type: EStateChange.OnJimuMapChange;
        /** - Nové aktivní JimuMapView. */
        jimuMapView: JimuMapView;
        /** - Výchozí hodnoty state. */
        defaultState: ITreeStructureState;
    } | {
        /** - Typ změny state. */
        type: EStateChange.ToggleExpand;
        /** - Unikítní GisId vrstvy. */
        gisId: string;
    }
);


/** - Typy změn state v komponentě {@link LayerTree}. */
export enum EStateChange {
    /** - Zm změnilo se měřítko mapy. */
    OnScaleChange = "on-scale-change",
    /** - Změnilo se aktivní JimuMapView. */
    OnJimuMapChange = "on-jimu-map-view-change",
    /** - Přepnutí stavu otevření vrstvy ve stromové struktuře. */
    ToggleExpand = 'toggle-expand'
};