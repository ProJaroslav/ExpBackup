import { React } from "jimu-core";
import { ELoadStatus } from "widgets/shared-code/enums";
import { useExecuteRightsState, useLoadAction } from "widgets/shared-code/hooks";

/**
 * Vyhodnotí, zda má být zaslaný atribut vrácen jako odkaz
 */
export default function ProcessedLinkAttribute(props: IUrlAttribute): JSX.Element | string | number {

    const action = useLoadAction(props.fieldName, props.subLayer);
    const userRolesState = useExecuteRightsState(action?.name);

    if (action && typeof props.fieldValue === "string") {
        const url = action.url.replace("{0}", props.fieldValue);

        if (!action.executeRight || (userRolesState.loadStatus === ELoadStatus.Loaded && userRolesState.hasPermisson)) {
            return (
                <a href={url} title={props.fieldValue} type="link">{props.fieldValue}</a>
            );
        }
    }

    return <>{props.fieldValue}</>;
}

interface IUrlAttribute {
    fieldName: string;
    fieldValue: string | number;
    subLayer: __esri.Sublayer;
}
