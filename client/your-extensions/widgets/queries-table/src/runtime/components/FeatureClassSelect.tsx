import { React } from "jimu-core";
import { Label, Alert } from "jimu-ui";
import { useConfig, useMessageFormater } from "widgets/shared-code/hooks";
import { LayerInfoHelper, NotificationHelper, DbRegistryLoader } from "widgets/shared-code/helpers";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { SelectFilter } from "widgets/shared-code/components";
import { ELoadStatus, EDbRegistryKeys } from "widgets/shared-code/enums";
import translations from "../translations/default";
const { useEffect, useContext, useState } = React;

/** - Kombobox pro výběr třídy prvků. */
export default function(props: HSI.QueriesTableWidget.IFeatureClassSelect) {
    const config = useConfig<HSI.QueriesTableWidget.IMConfig>();
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = useContext(JimuMapViewContext);
    const [objectClasses, setObjectClasses] = useState<Array<HSI.QueriesTableWidget.IWidgetState['selectedClass']>>();
    const [loadStatus, setLoadStatus] = useState<ELoadStatus>(ELoadStatus.Pending);

    //#region - Filtrace tříd prvků relevantních pro současné prostředí
    useEffect(() => {
        const abortController = new AbortController();
        setLoadStatus(ELoadStatus.Pending);

        (async function() {
            try {
                const formData = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, { name: EDbRegistryKeys.FromData, scope: "g", type: "json" });

                if (!formData) {
                    throw new Error("V konfiguraci nejsou definovány dotazy.");
                }

                const objectClasses = Array.isArray(config.objectClassWhiteList) && config.objectClassWhiteList.length > 0 ? formData.objectClasses.filter(({ objectClass }) => config.objectClassWhiteList.some(oc =>objectClass.toUpperCase() === oc.toUpperCase() )) : formData.objectClasses

                const relevantClassIndexes = await Promise.all(
                    objectClasses
                        .map(({ objectClass }) => {
                            return LayerInfoHelper
                                .findLayersByDataset(jimuMapView, objectClass)
                                .then(sublayers => sublayers.length > 0)
                        })
                );

                if (!abortController.signal.aborted) {
                    setObjectClasses(objectClasses.filter((_, index) => relevantClassIndexes[index]));
                    setLoadStatus(ELoadStatus.Loaded);
                }
            } catch(err) {
                if (!abortController.signal.aborted) {
                    console.warn(err);
                    setLoadStatus(ELoadStatus.Error);
                    NotificationHelper.handleError(messageFormater("failedToLoadClasses"), err)
                }
            }
        })();

        return function() {
            abortController.abort();
        }
    }, [jimuMapView, setObjectClasses, setLoadStatus, config.objectClassWhiteList]);
    //#endregion END - Filtrace tříd prvků relevantních pro současné prostředí
    
    return <>
        <Label>
            {messageFormater("featureClassSelectLabel")}
            <SelectFilter
                options={!objectClasses ? [] : objectClasses.map(({ alias, objectClass }) => ({
                    label: alias,
                    value: objectClass
                }))}            
                selectProps={{
                    size: "sm",
                    onChange(ev) {
                        props.selectClass(objectClasses?.find(({ objectClass }) => objectClass === ev.target.value));
                    }
                }}
                loading={loadStatus === ELoadStatus.Pending}
            />
        </Label>
        {
            loadStatus === ELoadStatus.Error ?
                <div className="error-content">
                    <Alert
                        aria-live="polite"
                        buttonType="default"
                        form="tooltip"
                        size="small"
                        text={messageFormater("failedToLoadClasses")}
                        type="error"
                    />
                </div>
            : <></>
        }
    </>;
}