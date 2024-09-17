import { React } from 'jimu-core';
import translations from "../../translations/default";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { Button, ListGroupItem, Tooltip, ButtonGroup } from 'jimu-ui';
import { CheckOutlined } from 'jimu-icons/outlined/application/check';
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash';

export default function(props: HSI.EnvironmentSettingsWidget.IEnvironmentItemProps) {
    const messageFormater = useMessageFormater(translations);

    return <ListGroupItem
        action
        disabled={props.disabled}
        style={{
            display: "grid",
            gridTemplateColumns: "1fr auto auto"
        }}
    >
        {props.label}
        <ButtonGroup size='sm'>
            {
                typeof props.delete === "function" ? <Tooltip
                    title={messageFormater("deleteEnvironment")}
                >
                    <Button
                        type='danger'
                        // style={{ padding: 4 }}
                        onClick={props.delete}
                        disabled={props.disabled}
                    >
                        <TrashOutlined style={{ margin: 0 }} />
                    </Button>
                </Tooltip> : <></>
            }
            <Tooltip
                title={messageFormater("useEnvironment")}
            >
                <Button
                    type='primary'
                    // style={{ padding: 4 }}
                    disabled={props.disabled}
                    onClick={props.onClick}
                >
                    <CheckOutlined style={{ margin: 0 }} />
                </Button>
            </Tooltip>
        </ButtonGroup>
        
    </ListGroupItem>;
}