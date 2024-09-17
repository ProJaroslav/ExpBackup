import { React } from 'jimu-core';
import { ListGroup, Label } from 'jimu-ui';
import EnvironmentItem from "./EnvironmentItem";

export default function(props: HSI.EnvironmentSettingsWidget.IEnvironmentListProps) {
    return <div>
        <Label>{props.title}</Label>
        <ListGroup flush>
            {
                props.items.map(item => <EnvironmentItem
                    key={item.id}
                    label={item.title}
                    onClick={() => {
                        props.apply(item.id);
                    }}
                    delete={typeof props.delete === "function" ? () => props.delete(item.id) : undefined}
                    disabled={"deleting" in item && item.deleting}
                />)
            }
        </ListGroup>
    </div>;
}