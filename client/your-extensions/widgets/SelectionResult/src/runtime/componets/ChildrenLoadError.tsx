import { React } from "jimu-core"
import translations from "../translations/default";
import { useMessageFormater } from "widgets/shared-code/hooks";

/** - Zobrazení chyby při načítání potomků v stromové struktuře. */
export default function() {
    const messageFormater = useMessageFormater(translations);

    return <div>{messageFormater("loadRelationError")}</div>;
}