import { React } from "jimu-core";
import { Checkbox, Icon, Alert } from "jimu-ui";
import useLayerVisibility from "../hooks/useLayerVisibility";
import useLayerSelectability from "../hooks/useLayerSelectability";
import ITreeStructureState from "../interfaces/ITreeStructureState";
import useContextMenuContent from "../hooks/useContextMenuContent";
import LayerItem from "./LayerItem";
import { LayerHelper } from "widgets/shared-code/helpers";
import SelectionManager from "widgets/shared-code/SelectionManager";
import { ESublayerType } from "widgets/shared-code/enums";
import { JimuMapViewContext, PopperContext, AssetsProviderContext } from "widgets/shared-code/contexts";
import LegendItem from "./LegendItem"
import {useConfig, useMessageFormater} from "widgets/shared-code/hooks";
import IMConfig from "widgets/TableOfContents/src/IConfig";
import translations from "../translations/default";


/** - Zobrazení podvrstvy ve stromové struktuře seznamu vrstev. */
function SublayerItem(props: IProps) {
    /** - Má podvrstva zaplou viditelnost? */
    const isVisible = useLayerVisibility(props.layer);
    /** - Je podvrstva otevřená ve stromové struktuře (jsou vidět její podvsrtvy)? */
    const isExpanded = props.treeStructureState.layerStructure[props.uniqueId]?.expanded || false;
    // Typ podvrstvy.
    const [layerType, setLayerType] = React.useState<ESublayerType>()
    /** - Může se podvrstva otevřít ve stromové struktuře (má vnořené podvsrtvy)? */
    const canExpand = !!props.treeStructureState.layerStructure[props.uniqueId]?.sublayers?.length;
    /** - Může podvrstva být vybíratelná?  */
    const canBeSelectable = layerType === ESublayerType.Feature || layerType === ESublayerType.Annotation || layerType === ESublayerType.Dimension;
    /** - Má podvrstva zaplou vybíratelnost?  */
    const isSelectable = useLayerSelectability(props.layer);
    const jimuMapView = React.useContext(JimuMapViewContext);
    /** - Je podvrstva viditelná v současném měřítku mapy?  */
    const visibleAtScale = LayerHelper.isVisibleAtScale(props.layer, props.treeStructureState.scale);
    /** - Reference prvku nad kterým se vyvolává kontextová nabídka. */
    const reference = React.useRef<HTMLLIElement>();
    /** - Otevření kontextové nabídky. */
    const openPopper = React.useContext(PopperContext);
    const contextMenu = useContextMenuContent({
        isSelectable,
        layer: props.layer,
        layerType: "sublayer",
        sublayerType: layerType,
        treeStructureState: props.treeStructureState,
        id: props.uniqueId
    });
    const getAssetsPath = React.useContext(AssetsProviderContext);
    const config = useConfig<IMConfig>();
    const messageFormater = useMessageFormater(translations);

    
    /** - Může mít vrstva rozbalenou legendu?. */
    const hasLegend = !!props.layer?.renderer
    
    // Načtění typu podvrstvy.
    React.useEffect(() => {
        LayerHelper.getSubLayerTypeAsync(props.layer)
            .then(setLayerType)
            .catch(err => {
                console.warn(err);
            })
    }, [props.layer]);

    /** - Přepnutí otevření podvrstvy. */
    function toggleExpand(): void {
        if (canExpand || hasLegend) {
            props.toggleExpand(props.uniqueId);
        }
    }

    /** - Přepnutí vybíratelnosti podvrstvy. */
    function toggleSelectability(): void {
        SelectionManager.getSelectionSet(jimuMapView).setSelectability([{ gisId: LayerHelper.getGisIdLayersFromLayer(props.layer), selectable: !isSelectable }]);
    }

    const getChartColors = (renderer: __esri.PieChartRenderer): HSI.TableOfContentsWidget.IPieChartSymbolData => {
        const colors: __esri.Color[] = [];

        renderer.attributes.forEach(attribute => {
            if (attribute.color) {
                colors.push(attribute.color);
            }
        });
        return {colors: colors};
    }

    /**
     * Načtění dat symbolu, dle typu rendereru. Metoda načítá data dle {@LINK HSI.TableOfContentsWidget.ISymbolData}.
     * Všechna data symbolů jsou vrácena jako pole, aby šla namapovat.
     */
    const getSymbolData = (): HSI.TableOfContentsWidget.ISymbolData[] => {
        if (!hasLegend) return [];
        switch (props.layer.renderer?.type) {
            case 'simple':
                return [{
                    label: (props.layer.renderer as __esri.SimpleRenderer).label,
                    symbolForRender: (props.layer.renderer as __esri.SimpleRenderer).symbol
                }];
            case 'unique-value':
                return [
                    {
                        label: (props.layer.renderer as __esri.UniqueValueRenderer).defaultLabel,
                        symbolForRender: (props.layer.renderer as __esri.UniqueValueRenderer).defaultSymbol
                    },
                    ...(props.layer.renderer as __esri.UniqueValueRenderer).uniqueValueInfos?.map(labelData => ({
                        label: labelData.label,
                        symbolForRender: labelData.symbol
                    })) || []
                ];
            case 'pie-chart':
                return [{
                    label: (props.layer.renderer as __esri.PieChartRenderer).defaultLabel,
                    symbolForRender: getChartColors(props.layer.renderer as __esri.PieChartRenderer)
                }];
            console.warn(`Unhandled renderer type: ${props.layer.renderer?.type}!`);
            default:
                return [];
        }
    };

    
    /** - Pokud je podvrstva otevřená, tak vykreslí seznam její vnořených podvrstev. */
    function getChildren(): JSX.Element {
        if (!isExpanded || !canExpand && !hasLegend) {
            return <></>;
        }

        return (
            <>
                {hasLegend && config["enableLegend"] ? (
                    getSymbolData().length > 0 ? (
                        getSymbolData().map((data, index) => data && <LegendItem key={index} symbolForRender={data.symbolForRender} label={data.label} />)
                    ) : (
                        <Alert type={"warning"} form={"tooltip"}>
                            <p className="m-2" style={{width: 220}}>
                                {messageFormater("legendNotConfigured").replace("{2}", props.layer.renderer?.type)}
                            </p>
                        </Alert>
                    )
                ) : null}
                {isExpanded ? (
                    <LayerItem
                        toggleExpand={props.toggleExpand}
                        treeStructureState={props.treeStructureState}
                        parentId={props.uniqueId}
                    />
                ) : null}
            </>
        );
    }
    return <li
        ref={reference}
        className='hsi-tree-item sublayer-item'
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
        }}
    >
        <div className={`hsi-tree-item-content${canExpand || hasLegend && config["enableLegend"] ? " expansible" : ""}`}>
            <div
                className="hsi-tree-expander"
                onClick={toggleExpand}
            >
                <Icon
                    icon={getAssetsPath(isExpanded ? "minus.svg" : "plus.svg")}
                />
            </div>
            <div></div>
            <Checkbox
                checked={isVisible}
                onClick={() => {
                    props.layer.visible = !props.layer.visible;
                }}
            />
            {
                canBeSelectable && (
                    <div
                        onClick={toggleSelectability}
                    >
                        <Icon icon={getAssetsPath(isSelectable ? "selectable-on.png" : "selectable-off.png")}/>
                    </div>
                )
            }
            <div
                className={`hsi-tree-item-title ${visibleAtScale ? "visible" : "not-visible"}`}
                onClick={toggleExpand}
            >
                {props.layer.title}
            </div>
        </div>
        {getChildren()}
    </li>;
}

export default SublayerItem;

interface IProps {
    /** - Podvrstva kterou tato komponenta ovládá. */
    layer: __esri.Sublayer;
    /** - Stav stromové struktury. */
    treeStructureState: ITreeStructureState,
    /** - Přepnutí stavu otevření podvrstvy ve stromové struktuře. */
    toggleExpand: (gisId: string) => void;
    /** - Unikátní identifikátor podvrstvy. */
    uniqueId: string;
}
