import { React } from "jimu-core";
import { Button } from "jimu-ui";
import { useMessageFormater, useTableSelectionCount } from "widgets/shared-code/hooks";
import { SdEditButton } from "widgets/shared-code/components";
import translations from "../translations/default";

/** - Tlačítko pro zobrazení detailu nájemce. */
export default function({ tableRef, renterModalRef }: HSI.RentTableWidget.IRenterDetailButton) {
    const selectionCount = useTableSelectionCount(tableRef);
    const messageFormater = useMessageFormater(translations);

    return <Button
        disabled={selectionCount !== 1}
        onClick={() => {
            renterModalRef.current.edit(tableRef.current.viewModel.getValue(tableRef.current.highlightIds.getItemAt(0), "NAJEMCE_ID") as number);
        }}
    >
        {messageFormater("renterDetailButton")}
    </Button>;
}
