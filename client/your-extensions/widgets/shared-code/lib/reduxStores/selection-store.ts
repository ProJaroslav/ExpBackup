import { extensionSpec, IMState } from 'jimu-core';
import { LayerHelper } from "widgets/shared-code/helpers";
import { ESelectionActionKeys } from "widgets/shared-code/enums";

declare module 'jimu-core/lib/types/state'{
    interface State {
        hsiSelection: HSI.SelectionStore.IMSelectionState;
    }
}

export default class SelectionStoreExtension implements extensionSpec.ReduxStoreExtension {
    id = 'hsi-selection-redux-store-extension';

    getActions() {
        return Object.keys(ESelectionActionKeys).map(k => ESelectionActionKeys[k]);
    }

    getInitLocalState(): HSI.SelectionStore.ISelectionState {
        return {
            selectionSetDictionary: {}
        };
    }

    getReducer() {
        /** @todo - {@link ITableSelectionStartAction} {@link ITableSelectionEndAction} {@link ITableSelectionFailAction} */
        return (localState: HSI.SelectionStore.IMSelectionState, action: HSI.SelectionStore.ISelectionActions, appState: IMState): HSI.SelectionStore.ISelectionState | HSI.SelectionStore.IMSelectionState => {
            try {
                const stateCopy = localState.asMutable({ deep: true });
                let selectionSet = stateCopy.selectionSetDictionary[action.selectionSetKey];

                if (!selectionSet) {
                    selectionSet = stateCopy.selectionSetDictionary[action.selectionSetKey] = {
                        isPending: false,
                        selection: {},
                        tableSelection: {},
                        selectableLayers: []
                    };
                }

                switch (action.type) {
                    case ESelectionActionKeys.SelectionStart:
                        if (action.sublayers.length > 0) {
                            selectionSet.isPending = true;
                        }

                        if (action.dropSelection) {
                            selectionSet.selection = {};
                            selectionSet.tableSelection = {};
                        }

                        for (let sublayer of action.sublayers) {
                            let gisId = LayerHelper.getGisIdLayersFromLayer(sublayer);

                            if (selectionSet.selection[gisId]) {
                                selectionSet.selection[gisId].isPending = true;
                            } else {
                                selectionSet.selection[gisId] = { isPending: true };
                            }
                        }
    
                        return stateCopy;

                    case ESelectionActionKeys.SelectionEnd:
                        if (action.featureSetId) {
                            selectionSet.selection[LayerHelper.getGisIdLayersFromLayer(action.sublayer)] = {
                                isPending: false,
                                featureSetId: action.featureSetId
                            };
                        } else {
                            delete selectionSet.selection[LayerHelper.getGisIdLayersFromLayer(action.sublayer)];
                        }

                        selectionSet.isPending = Object.values(selectionSet.selection).findIndex(({ isPending }) => isPending) !== -1;

                        if (!selectionSet.isPending) {
                            selectionSet.isPending = Object.values(selectionSet.tableSelection).findIndex(({ isPending }) => isPending) !== -1;
                        }

                        return stateCopy;

                    case ESelectionActionKeys.DropSelection:
                        selectionSet.isPending = false;

                        selectionSet.selection = {};
                        selectionSet.tableSelection = {};

                        return stateCopy;

                    case ESelectionActionKeys.ToggleSelectability:
                        for (let layer of action.layers) {
                            if (layer.selectable && !selectionSet.selectableLayers.includes(layer.gisId)) {
                                selectionSet.selectableLayers.push(layer.gisId);
                            } else if (!layer.selectable && selectionSet.selectableLayers.includes(layer.gisId)) {
                                let index = selectionSet.selectableLayers.findIndex(gisId => gisId === layer.gisId);
                                selectionSet.selectableLayers.splice(index, 1);
                            }
                        }

                        return stateCopy;

                    case ESelectionActionKeys.Rerender:
                        return stateCopy;

                    case ESelectionActionKeys.SelectionFail:
                        selectionSet.selection[LayerHelper.getGisIdLayersFromLayer(action.sublayer)].isPending = false;
                        return stateCopy;

                    case ESelectionActionKeys.TableSelectionStart:
                        if (action.tables.length > 0) {
                            selectionSet.isPending = true;
                        }

                        if (action.dropSelection) {
                            selectionSet.selection = {};
                            selectionSet.tableSelection = {};
                        }

                        for (let table of action.tables) {
                            if (selectionSet.tableSelection[table.id]) {
                                selectionSet.tableSelection[table.id].isPending = true;
                            } else {
                                selectionSet.tableSelection[table.id] = { isPending: true };
                            }
                        }
    
                        return stateCopy;

                    case ESelectionActionKeys.TableSelectionFail:
                        selectionSet.tableSelection[action.table.id].isPending = false;
                        return stateCopy;

                    case ESelectionActionKeys.TableSelectionEnd:
                        if (action.featureSetId) {
                            selectionSet.tableSelection[action.table.id] = {
                                isPending: false,
                                featureSetId: action.featureSetId
                            };
                        } else {
                            delete selectionSet.tableSelection[action.table.id];
                        }

                        selectionSet.isPending = Object.values(selectionSet.selection).findIndex(({ isPending }) => isPending) !== -1;
                        if (!selectionSet.isPending) {
                            selectionSet.isPending = Object.values(selectionSet.tableSelection).findIndex(({ isPending }) => isPending) !== -1;
                        }

                        return stateCopy;

                    default:
                        throw new Error(`Unhandled selection state change '${action['type']}'`);
                }
            } catch(err) {
                console.error(err);
                return localState;
            }
        }
    }

    getStoreKey() {
        return 'hsiSelection';
    }
}