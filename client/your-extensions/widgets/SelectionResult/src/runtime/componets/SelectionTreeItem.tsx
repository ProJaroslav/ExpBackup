import { React } from "jimu-core";

export default React.forwardRef<HTMLDivElement, React.PropsWithChildren<ISelectionTreeItemProps>>(function(props, ref) {
    return <div
        className="selection-tree-item"
        onContextMenu={props.onContextMenu}
        ref={ref}
    >
        {props.children}
    </div>;
})

interface ISelectionTreeItemProps {
    onContextMenu?: (ev: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
}