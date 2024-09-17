import { React } from "jimu-core";
import { Select, Label, Option } from "jimu-ui";
import { useMessageFormater } from "widgets/shared-code/hooks";
import translations from "../translations/default";

/** - Kombobox pro výběr dotazu v třídě prvků. */
export default function(props: HSI.QueriesTableWidget.IQuerySelect) {
    const messageFormater = useMessageFormater(translations);

    if (!Array.isArray(props.selectedClass?.queries) || props.selectedClass.queries.length < 1) {
        return <></>;
    }

    return <Label>
        {messageFormater("querySelectLabel")}
        <Select
            size="sm"
            value={props.selectedQuery ? props.selectedClass.queries.indexOf(props.selectedQuery) : -1}
            onChange={ev => {
                props.selectQuery(props.selectedClass.queries[ev.target.value]);
            }}
        >
            <Option value={-1}>{props.selectedClass.alias}</Option>
            {
                props.selectedClass.queries.map(({ caption }, index) => <Option key={index} value={index}>{caption}</Option>)
            }
        </Select>
    </Label>;
}