import ESelectedFeaturesType from "../enums/ESelectedFeaturesType";
import { ELoadStatus } from "widgets/shared-code/enums";

/**
 * - Řeší změny hodnot state komponenty Widget.
 * @param state - Současné hodnoty state.
 * @param params - Parametry podle kterých se mění state.
 */
export function reducer(state: IState, params: IStateChangeParams): IState {
    try {
        const stateCopy = { ...state };

        switch(params.type) {
            case EStateChangeTypes.SelectFeatures:

                stateCopy.selectedFeatures = params.selectedFeatures;
                return stateCopy;

            case EStateChangeTypes.ToggleExpand:
                if (!params.objectDefiniton.id) {
                    return state;
                }

                let objectState = findObjectState(stateCopy.layersStates, params.objectDefiniton.id);

                // Pokud záznam ve state není, tak ho vytvoříme.
                if (!objectState) {
                    objectState = {
                        children: {},
                        expanded: true,
                        id: params.objectDefiniton.id,
                        gisId: params.objectDefiniton.gisId
                    };

                    if (!params.objectDefiniton.parentId) {
                        stateCopy.layersStates[params.objectDefiniton.gisId] = objectState;
                    } else {
                        let parentObjectState = findObjectState(stateCopy.layersStates, params.objectDefiniton.parentId);
    
                        if (!parentObjectState) {
                            return state;
                        }
                        parentObjectState.children[params.objectDefiniton.gisId] = objectState;
                    }
                } else {
                    objectState.expanded = !objectState.expanded;
                }

                /** Aby došlo k rerenderu komponenty SelectionTree. */
                stateCopy.layersStates = { ...stateCopy.layersStates };

                return stateCopy;

            case EStateChangeTypes.LoadedRelationClassesStart:
                if (state.loadedRelationClasses[params.id]?.state === ELoadStatus.Loaded) {
                    return state;
                
                }
                stateCopy.loadedRelationClasses[params.id] = {
                    state: ELoadStatus.Pending
                }

                return stateCopy;

            case EStateChangeTypes.LoadedRelationClassesError:
                if (state.loadedRelationClasses[params.id].state === ELoadStatus.Loaded) {
                    return state;
                }

                state.loadedRelationClasses[params.id] = {
                    state: ELoadStatus.Error,
                    errorMessage: params.error instanceof Error ? params.error.message : params.error,
                    result: []
                };

                return stateCopy;

            case EStateChangeTypes.LoadedRelationClassesSuccess:
                if (state.loadedRelationClasses[params.id]?.state === ELoadStatus.Loaded) {
                    return state;
                }

                stateCopy.loadedRelationClasses[params.id] = {
                    state: ELoadStatus.Loaded,
                    result: params.result
                };

                return stateCopy;

            case EStateChangeTypes.LoadedRelationObjectsStart:
                if (state.loadedRelationObjects[params.id]?.state === ELoadStatus.Loaded) {
                    return state;
                
                }
                stateCopy.loadedRelationObjects[params.id] = {
                    state: ELoadStatus.Pending
                };

                return stateCopy;

            case EStateChangeTypes.LoadedRelationObjectsError:
                if (state.loadedRelationObjects[params.id]?.state === ELoadStatus.Loaded) {
                    return state;
                }

                stateCopy.loadedRelationObjects[params.id] = { state: ELoadStatus.Error };

                return stateCopy;

            case EStateChangeTypes.LoadedRelationObjectsSuccess:
                if (state.loadedRelationObjects[params.id]?.state === ELoadStatus.Loaded) {
                    return state;
                }

                stateCopy.loadedRelationObjects[params.id] = {
                    state: ELoadStatus.Loaded,
                    result: params.result
                };

                return stateCopy;

            case EStateChangeTypes.DestroyRelationObjects:
                if (!Array.isArray(params.ids) || params.ids.length < 1) {
                    return state;
                }

                for (let id of params.ids) {
                    delete stateCopy.loadedRelationObjects[id];
                }

                return stateCopy;

            case EStateChangeTypes.CloseMultipleObjects:
                if (!Array.isArray(params.ids)) {
                    return state;
                }

                /** - Unikátní identifikátory otevřených objektů, které chceme zavřít. */
                const idsToClose = params.ids.reduce<Array<string>>((arr, value) => {
                    if (arr.includes(value)) {
                        return arr;
                    }

                    if (!findObjectState(state.layersStates, value)?.expanded) {
                        return arr;
                    }

                    return arr.concat(value);
                }, []);

                if (idsToClose.length < 1) {
                    return state;
                }

                for (let id of idsToClose) {
                    closeAllChildren(findObjectState(stateCopy.layersStates, id));
                }

                stateCopy.layersStates = { ...stateCopy.layersStates };

                return stateCopy;

            case EStateChangeTypes.SupportFeaturesLoaded:
                if (!params.id || !Array.isArray(params.featureSet?.features)) {
                    return state;
                }

                stateCopy.supportFeatureSets[params.id] = params.featureSet;

                return stateCopy;

            case EStateChangeTypes.LoadedEvaluatedRelationClassesSuccess:
                if (state.loadedRelationClasses[params.id]?.state === ELoadStatus.Loaded) {
                    return state;
                }

                const result: HSI.SelectionResultWidget.ILoadedRelationClass['result'] = params.result.success.map(item => {
                    stateCopy.loadedRelationObjects[`${params.id}_${item.id}`] = {
                        state: ELoadStatus.Loaded,
                        result: item.featureSet
                    };

                    return {
                        featureType: item.featureType,
                        forward: item.forward,
                        id: item.id,
                        label: item.label,
                        layer: item.layer,
                        type: item.type
                    }
                });

                if (Array.isArray(params.result.errors) && params.result.errors.length > 0) {
                    stateCopy.loadedRelationClasses[params.id] = {
                        state: ELoadStatus.Error,
                        result,
                        errorMessage: params.result.errors.map(err => `Failed to load relationships from service '${err.mapService?.title}':\n${err.error instanceof Error ? err.error.message : err.error}`).join("\n")
                    }    
                } else {
                    stateCopy.loadedRelationClasses[params.id] = {
                        state: ELoadStatus.Loaded,
                        result
                    }    
                }

                return stateCopy;

            default:
                throw new Error(`Unhandled state change '${params['type']}'`);
        }
    } catch(err) {
        console.warn(err);
        return state;
    }
}

