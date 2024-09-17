/**
 * - Rozhoduje o změně state.
 * @param state - Současné hodnoty state.
 * @param params - Parametry podle kterých se mění state.
 */
export function reducer(state: IState, params: IStateChangeParams): IState {
    try {
        /** - Kopie objektu {@link state}. */
        const stateCopy = { ...state };
        switch(params.type) {
            case EStateChange.SelectSpatialReference:
                if (!params.wkid || params.wkid === state.selectedSpatialReference?.wkid) {
                    return state;
                }

                stateCopy.selectedSpatialReference = state.spatialReferences.find(spatialReference => spatialReference.spatialReference.wkid === params.wkid)?.spatialReference;

                return !!stateCopy.selectedSpatialReference ? stateCopy : state;

            case EStateChange.SpatialReferenceList:
                if (!Array.isArray(params.spatialReferences) || state.spatialReferences === params.spatialReferences) {
                    return state;
                }

                stateCopy.spatialReferences = params.spatialReferences;

                if (stateCopy.spatialReferences.findIndex(spatialReferenceTemplate => spatialReferenceTemplate.spatialReference === stateCopy.selectedSpatialReference) === -1) {
                    stateCopy.selectedSpatialReference = stateCopy.spatialReferences[0]?.spatialReference;
                }

                return stateCopy;

            case EStateChange.SetCoordinates:
                if (state.coordinates === params.coordinates) {
                    return state;
                }

                stateCopy.coordinates = params.coordinates;

                return stateCopy;

            case EStateChange.SetGeometryServiceUrl:
                stateCopy.geometryServiceUrl = params.geometryServiceUrl;

                return stateCopy;

            default:
                throw new Error(`Unhandled state change '${params["type"]}'`);
        }
    } catch(err) {
        console.warn(err);
        return state;
    }
}

/** - Poskytuje výchozí hodnoty state. */
export function initializer(): IState {
    return {
        selectedSpatialReference: null,
        spatialReferences: [],
        coordinates: null,
        geometryServiceUrl: null
    }
}

interface IState {
    /** - Vybraný souřadnicový systém. */
    selectedSpatialReference: __esri.SpatialReference;
    /** - Seznam všech souřadnicových systémů. */
    spatialReferences: Array<ISpatialReferenceTemplate>;
    /** - Souřadnice zadané uživatelem. */
    coordinates: string;
    /** - Url adresa služeb pro práci s geometrií. */
    geometryServiceUrl: string;
};

interface ISpatialReferenceTemplate extends Omit<HSI.DbRegistry.ISpatialReferenceSetting, "wkid"> {
    /** - Souřadnicový systém. */
    spatialReference: __esri.SpatialReference
}

/** - Druhy změn state. */
export enum EStateChange {
    /** - Výběr nové hodnoty {@link IState.selectedSpatialReference} */
    SelectSpatialReference,
    /** - Změna hodnoty {@link IState.spatialReferences} */
    SpatialReferenceList,
    /** - Změna hodnoty {@link IState.coordinates} */
    SetCoordinates,
    /** - Změna hodnoty {@link IState.geometryServiceUrl} */
    SetGeometryServiceUrl
}

type IStateChangeParams = {
    /** - Typ změny state. */
    type: EStateChange.SelectSpatialReference;
    /** - Identifikátor nové hodnoty {@link selectedSpatialReference} */
    wkid: __esri.SpatialReference['wkid'];
} | {
    /** - Typ změny state. */
    type: EStateChange.SpatialReferenceList;
    /** - Nová hodnota {@link IState.spatialReferences} */
    spatialReferences: IState['spatialReferences'];
} | {
    /** - Typ změny state. */
    type: EStateChange.SetCoordinates;
    /** - Nová hodnota {@link IState.coordinates} */
    coordinates: IState['coordinates'];
} | {
    /** - Typ změny state. */
    type: EStateChange.SetGeometryServiceUrl;
    /** - Nová hodnota {@link IState.geometryServiceUrl} */
    geometryServiceUrl: IState['geometryServiceUrl'];
};