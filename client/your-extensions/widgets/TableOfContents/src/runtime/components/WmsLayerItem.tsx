import { React } from "jimu-core";
import { Checkbox, Icon } from "jimu-ui";
import useLayerVisibility from "../hooks/useLayerVisibility";
import ITreeStructureState from "../interfaces/ITreeStructureState";
import LayerItem from "./LayerItem";
import useContextMenuContent from "../hooks/useContextMenuContent";
import { LayerHelper } from "widgets/shared-code/helpers";
import { PopperContext, AssetsProviderContext } from "widgets/shared-code/contexts";

/** - Zobrazení WMS služby ve stromové struktuře seznamu vrstev. */
export default function(props: IProps) {
    /** - Má vrstva zaplou viditelnost? */
    const isVisible = useLayerVisibility(props.layer);
    /** - Je vrstva otevřená ve stromové struktuře (jsou vidět její podvsrtvy)? */
    const isExpanded = props.treeStructureState.layerStructure[props.uniqueId]?.expanded || false;
    /** - Může se vrstva otevřít ve stromové struktuře (má vnořené vrstvy nebo podvsrtvy)? */
    const canExpand = !!props.treeStructureState.layerStructure[props.uniqueId]?.sublayers?.length;
    /** - Je vrstva viditelná v současném měřítku mapy?  */
    const visibleAtScale = LayerHelper.isVisibleAtScale(props.layer, props.treeStructureState.scale);
    /** - Otevření kontextové nabídky. */
    const openPopper = React.useContext(PopperContext);
    /** - Reference prvku nad kterým se vyvolává kontextová nabídka. */
    const reference = React.useRef<HTMLLIElement>();
    const contextMenu = useContextMenuContent({
        layerType: "wms",
        layer: props.layer,
        treeStructureState: props.treeStructureState,
        id: props.uniqueId
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
        className="hsi-tree-item wmslayer-item"
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
            <Checkbox
                checked={isVisible}
                onClick={() => { props.layer.visible = !props.layer.visible; }}
            />
            <div 
                className={`hsi-tree-item-title ${visibleAtScale ? "visible" : "not-visible"}`}
                onClick={() => props.toggleExpand(props.uniqueId)}
            >
                {props.layer.title}
            </div>
        </div>
        {getChildren()}
    </li>;
}

interface IProps {
    /** - Vrstva kterou tato komponenta ovládá. */
    layer: __esri.WMSLayer;
    /** - Stav stromové struktury. */
    treeStructureState: ITreeStructureState,
    /** - Přepnutí stavu otevření vrstvy ve stromové struktuře. */
    toggleExpand: (gisId: string) => void;
    /** - Unikátní identifikátor vrstvy. */
    uniqueId: string;
}