function closeAllChildren(objectState: HSI.SelectionResultWidget.ITreeState): void {
    objectState.expanded = false;
    if (objectState.children) {
        for (let child of Object.values(objectState.children)) {
            closeAllChildren(child);
        }
    }
}

/**
 * - Nachází stav zobrazení objektu ve stromové struktuře podle jeho id.
 * @param objectStates - Stavy zobrazení objektů ve stromové struktuře.
 * @param id - Id stavu zobrazení objektu.
 */
function findObjectState(objectStates: { [id: string]: HSI.SelectionResultWidget.ITreeState }, id: string): HSI.SelectionResultWidget.ITreeState | undefined {
    for (let objectState of Object.values(objectStates)) {
        if (objectState.id === id) {
            return objectState;
        }
        let childObjectState = findObjectState(objectState.children, id);

        if (childObjectState) {
            return childObjectState;
        }
    }
}

/** - Poskytuje výchozí hodnoty state komponenty Widget. */
export function initializer (): IState {
    return {
        layersStates: {},
        selectedFeatures: {
            type: ESelectedFeaturesType.Empty
        },
        loadedRelationClasses: {},
        loadedRelationObjects: {},
        supportFeatureSets: {}
    };
}

export interface IState {
    /** - Zvolené objekty ve stromové struktuře. */
    selectedFeatures: HSI.SelectionResultWidget.ISelectedFeatures;
    /** - Stav zobrazení vrstev ve stromové struktuře pod jeich GisId. */
    layersStates: {
        [gisId: string]: HSI.SelectionResultWidget.ITreeState;
    };
    /** - Slovník načtených relačních tříd uložených pod gisId prvku. */
    loadedRelationClasses: HSI.SelectionResultWidget.ILoadedRelationClasses;
    /**
     * - Slovník navazbených prvků uložených pod identifikátorem dotazu.
     * - Identifikátor dotazu je složen z gisId prvku a id relace.
     */
    loadedRelationObjects: HSI.SelectionResultWidget.ILoadedRelationObjects;
    /** - Prvky poskytujicí geometrii negrafickým prvkům, uložené pod GisId negragického prvku. */
    supportFeatureSets: {
        [gisId: string]: __esri.FeatureSet;
    };
};

