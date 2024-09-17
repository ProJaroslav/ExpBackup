import { extensionSpec, IMState } from 'jimu-core';

declare module 'jimu-core/lib/types/state'{
    interface State {
        /**
         * - Rozšíření HSI.
         * - Registrace widgetů které se starají o určité akce v aplikaci.
         * - Jedná se o akce, které se mají vyvolat hned po načtení aplikace a pouze jednou (např. přečtení url parametrů).
         * - Vždy se zaregistruje první načnený widget, který má povoleno se o určitou akci starat.
         */
        hsiFirstRenderHandler: HSI.FirstRenderHandlerStore.IMState;
    }
}

/**
 * - Registrace widgetů které se starají o určité akce v aplikaci.
 * - Jedná se o akce, které se mají vyvolat hned po načtení aplikace a pouze jednou (např. přečtení url parametrů).
 * - Vždy se zaregistruje první načnený widget, který má povoleno se o určitou akci starat.
 */
export default class FirstRenderHandlerStoreExtension implements extensionSpec.ReduxStoreExtension {
    id = 'hsi-first-render-handler-redux-store-extension';

    getActions() {
        return ["register-first-render-handler"];
    }

    getInitLocalState(): HSI.FirstRenderHandlerStore.IState {
        return {
            urlParser: null,
            requestTimeout: null,
            drawSelection: null,
            selectionHandler: null,
            tokenRefresh: null,
            disebleSelection: null,
            startBookmark: null,
            checkLayersAccessibility: null
        };
    }

    getReducer() {
        return (localState: HSI.FirstRenderHandlerStore.IMState, action: HSI.FirstRenderHandlerStore.IRegisterHandlerAction, appState: IMState): HSI.FirstRenderHandlerStore.IMState => {
            try {
                switch (action.type) {
                    case "register-first-render-handler":
                        if (!Object.keys(localState).includes(action.actionName)) {
                            throw new Error(`Action '${action.actionName}' is no allowed`);
                        }

                        /** - Pokud je pro tuto akci již něaký widget registrovaný, tak nic neděláme. */
                        if (!action.widgetId || localState.getIn([action.actionName]) !== null) {
                            return localState;
                        }

                        return localState.set(action.actionName, action.widgetId);

                    default:
                        throw new Error(`Unhandled notification state change '${action['type']}'`);
                }
            } catch(err) {
                console.error(err);
                return localState;
            }
        }
    }

    getStoreKey() {
        return 'hsiFirstRenderHandler';
    }
}