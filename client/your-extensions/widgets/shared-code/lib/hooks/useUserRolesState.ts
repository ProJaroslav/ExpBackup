import { React } from "jimu-core";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { NotificationHelper, RequestHelper, DbRegistryLoader } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "./translations/default";
import { ELoadStatus, EDbRegistryKeys } from "widgets/shared-code/enums";

const { useState, useContext, useEffect } = React;

/**
 * - Poskytuje informaci zda uživatel má právo editovat {@link sourceClass tabulku}.
 * - Práva editovat se reší uživatelskými rolemi.
 * - Použitelné asi pouze na SD.
 * @param sourceClass - Název tabulky ke které zjišťujeme práva na editaci.
 */
export default function(sourceClass: string) {
    const messageFormater = useMessageFormater(translations);
    const [state, setState] = useState<IUserRoleStateLoaded | IUserRoleStateBase<ELoadStatus.Error | ELoadStatus.Pending>>({ loadStatus: ELoadStatus.Pending });
    const jimuMapView = useContext(JimuMapViewContext);

    useEffect(() => {
        if (!sourceClass) {
            setState({ loadStatus: ELoadStatus.Loaded, hasPermisson: false, UserRoles: [], objectClass: null });
        } else {
            const abortController = new AbortController;
            setState({ loadStatus: ELoadStatus.Pending });
            Promise.all([
                DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { scope: "g", type: "json", name: EDbRegistryKeys.FromData }),
                RequestHelper.providePermissions()
            ])
                .then(([{ objectClasses }, { UserRoles }]) => {
                    if (!abortController.signal.aborted) {
                        const objectClass = objectClasses.find(({ objectClass }) => sourceClass.toUpperCase() === objectClass.toUpperCase());
                        setState({
                            loadStatus: ELoadStatus.Loaded,
                            objectClass,
                            UserRoles,
                            hasPermisson: Array.isArray(UserRoles) && ((Array.isArray(objectClass?.editRight) && objectClass.editRight.some(UserRoles.includes.bind(UserRoles))) || (typeof objectClass?.editRight === "string" && UserRoles.includes(objectClass.editRight)))
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
            }
        }
    }, [setState, jimuMapView, sourceClass]);

    return state;
}

interface IUserRoleStateBase<T extends ELoadStatus> {
    /** - Stav načtení uživatelských rolí. */
    loadStatus: T;
}

interface IUserRoleStateLoaded extends IUserRoleStateBase<ELoadStatus.Loaded>, Pick<HSI.SdWebService.IGetUserNameWithRoles, "UserRoles"> {
    /** - Má uživatel právo editovat třídu prvků? */
    hasPermisson: boolean;
    objectClass: HSI.DbRegistry.IFromDataObjectClass;
}