import { extensionSpec, ImmutableObject, IMState } from 'jimu-core';

export enum ENotificationActionKeys {
    /** - Vytvoření notifikace. */
    Add = "add",
    /** - Vytvořila se komponenta pro odesílání notifikací. */
    Init = "init",
    /** - Zavřít notifikace. */
    Close = "close"
};

export interface IAlertProps {
    /** - Type notifikace. */
    type: "success" | "info" | "warning" | "error";
    /** - Obsah notifikace. */
    message: string | JSX.Element;
    /** - Identifikátor notifikace. */
    id: number;
}

export type IAddNotificationAction = {
    /** - Typ změny state. */
    type: ENotificationActionKeys.Add;
    /** - Parametry notifikace. */
    alertProps: Omit<IAlertProps, "id">;
};

export type IInitNotificationAction = {
    /** - Typ změny state. */
    type: ENotificationActionKeys.Init;
    /** - Id widgetu, který zobrazuje notifikace. */
    widgetId: string;
};

export type ICloseNotificationAction = {
    /** - Typ změny state. */
    type: ENotificationActionKeys.Close;
    /** - Identifikátor notifikace, kterou chceme zavřít. */
    alertId: number;
};

export type INotificationActions = IAddNotificationAction | IInitNotificationAction | ICloseNotificationAction;

interface INotificationState {
    /** - Kolekce právě zobrazujicích se notifikací. */
    notificationPool: Array<IAlertProps>;
    /** - Id widgetu, který zobrazuje notifikace. */
    widgetId: string;
};

type IMNotificationState = ImmutableObject<INotificationState>;

declare module 'jimu-core/lib/types/state'{
    interface State {
        /** - Stav zobrazení notifikací (custom funkce HSI). */
        hsiNotification: IMNotificationState;
    }
}

export default class NotificationStoreExtension implements extensionSpec.ReduxStoreExtension {
    id = 'hsi-notification-redux-store-extension';

    getActions() {
        return Object.keys(ENotificationActionKeys).map(k => ENotificationActionKeys[k]);
    }

    getInitLocalState(): INotificationState {
        return {
            notificationPool: [],
            widgetId: null
        };
    }

    getReducer() {
        return (localState: IMNotificationState, action: INotificationActions, appState: IMState): IMNotificationState | INotificationState => {
            try {
                switch (action.type) {
                    case ENotificationActionKeys.Add:
                        let id = 0;

                        do {
                            id++;
                        } while(localState.notificationPool.findIndex(notification => notification.id === id) !== -1);

                        return localState.set("notificationPool", localState.notificationPool.concat({...action.alertProps, id}));

                    case ENotificationActionKeys.Init:
                        return localState.set("widgetId", action.widgetId);

                    case ENotificationActionKeys.Close:
                        let notificationPool = localState.notificationPool.asMutable();
                        notificationPool.splice(localState.notificationPool.findIndex(notification => notification.id === action.alertId), 1);
                        return localState.set("notificationPool", notificationPool);

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
        return 'hsiNotification';
    }
}