import { React } from "jimu-core";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { ArcGISJSAPIModuleLoader, EsriHelper, FeatureTableHelper } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import translations from "../translations/default";
import HideColumnsAction from "./HideColumnsAction";

const { useEffect, useRef, useContext, useState } = React;
const ModuleLoader = new ArcGISJSAPIModuleLoader(["FeatureTable"]);

/** - Tabulka pro zobrazení záznamů pomocí FeatureTable. */
export default function({ tableRef, onCreated, tableTemplate, tableSettingExtension, displayColumnMenus }: HSI.FeatureTableComponent.IFeatureTable) {
    const containerRef = useRef<HTMLDivElement>();
    const onCreatedRef = useRef(onCreated);
    const jimuMapView = useContext(JimuMapViewContext);
    const messageFormater = useMessageFormater(translations);
    const [featureTable, setFeatureTable] = useState<__esri.FeatureTable>();

    useEffect(() => {
        onCreatedRef.current = onCreated;
    });

    useEffect(() => {
        const abortController = new AbortController();

        (async function () {
            try {
                const container = document.createElement("div");
                containerRef.current.appendChild(container);
                if (!ModuleLoader.isLoaded) {
                    await ModuleLoader.load();
                }
                    const params: __esri.FeatureTableProperties = {
                        container,
                        returnGeometryEnabled: true,
                        tableTemplate,
                        visibleElements: {
                            columnMenus: displayColumnMenus || false,
                            menuItems: {
                                toggleColumns: false
                            }
                        }
                    };

                    if (!!tableSettingExtension) {
                        if (!params.tableTemplate) {
                            params.tableTemplate = await FeatureTableHelper.getSettingsBasedTemplate(jimuMapView, tableSettingExtension);
                        }
                    }

                    if (!abortController.signal.aborted) {

                        tableRef.current = new (ModuleLoader.getModule("FeatureTable"))(params);
                        setFeatureTable(tableRef.current);

                        if (!!tableSettingExtension) {
                            FeatureTableHelper.setSaveSettingsButton(jimuMapView, tableRef.current, messageFormater("saveTableSettingsMenuButton"), tableSettingExtension)
                        }

                        if (typeof onCreatedRef.current === "function") {
                            onCreatedRef.current();
                        }
                    }
            } catch(err) {
                console.warn(err)
            }
        })();

        return function() {
            EsriHelper.destroy(tableRef.current);
            abortController.abort();
            setFeatureTable(undefined);
        }
    }, [tableRef, containerRef, onCreatedRef, tableTemplate, tableSettingExtension, displayColumnMenus, setFeatureTable]);

    return <>
        <div className="hsi-feature-table" ref={containerRef}/>
        <HideColumnsAction table={featureTable} />
    </>;
}