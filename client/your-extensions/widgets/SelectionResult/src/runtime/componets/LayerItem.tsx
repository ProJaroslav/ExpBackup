import { React } from "jimu-core";
import { Icon } from "jimu-ui";
import LayerTitle from "./LayerTitle";
import ESelectedFeaturesType from "../enums/ESelectedFeaturesType";
import translations from "../translations/default";
import SelectionTreeItem from "./SelectionTreeItem";
import SelectionTreeItemContent from "./SelectionTreeItemContent";
import Expander from "./Expander";
import { filledRelationsOnlyExpander } from "../helpers/contextMenu";
import { useMessageFormater, useConfig } from "widgets/shared-code/hooks";
import { JimuMapViewContext, AssetsProviderContext, PopperContext } from "widgets/shared-code/contexts";
import { Suspense } from "widgets/shared-code/components";
import { FeatureHelper, GeometryHelper } from "widgets/shared-code/helpers";
import SelectionManager from "widgets/shared-code/SelectionManager";

const FeatureItem = React.lazy(() => import("./FeatureItem"));
const deleteIcon = require("jimu-ui/lib/icons/delete-12.svg");

/** - Zobrazení podvrstvy, která má prvky ve výběru, ve stromové struktuře. */
function LayerItem(props: ILayerItemProps) {
    /** - Prvky ve výběru z této podvrstvy. */
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
                type: ESelectedFeaturesType.Layer,
                features,
                geometryType: props.featureSet.geometryType,
                id: props.gisId
            });
        }
    }

    /** - Otevření/zavření seznamu s potomy vrstvy. */
    function toggleExpand() {
        props.toggleExpand({
            id: props.gisId,
            gisId: props.gisId
        });
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
                list: [
                    {
                        content: messageFormater("zoomFeatureContextMenu"),
                        closeOnClick: true,
                        icon: assetsProvider("loupe.svg"),
                        onClick() {
                            GeometryHelper.zoom(jimuMapView, features);
                        }
                    }, {
                        content: messageFormater("moveFeatureContextMenu"),
                        icon: assetsProvider("move.svg"),
                        closeOnClick: true,
                        onClick() {
                            GeometryHelper.pan(jimuMapView, features);
                        }
                    }, {
                        content: messageFormater('removeFeatureContextMenu'),
                        icon: deleteIcon,
                        closeOnClick: true,
                        onClick() {
                            SelectionManager.getSelectionSet(jimuMapView).destroyFeatureSet(props.gisId);
                            props.onSelect({ type: ESelectedFeaturesType.Empty });
                        }
                    }
                ]
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


    return <SelectionTreeItem
        ref={itemReference}
        onContextMenu={onContextMenu}
    >
        <SelectionTreeItemContent
            isSelected={props.selectedId === props.gisId}
            level={0}
            onClick={() => {
                selectLayer();
                if (!config.forbidExpandLayerOnRightClick) {
                    toggleExpand();
                }
            }}
            className={props.isPending ? "pending" : ""}
        >
            <Expander
                expanded={props.layerState?.expanded || false}
                hidden={props.isPending}
                toggleExpand={toggleExpand}
            />

            <Icon 
                icon={assetsProvider("layer.png")}
            />

            <span className='selection-tree-item-title'>
                <LayerTitle
                    featureSet={props.featureSet}
                    gisId={props.gisId}
                />&nbsp;
                ({features.length || 0})
            </span>

            <div className='selection-tree-item-loader'><div></div></div>
        </SelectionTreeItemContent>
        {
            props.layerState?.expanded ? (
                features.map(feature => {
                    return <Suspense>
                        <FeatureItem
                            key={feature.getObjectId()}
                            feature={feature}
                            onSelect={props.onSelect}
                            selectedId={props.selectedId}
                            level={1}
                            geometryType={props.featureSet.geometryType}
                            displayField={props.featureSet.displayFieldName}
                            parentId={props.gisId}
                            objectState={props.layerState?.children[FeatureHelper.getFeatureGisId(feature)]}
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
};

/** - Zobrazení podvrstvy, která má prvky ve výběru, ve stromové struktuře. */
export default function (props: ILayerItemProps) {
    // Pokud nemá prvky ve výběru, tak vrstvu nebudeme zobrazovat/
    if (!props.featureSet?.features?.length && !props.isPending) {
      return <></>;
    }

    return <LayerItem {...props} />;
}

interface ILayerItemProps extends Omit<HSI.SelectionResultWidget.ITreeItemCommonProps, "level" | "parentId"> {
    /** - Skupina prvků ve výběru (musí pocházet z jedné vrstvy). */
    featureSet: __esri.FeatureSet;
    /** - Probíhá ve vrstvě výběr? */
    isPending: boolean;
    /** - GisId podvrstvy. */
    gisId: string;
    /** - Stav zobrazení vrstvy ve stromové struktuře. */
    layerState: HSI.SelectionResultWidget.ITreeState;
};