import { React } from "jimu-core";
import { Button } from "jimu-ui";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import translations from "../translations/default";

export default function({ selectedQuery, selectedValue, tableRef }: HSI.RevegetationWidget.ISearchButton) {
    const messageFormater = useMessageFormater(translations);
    const config = useConfig<HSI.RevegetationWidget.IMConfig>();

    function search() {
        try {
            tableRef.current.layer.definitionExpression = !selectedValue ? "1=1" : `${config.queries.find(({ dataSet }) => dataSet === selectedQuery).domainAttribute}=${selectedValue}`;
        } catch(err) {
            console.warn(err);
        }
    }

    return <Button
        type="primary"
        onClick={search}
        disabled={!selectedQuery}
    >
        {messageFormater("searchButton")}
    </Button>;
}