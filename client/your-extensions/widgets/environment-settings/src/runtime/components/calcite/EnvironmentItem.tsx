import { React } from 'jimu-core';
import { CalciteTooltip, CalciteListItem, CalciteAction } from "calcite-components";
import translations from "../../translations/default";
import { useMessageFormater } from "widgets/shared-code/hooks";

export default function(props: HSI.EnvironmentSettingsWidget.IEnvironmentItemProps) {
    const messageFormater = useMessageFormater(translations);
    const environmentId = React.useId();

    return <CalciteListItem
        label={props.label}
    >
        <CalciteAction
            id={environmentId}
            onClick={props.onClick}
            text={messageFormater("useEnvironment")}
            slot='actions-end'
            icon='check-layer'
            color='Blue'
            style={{
                backgroundColor: "blue"
            }}
        />
        <CalciteTooltip
            referenceElement={environmentId}
        >
            {messageFormater("useEnvironment")}
        </CalciteTooltip>
    </CalciteListItem>;
}