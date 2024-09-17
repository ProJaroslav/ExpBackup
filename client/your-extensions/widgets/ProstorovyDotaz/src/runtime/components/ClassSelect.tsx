import { React } from "jimu-core";
import { Label } from "jimu-ui";
import { SelectFilter } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
const { useEffect, useContext, useState } = React;
import {DbRegistryLoader, LayerInfoHelper} from "widgets/shared-code/helpers";
import {EDbRegistryKeys, ELoadStatus} from "widgets/shared-code/enums";
import {useConfig} from "widgets/shared-code/hooks";

export default function(props: IClassSelect) {
    const config = useConfig<HSI.QueriesTableWidget.IMConfig>();
    const jimuMapView = useContext(JimuMapViewContext);
    const [objectClasses, setObjectClasses] = useState<HSI.DbRegistry.IFromDataObjectClass[]>();
    const [loadStatus, setLoadStatus] = useState<ELoadStatus>(ELoadStatus.Pending);


    React.useEffect(() => {
        const abortController = new AbortController();

        (async function() {
            try {
                let formData = await DbRegistryLoader.fetchDbRegistryValue(jimuMapView, {
                    name: EDbRegistryKeys.FromData,
                    scope: "g",
                    type: "json"
                });

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
                
            }
            catch(e) {
                
            }
            
        })();

        return function() {
            abortController.abort();
        }
    }, [jimuMapView, setObjectClasses, setLoadStatus, config.objectClassWhiteList]);
    
    return (
        <>
            <Label>
                <SelectFilter
                    options={!objectClasses ? [] : objectClasses.map(({alias, objectClass}) => ({
                        label: alias,
                        value: objectClass
                    }))}

                    selectProps={{size: "sm", onChange(ev) {
                        props.selectClass(objectClasses?.find(({ objectClass }) => objectClass === ev.target.value));
                    }}}
                />
                
            </Label>
        </>
    );
}

interface IClassSelect {
    selectClass(selectedClass: HSI.DbRegistry.IFromDataObjectClass): void;

} 
