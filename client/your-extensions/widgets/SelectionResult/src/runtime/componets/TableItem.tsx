import { React } from "jimu-core";
import { Icon } from "jimu-ui";
import ESelectedFeaturesType from "../enums/ESelectedFeaturesType";
import translations from "../translations/default";
import SelectionTreeItem from "./SelectionTreeItem";
import SelectionTreeItemContent from "./SelectionTreeItemContent";
import Expander from "./Expander";
import { filledRelationsOnlyExpander } from "../helpers/contextMenu";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { JimuMapViewContext, AssetsProviderContext, PopperContext } from "widgets/shared-code/contexts";
import { Suspense } from "widgets/shared-code/components";
import { FeatureHelper, LayerHelper } from "widgets/shared-code/helpers";
import SelectionManager from "widgets/shared-code/SelectionManager";
const TableFeatureItem = React.lazy(() => import("./TableFeatureItem"));
const deleteIcon = require("jimu-ui/lib/icons/delete-12.svg");

/** - Zobrazení negrafické vrstvy (tabulky), která má prvky ve výběru, ve stromové struktuře. */
function TableItem(props: ILayerItemProps) {
    /** - Prvky ve výběru z této vrstvy. */
    const features = props.featureSet?.features || [];
    /** - Funkce poskytujicí cestu k souboru uloženeho ve složce "assets". */
    const assetsProvider = React.useContext(AssetsProviderContext);
    const itemReference = React.useRef<HTMLDivElement>();
    /** - Otevření kontextového menu. */
    const popper = React.useContext(PopperContext);
    /** - Funkce pro překlady textů. */
    const messageFormater = useMessageFormater(translations);
    const jimuMapView = React.useContext(JimuMapViewContext);
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();

    /** - Označení vrstvy ve stromové struktuře. */
    function selectLayer() {
        if (props.isPending) {
            props.onSelect({ type: ESelectedFeaturesType.Empty });
        } else {
            props.onSelect({
                type: ESelectedFeaturesType.Table,
                features,
                id: props.id
            });
        }
    }

    /**
     * - Otevření kontextového menu vyvolaného na podvrstvou.
     * @param ev - Událost kliknutí pravého tlačátka myši.
     */
    function onContextMenu(ev: React.MouseEvent<HTMLDivElement, MouseEvent>) {
        ev.stopPropagation();
        ev.preventDefault();
        selectLayer();
        if (!props.isPending) {
            const popperPararms: HSI.IPopperParams = {
                reference: itemReference,
                position: {
                    x: ev.clientX,
                    y: ev.clientY
                },
                list: [{
                    content: messageFormater('removeFeatureContextMenu'),
                    icon: deleteIcon,
                    closeOnClick: true,
                    onClick() {
                        SelectionManager.getSelectionSet(jimuMapView).destroyTableFeatureSet(props.id);
                        props.onSelect({ type: ESelectedFeaturesType.Empty });
                    }
                }]
            };

            if (config.filledRelationsOnly) {
                filledRelationsOnlyExpander(jimuMapView, popper, popperPararms, {
                    filledRelationsOnlyContextTitle: messageFormater("filledRelationsOnlyContextTitle"),
                    onSetFilledRelationsOnly: messageFormater("onSetFilledRelationsOnly"),
                    onSetFilledRelationsOnlyError: messageFormater("onSetFilledRelationsOnlyError")
                });
            } else {
                popper(popperPararms);
            }
        }
    }

    /** - Poskytuje název atributu k zobrazení (Display Field). */
    function getDisplayFieldName() {
        try {
            return props.featureSet.displayFieldName || LayerHelper.getTableById(jimuMapView, props.id)?.displayField;
        } catch(err) {
            console.warn(err);
        }
    }

    return <SelectionTreeItem
        ref={itemReference}
        onContextMenu={onContextMenu}
    >
        <SelectionTreeItemContent
            isSelected={props.selectedId === props.id}
            level={0}
            onClick={() => {
                selectLayer();
                if (!config.forbidExpandLayerOnRightClick) {
                    props.toggleExpand({
                        id: props.id,
                        gisId: props.id
                    });
                }
            }}
            className={props.isPending ? "pending" : ""}
        >
            <Expander
                expanded={props.layerState?.expanded || false}
                hidden={props.isPending}
                toggleExpand={() => props.toggleExpand({
                    id: props.id,
                    gisId: props.id
                })}
            />

            <Icon 
                icon={assetsProvider("layer.png")}
            />

            <span className='selection-tree-item-title'>
                <span>{LayerHelper.getTableById(jimuMapView, props.id)?.title}</span>&nbsp;
                ({features.length || 0})
            </span>

            <div className='selection-tree-item-loader'><div></div></div>
        </SelectionTreeItemContent>
        {
            props.layerState?.expanded ? (
                features.map(feature => {
                    return <Suspense>
                        <TableFeatureItem
                            key={feature.getObjectId()}
                            feature={feature}
                            onSelect={props.onSelect}
                            selectedId={props.selectedId}
                            level={1}
                            displayField={getDisplayFieldName()}
                            parentId={props.id}
                            objectState={props.layerState?.children[FeatureHelper.getTableFeatureGisId(feature)]}
                            toggleExpand={props.toggleExpand}
                            loadRelationClasses={props.loadRelationClasses}
                            loadRelationObjects={props.loadRelationObjects}
                            loadedRelationClasses={props.loadedRelationClasses}
                            loadedRelationObjects={props.loadedRelationObjects}
                        />
                    </Suspense>;
                })
            ) : <></>
        }
    </SelectionTreeItem>;
}

/** - Zobrazení podvrstvy, která má prvky ve výběru, ve stromové struktuře. */
export default function (props: ILayerItemProps) {
    // Pokud nemá prvky ve výběru, tak vrstvu nebudeme zobrazovat/
    if (!props.featureSet?.features?.length && !props.isPending) {
      return <></>;
    }

    return <TableItem {...props} />;
}

interface ILayerItemProps extends Omit<HSI.SelectionResultWidget.ITreeItemCommonProps, "level" | "parentId"> {
    /** - Skupina prvků ve výběru (musí pocházet z jedné vrstvy). */
    featureSet: __esri.FeatureSet;
    /** - Probíhá ve vrstvě výběr? */
    isPending: boolean;
    /** - Id vrstvy. */
    id: string;
    /** - Stav zobrazení vrstvy ve stromové struktuře. */
    layerState: HSI.SelectionResultWidget.ITreeState;
};