import { React } from "jimu-core";
import { Checkbox } from "jimu-ui";
import { JimuMapView } from "jimu-arcgis";
import { NotificationHelper, DbRegistryLoader, RequestHelper, MutableStoreManagerHelper } from "widgets/shared-code/helpers";
import { EDbRegistryKeys } from "widgets/shared-code/enums";

/**
 * - Rozšíření {@link popperPararms parametrů kontextové nabídky} o možnost změny způsobu získávání relací.
 * @param jimuMapView - Aktiovní view mapy.
 * @param popper - Nástroj na otevření kontextové nabídky.
 * @param popperPararms - Parametry kontextové mabídky, které chceme rozšířit.
 * @param messages - Překlady.
 */
export async function filledRelationsOnlyExpander(jimuMapView: JimuMapView, popper: (params: HSI.IPopperParams) => void, popperPararms: HSI.IPopperParams, messages: IMessages) {
    try {
        if ("list" in popperPararms && Array.isArray(popperPararms.list)) {
            if (MutableStoreManagerHelper.hasFilledRelationsOnlyChanged()) {
                popperPararms.list.push({
                    content: <>
                        <Checkbox indeterminate readOnly/>
                        <span>{messages.filledRelationsOnlyContextTitle}</span>
                    </>,
                    closeOnClick: true,
                    onClick() {
                        NotificationHelper.addNotification({ type: "info", message: messages.onSetFilledRelationsOnly });
                    }
                });    
            } else {
                popper({ reference: popperPararms.reference, position: popperPararms.position, loading: true });
            
                let filledRelationsOnly = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.FilledRelationsOnly, scope: "u", type: "bool" });
                filledRelationsOnly = filledRelationsOnly !== false //Pokud je null, tak se chováme jako by bylo true
            
                popperPararms.list.push({
                    content: <>
                        <Checkbox checked={filledRelationsOnly} readOnly/>
                        <span>{messages.filledRelationsOnlyContextTitle}</span>
                    </>,
                    closeOnClick: true,
                    onClick() {
                        RequestHelper.setDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.FilledRelationsOnly, scope: "u", type: "bool", value: !filledRelationsOnly! })
                            .then(() => {
                                NotificationHelper.addNotification({ type: "info", message: messages.onSetFilledRelationsOnly });
                                MutableStoreManagerHelper.onFilledRelationsOnlyChanged();
                            })
                            .catch(err => {
                                NotificationHelper.addNotification({ type: "error", message: messages.onSetFilledRelationsOnlyError });
                                console.warn(err);
                            });
                    }
                });
            }
        }
    } catch(err) {
        console.warn(err);
    } finally {
        popper(popperPararms);
    }
}

interface IMessages {
    filledRelationsOnlyContextTitle: string;
    onSetFilledRelationsOnly: string;
    onSetFilledRelationsOnlyError: string;
}