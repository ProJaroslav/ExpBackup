import { React } from "jimu-core";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { LoadingButton } from "widgets/shared-code/components";
import translations from "../translations/default";
const { useState } = React;

/** Tlačítko pro export tabulky do excelu. */
export default function({  }) {
    const [isSelecting, toggleSelecting] = useState<boolean>(false);
    const messageFormater = useMessageFormater(translations);

    async function exportExcel() {
        try {
            alert("TODO");
        } catch(err) {
            console.warn(err);
        } finally {
            toggleSelecting(false);
        }
    }

    return <LoadingButton
        onClick={exportExcel}
        loading={isSelecting}
    >
        {messageFormater("excelButton")}
    </LoadingButton>;
}