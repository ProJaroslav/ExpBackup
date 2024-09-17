import { React } from 'jimu-core';
import { CalciteList } from "calcite-components";
import EnvironmentItem from "./EnvironmentItem";

export default function(props: HSI.EnvironmentSettingsWidget.IEnvironmentListProps) {
    return <CalciteList>
        {
            props.items.map(item => <EnvironmentItem
                key={item.id}
                label={item.title}
                onClick={() => {
                    props.apply(item.id)
                }}
            />)
        }
    </CalciteList>;
}