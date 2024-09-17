import { React } from "jimu-core";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { NotificationHelper, RequestHelper, DbRegistryLoader } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "./translations/default";
import { ELoadStatus, EDbRegistryKeys } from "widgets/shared-code/enums";

const { useState, useContext, useEffect } = React;

/**
 * - Poskytuje informaci zda uživatel má právo exekuovat akci  {@link sourceClass tabulku}.
 * - Práva exekuovat se reší uživatelskými rolemi.
 * @param actionName - Název akce pro kterou zjišťujeme, zda má uživatel oprávnění
 */
export default function(actionName: string) {
    const messageFormater = useMessageFormater(translations);
    const [state, setState] = useState<IUserRoleStateLoaded | IUserRoleStateBase<ELoadStatus.Error | ELoadStatus.Pending>>({ loadStatus: ELoadStatus.Pending });
    const jimuMapView = useContext(JimuMapViewContext);

    useEffect(() => {
        if (!actionName) {
            setState({ loadStatus: ELoadStatus.Loaded, hasPermisson: false, UserRoles: [], action: null });
        } else {
            const abortController = new AbortController();
            setState({ loadStatus: ELoadStatus.Pending });

            Promise.all([
                DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { scope: "g", type: "json", name: EDbRegistryKeys.FromData }),
                RequestHelper.providePermissions()
            ])
                .then(([{ actions }, { UserRoles }]) => {
                    if (!abortController.signal.aborted) {
                        const foundAction = actions.find(({ name }) => actionName.toUpperCase() === name.toUpperCase());
                        setState({
                            loadStatus: ELoadStatus.Loaded,
                            action: foundAction,
                            UserRoles,
                            hasPermisson: Array.isArray(UserRoles) && (
                                (Array.isArray(foundAction?.executeRight) && foundAction.executeRight.some(UserRoles.includes.bind(UserRoles))) ||
                                (typeof foundAction?.executeRight === "string" && UserRoles.includes(foundAction.executeRight))
                            )
                        });
                    }
                })
                .catch(err => {
                    if (!abortController.signal.aborted) {
                        console.warn(err);
                        NotificationHelper.handleError(messageFormater("failedToLoadUserPermissions"), err);
                        setState({ loadStatus: ELoadStatus.Error });
                    }
                });

            return function() {
                abortController.abort();
            };
        }
    }, [setState, jimuMapView, actionName]);

    return state;
}

interface IUserRoleStateBase<T extends ELoadStatus> {
    /** - Stav načtení uživatelských rolí. */
    loadStatus: T;
}

interface IUserRoleStateLoaded extends IUserRoleStateBase<ELoadStatus.Loaded>, Pick<HSI.SdWebService.IGetUserNameWithRoles, "UserRoles"> {
    /** - Má uživatel právo provést akci? */
    hasPermisson: boolean;
    action: any;
}
