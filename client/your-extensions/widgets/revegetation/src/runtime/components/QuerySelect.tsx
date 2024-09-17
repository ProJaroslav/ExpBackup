import { React } from "jimu-core";
import { Select, Option, Label } from "jimu-ui";
import { useConfig, useMessageFormater } from "widgets/shared-code/hooks";
import { LayerInfoHelper, NotificationHelper } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { SelectFilter } from "widgets/shared-code/components";
import translations from "../translations/default";

const { useEffect, useContext, useState } = React;

/** - Výběr typu dotazu a celkové hranice. */
export default function({ selectQuery, selectQueryValue, selectedQuery, selectedValue }: HSI.RevegetationWidget.IQuerySelect) {
    const config = useConfig<HSI.RevegetationWidget.IMConfig>();
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = useContext(JimuMapViewContext);
    const [state, dispatchState] = useState<IStateBase<ELoadStatus.Error | ELoadStatus.Pending> | (IStateBase<ELoadStatus.Loaded> & Pick<__esri.Field, "domain">)>({ loadState: ELoadStatus.Pending });

    useEffect(() => {
        const abortController = new AbortController();
        dispatchState({ loadState: ELoadStatus.Pending });

        if (!!selectedQuery) {
            (async function() {
                try {
                    const sublayer = (await LayerInfoHelper.findLayersByDataset(jimuMapView, selectedQuery))[0];
    
                    if (!sublayer) {
                        throw new Error(messageFormater('nolayersWithDataset').replace("{0}", selectedQuery));
                    }
    
                    if (sublayer.loadStatus !== "loaded") {
                        await sublayer.load();
                    }
    
                    const field = sublayer.fields.find(({ name }) => name === config.queries.find(({ dataSet }) => dataSet === selectedQuery).domainAttribute)
    
                    if (!field) {
                        throw new Error(messageFormater("noAttribute"));
                        if (!field.domain) {
                            throw new Error(messageFormater("noDomain"));
                        }
                    }
                    if (!abortController.signal.aborted) {
                        dispatchState({ loadState: ELoadStatus.Loaded, domain: field.domain });
                    }
                } catch(err) {
                    if (!abortController.signal.aborted) {
                        console.warn(err);
                        NotificationHelper.handleError(messageFormater("failedToLoadDomain"), err);
                        dispatchState({ loadState: ELoadStatus.Error });
                    }
                }
            })();
        }

        return function() {
            abortController.abort();
        }
    }, [config.queries, selectedQuery, jimuMapView, dispatchState]);

    function getOptions(): HSI.SelectFilter.ISelectFilterProps['options'] {
        if (state.loadState === ELoadStatus.Loaded && state.domain.type === "coded-value") {
            return state.domain.codedValues.map(({ code, name }) => ({
                key: code,
                value: code,
                label: name
            }));
        }

        return [];
    }

    return <>
        <Label>
            {messageFormater("query")}
            <Select
                size="sm"
                value={selectedQuery}
                onChange={ev => {
                    selectQuery(ev.target.value);
                }}
            >
                {
                    config.queries.map(({ alias, dataSet }) => {
                        return <Option key={dataSet} value={dataSet}>{alias}</Option>;
                    })
                }
            </Select>
        </Label>
        <Label>
            {messageFormater("domainAttribute")}
            <SelectFilter
                loading={state.loadState === ELoadStatus.Pending}
                options={getOptions()}
                nullable
                multiple={false}
                selectProps={{
                    disabled: !selectedQuery,
                    size: "sm",
                    value: selectedValue,
                    onChange(ev) {
                        selectQueryValue(ev.target.value);
                    }
                }}
            />
        </Label>
    </>;
}

interface IStateBase<T extends ELoadStatus> {
    /** - Stav načtení. */
    loadState: T;
}