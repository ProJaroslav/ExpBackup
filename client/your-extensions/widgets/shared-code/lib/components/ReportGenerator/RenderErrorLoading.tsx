import { React } from "jimu-core";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { ELoadStatus } from "widgets/shared-code/enums";
import { CalciteNotice, CalciteLoader } from "calcite-components";

/** - Vykreslení stavu chyby nebo načítání reportu. */
export default function(props: HSI.ReportComponent.IRenderErrorLoadingProps) {
    const messageFormater = useMessageFormater(props.translations);

    switch(props.state?.reportStatus) {
        case ELoadStatus.Error:
            return <CalciteNotice
                scale="l"
                icon="x-circle"
                color="red"
            >
                <div slot="title">{messageFormater("failedToGenerateReport")}</div>
                <div slot="message">{props.state.error?.message}</div>
            </CalciteNotice>;

        case ELoadStatus.Pending:
            return <CalciteLoader
                label="saveReport"
                text={messageFormater('savingReport')}
                type="indeterminate"
                scale="m"
            />;
        
        default:
            return <></>;
    }
}