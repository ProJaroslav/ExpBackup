import { React } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { NotificationHelper, ArcGISJSAPIModuleLoader, DbRegistryLoader } from "widgets/shared-code/helpers";
import { ELoadStatus, EDbRegistryKeys } from "widgets/shared-code/enums";

const { useContext, useEffect, useState } = React;
const TableTemplateLoader = new ArcGISJSAPIModuleLoader([ "TableTemplate" ]);

/**
 * - Načítá výchozí nastavení sloupců tabulky pro {@link className třídu prvků}.
 * @param className - Název třídy prvků.
 */
export default function (className: string) {
    const jimuMapView = useContext(JimuMapViewContext);
    const [state, setState] = useState<IStateLoaded | IStateError | IStateBase<ELoadStatus.Pending>>({ loadStatus: ELoadStatus.Pending });

    useEffect(() => {
        const abortController = new AbortController();
        setState({ loadStatus: ELoadStatus.Pending });

        (async function() {
            try {
                const [formData] = await Promise.all([
                    DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.FromData, scope: "g", type: "json" }),
                    TableTemplateLoader.load()
                ]);

                const objectClass = Array.isArray(formData?.objectClasses) && formData.objectClasses.find(({ objectClass }) => objectClass === className);

                if (!abortController.signal.aborted) {
                    setState({
                        loadStatus: ELoadStatus.Loaded,
                        template: new (TableTemplateLoader.getModule("TableTemplate"))(!objectClass ? {} : {
                            columnTemplates: objectClass.fields.map(({ name, alias }) => ({
                                type: "field",
                                fieldName: name,
                                label: alias || name
                            }))
                        })
                    });
                }

            } catch(err) {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                    setState({ loadStatus: ELoadStatus.Error, errorMessage: NotificationHelper.getErrorMessage(err) });
                }
            }
        })();

        return function() {
            abortController.abort();
        }
    }, [jimuMapView, className, setState]);

    return state;
}

interface IStateBase<T extends ELoadStatus> {
    /** - Stav načtení. */
    loadStatus: T;
}

interface IStateLoaded extends IStateBase<ELoadStatus.Loaded> {
    /** - Výchozí nastavení sloupců tabulky. */
    template: __esri.TableTemplate;
}

interface IStateError extends IStateBase<ELoadStatus.Error> {
    /** - Odchycená výjimka. */
    errorMessage: string;
}