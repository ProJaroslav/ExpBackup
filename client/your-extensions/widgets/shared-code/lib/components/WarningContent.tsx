import { React } from "jimu-core";
import { CalciteNotice } from "calcite-components";

/** - Jednotné vypsání chybové hlášky. */
export default function(props: HSI.WarningContentComponent.IProps) {
    return <div style={{ padding: 10 }}>
        <CalciteNotice
            open
            scale="l"
            icon="exclamation-mark-triangle"
            kind="warning"
        >
            {
                typeof props.title === "string" ? <div slot="title">{props.title}</div> : <></>
            }
            <div slot="message">{typeof props.message === "string" ? props.message : ""}</div>
        </CalciteNotice>
    </div>;
}