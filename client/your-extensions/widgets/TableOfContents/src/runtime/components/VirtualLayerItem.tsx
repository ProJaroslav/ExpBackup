import { React } from "jimu-core";
import { Icon } from "jimu-ui";
import ITreeStructureState from "../interfaces/ITreeStructureState";
import LayerItem from "./LayerItem";
import useContextMenuContent from "../hooks/useContextMenuContent";
import IVirtualLayerDefinition from "../interfaces/IVirtualLayerDefinition";
import { AssetsProviderContext, PopperContext } from "widgets/shared-code/contexts";

/**
 * - Zobrazení virtuální vrstvy ve stromové struktuře seznamu vrstev.
 * - @see {@link IVirtualLayerDefinition}
 */
export default function(props: IProps) {
    /** - Je vrstva otevřená ve stromové struktuře (jsou vidět její podvsrtvy)? */
    const isExpanded = props.treeStructureState.layerStructure[props.uniqueId]?.expanded || false;
    /** - Může se vrstva otevřít ve stromové struktuře (má vnořené vrstvy nebo podvsrtvy)? */
    const canExpand = !!props.treeStructureState.layerStructure[props.uniqueId]?.sublayers?.length;
    /** - Otevření kontextové nabídky. */
    const openPopper = React.useContext(PopperContext);
    /** - Reference prvku nad kterým se vyvolává kontextová nabídka. */
    const reference = React.useRef<HTMLLIElement>();
    const contextMenu = useContextMenuContent({
        layerType: "virtual",
        treeStructureState: props.treeStructureState,
        id: props.uniqueId,
        layerId: props.layer.id
    });
    const getAssetsPath = React.useContext(AssetsProviderContext);


    /** - Pokud je vrstva otevřená, tak vykreslí seznam její vnořených vrstev/podvrstev. */
    function getChildren(): JSX.Element {
        if (!isExpanded || !canExpand) {
            return <></>;
        }

        return <LayerItem
            parentId={props.uniqueId}
            toggleExpand={props.toggleExpand}
            treeStructureState={props.treeStructureState}
        />;
    }

    return <li
        ref={reference}
        className="hsi-tree-item virtuallayer-item"
        onContextMenu={ev => {
            ev.preventDefault();
            ev.stopPropagation();
            openPopper({
                position: {
                    x: ev.clientX,
                    y: ev.clientY
                },
                reference: reference,
                list: contextMenu
            });
        }}>
        <div className={`hsi-tree-item-content${canExpand ? " expansible" : ""}`} >
            <div
                className="hsi-tree-expander"
                onClick={() => props.toggleExpand(props.uniqueId)}
            >
                <Icon 
                    icon={getAssetsPath(isExpanded ? "minus.svg" : "plus.svg")}
                />
            </div>
            <div 
                className="hsi-tree-item-title visible"
                onClick={() => props.toggleExpand(props.uniqueId)}
            >
                {props.layer.title}
            </div>
        </div>
        {getChildren()}
    </li>;
}

interface IProps {
    /** - Definice virtuální vrstvy. */
    layer: IVirtualLayerDefinition;
    /** - Stav stromové struktury. */
    treeStructureState: ITreeStructureState,
    /** - Přepnutí stavu otevření vrstvy ve stromové struktuře. */
    toggleExpand: (gisId: string) => void;
    /** - Unikátní identifikátor virtuální vrstvy v rámci celé stromové struktury. */
    uniqueId: string;
}