import { React } from 'jimu-core';
import { ListGroup, ListGroupItem, Icon, Popper } from 'jimu-ui';
import "./ContextMenu.scss";

const arrowIcon = require("jimu-ui/lib/icons/arrow-right.svg");

/** - Seznam v kontextové nabídce. */
function ContextMenu(props: IContextMenuProps) {
    return <ListGroup
        style={{ userSelect: 'none' }}
    >
        {
            props.items.map(item => {
                return <ContextMenuItem close={props.close} item={item} />
            })
        }
    </ListGroup>
}

/** - Prvek v seznamu kontextové nabídky.. */
function ContextMenuItem(props: IContextMenuItemProps) {
    const [isHovered, toggleHoverState] = React.useState(false);
    const reference = React.useRef()

    return <div ref={reference}>
        <ListGroupItem
            action
            className={`hsi-context-menu-item${isHovered ? " hovered" : ""}`}
            onClick={() => {
                props.item.onClick?.();
                if (props.item.closeOnClick) {
                    props.close();
                }
            }}
            onMouseEnter={() => toggleHoverState(true)}
            onMouseLeave={() => toggleHoverState(false)}
        >
            { props.item.icon &&  <Icon icon={props.item.icon} /> }
            {props.item.content}
            {
                props.item.children?.length ? <>
                    <Icon icon={arrowIcon} />
                    <Popper
                        open={isHovered}
                        reference={reference.current}
                        placement="right-start"
                    >
                        <ContextMenu
                            close={props.close}
                            items={props.item.children}
                        />
                    </Popper>
                </> : <></>
            }
        </ListGroupItem>

    </div>;
}

interface IContextMenuItemProps {
    item: HSI.IPopperListItem;
    close: () => void;
}

interface IContextMenuProps {
    items: Array<HSI.IPopperListItem>;
    close: () => void;
}

export default ContextMenu;