/** - Typy změn state komponenty Widget. */
export enum EStateChangeTypes {
    /** - Změna zvolených objektů ve stromové struktuře. */
    SelectFeatures,
    /** - Přepnutí viditelnosti potomků ve stromové struktuře. */
    ToggleExpand,
    /** - Začal dotaz pro načtění relačních tříd. */
    LoadedRelationClassesStart,
    /** - Dotaz pro načtení relačních tříd proběhl úspěšně. */
    LoadedRelationClassesSuccess,
    /** - Dotaz pro načtení relačních tříd (včetně relačních objektů) proběhl úspěšně. */
    LoadedEvaluatedRelationClassesSuccess,
    /** - Při načítání relačních tříd nastala chyba. */
    LoadedRelationClassesError,
    /** - Začal dotaz pro načtění navazbených prvků. */
    LoadedRelationObjectsStart,
    /** - Dotaz pro načtení navazbených prvků proběhl úspěšně. */
    LoadedRelationObjectsSuccess,
    /** - Při načítání navazbených prvků nastala chyba. */
    LoadedRelationObjectsError,
    /** - Odebrání záznamů u navazběných objektů prvku (vyvolá se tím aktualizace). */
    DestroyRelationObjects,
    /** - Hromadně zavře potomky prvků/vrstev ve stromové struktuře. */
    CloseMultipleObjects,
    /** - Načetly se prvky poskytujicí geometrii negrafickým prvkům. */
    SupportFeaturesLoaded
};

type IStateChangeParams = (
    {
        /** - Typ změny state. */
        type: EStateChangeTypes.SelectFeatures;
        /** - Zvolené objekty ve stromové struktuře. */
        selectedFeatures: HSI.SelectionResultWidget.ISelectedFeatures;
    } | {
        /** - Typ změny state. */
        type: EStateChangeTypes.ToggleExpand;
        /** - Identifikace zobrazení objektu jehož potomkům přepínáme viditelnost. */
        objectDefiniton: HSI.SelectionResultWidget.IExpandParams;
    } | {
        /** - Typ změny state. */
        type: EStateChangeTypes.LoadedRelationClassesStart;
        /** - Identifikátor dotazu složen z gisId prvku. */
        id: string;
    } | {
        /** - Typ změny state. */
        type: EStateChangeTypes.LoadedRelationClassesSuccess;
        /** - Identifikátor dotazu složen z gisId prvku. */
        id: string;
        /** - Načtené relační třídy. */
        result: Array<HSI.SelectionResultWidget.IRelationship>;
    } | {
        /** - Typ změny state. */
        type: EStateChangeTypes.LoadedEvaluatedRelationClassesSuccess;
        /** - Identifikátor dotazu složen z gisId prvku. */
        id: string;
        /** - Načtené relační třídy. */
        result: HSI.RelationHelper.IGetEvaluatedReachableRelationshipsResponse;
    } | {
        /** - Typ změny state. */
        type: EStateChangeTypes.LoadedRelationClassesError;
        /** - Identifikátor dotazu složen z gisId prvku. */
        id: string;
        /** - Odchycená chyba při načítání relačních tříd. */
        error: Error;
    } | {
        /** - Typ změny state. */
        type: EStateChangeTypes.LoadedRelationObjectsStart;
        /** - Identifikátor dotazu je složen z gisId prvku a id relace. */
        id: string;
    } | {
        /** - Typ změny state. */
        type: EStateChangeTypes.LoadedRelationObjectsSuccess;
        /** - Identifikátor dotazu je složen z gisId prvku a id relace. */
        id: string;
        /** - Nalezené navazbené prvky. */
        result: __esri.FeatureSet;
    } | {
        /** - Typ změny state. */
        type: EStateChangeTypes.LoadedRelationObjectsError;
        /** - Identifikátor dotazu je složen z gisId prvku a id relace. */
        id: string;
    } | {
        /** - Typ změny state. */
        type: EStateChangeTypes.DestroyRelationObjects;
        /**
         * - Identifikátory seznamu navazběných prvků, které chceme odebrat.
         * - Identifikátor je složen z gisId prvku a id relace.
         */
        ids: Array<string>;
    } | {
        /** - Typ změny state. */
        type: EStateChangeTypes.CloseMultipleObjects;
        /** - Unikátní identifikátory objektů, které chceme zavřít. */
        ids: Array<string>;
    } | {
        /** - Typ změny state. */
        type: EStateChangeTypes.SupportFeaturesLoaded;
        /** - GisId negrafického prvku. */
        id: string;
        /** - Prvky s geometrií pro negrafický prvek. */
        featureSet: __esri.FeatureSet;
    }
);