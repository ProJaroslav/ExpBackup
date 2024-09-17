import { React } from "jimu-core";

/** - Zobrazení řádku ve stromové struktuře. */
export default function(props: React.PropsWithChildren<ISelectionTreeItemProps>) {
    return <div
        className={`selection-tree-item-content${props.isSelected ? " selected" : ""} level-${props.level}${props.className ? ` ${props.className}` : ""}`}
        onClick={props.onClick}
    >
        {props.children}
    </div>;
}

interface ISelectionTreeItemProps {
    /** - Level ve kterém se objekt nachází. */
    level: number;
    /** - Je objekt vybraný(podbarvený) ve stromové struktuře? */
    isSelected?: boolean;
    /** - Událost kliknutí na řádek. */
    onClick?: React.MouseEventHandler<HTMLDivElement>
    /** - Rozšírení názvu třídy html elementu. */
    className?: string;
}