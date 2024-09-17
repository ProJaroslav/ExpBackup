import { React } from "jimu-core";
import { ELoadStatus } from "widgets/shared-code/enums";
import { SelectFilter } from "widgets/shared-code/components";
import { Alert, Label } from "jimu-ui";
import { useMessageFormater, useLandQueries } from "widgets/shared-code/hooks";
import translations from "../translations/default";

/** - Výber dotazu pozemků. */
export default function({ selectQuery, query }: HSI.LandTableWidget.ISelectQuery) {
    const messageFormater = useMessageFormater(translations);
    const lands = useLandQueries();

    return  <Label className="select-query">
        <span>{messageFormater("selectQueryLabel")}</span>
        <SelectFilter
            options={lands.loadStatus !== ELoadStatus.Loaded ? [] : lands.queries.map(({ Name, Description }) => ({
                label: Description,
                value: Name
            }))}            
            selectProps={{
                size: "sm",
                value: query?.Name,
                onChange(ev) {
                    if (lands.loadStatus == ELoadStatus.Loaded) {
                        selectQuery(lands.queries?.find(({ Name }) => Name === ev.target.value));
                    }
                }
            }}
            loading={lands.loadStatus === ELoadStatus.Pending}
        />
        {
            lands.loadStatus === ELoadStatus.Error ?
                <div className="error-content">
                    <Alert
                        aria-live="polite"
                        buttonType="default"
                        form="tooltip"
                        size="small"
                        text={messageFormater("failedLoadQuery")}
                        type="error"
                    />
                </div>
            : <></>
        }
    </Label>;
}