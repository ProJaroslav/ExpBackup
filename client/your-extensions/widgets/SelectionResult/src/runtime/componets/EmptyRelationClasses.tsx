import { React } from "jimu-core";
import translations from "../translations/default";
import { useMessageFormater } from "widgets/shared-code/hooks";

/** - Zobrazení hlášky že prvek nemá navazběné relační třídy. */
export default function() {
    const messageFormater = useMessageFormater(translations);

    return <div>{messageFormater("noRelationClasses")}</div>;
}