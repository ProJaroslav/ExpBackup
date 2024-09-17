import { React } from "jimu-core";
import { LayerTypes } from "jimu-arcgis";
import VirtualLayerListContext from "../contexts/VirtualLayerListContext";
import ITreeStructureState from "../interfaces/ITreeStructureState";
import IVirtualLayerDefinition from "../interfaces/IVirtualLayerDefinition";
import { LayerHelper } from "widgets/shared-code/helpers";
import { Suspense } from "widgets/shared-code/components";
import { JimuMapViewContext } from "widgets/shared-code/contexts";

const MapImageLayerItem = React.lazy(() => import("./MapImageLayerItem"));
const SublayerItem = React.lazy(() => import("./SublayerItem"));
const VirtualLayerItem = React.lazy(() => import("./VirtualLayerItem"));
const WmsLayerItem = React.lazy(() => import("./WmsLayerItem"));
const FeatureLayerItem = React.lazy(() => import("./FeatureLayerItem"));

/** - Vykreslení jedné úrovně vrstev a podvrstev do stromové struktury. */
export default function(props: ILayerItemProps) {
    const jimuMapView = React.useContext(JimuMapViewContext);
    const virtualLayerList = React.useContext(VirtualLayerListContext);

    /**
     * - Vykreslení MapImageLayer (Mapové služby) do stromové struktury.
     * @param mapImageLayer - Vrtva typu "map-image".
     */
    function renderMapImageLayer(mapImageLayer: __esri.MapImageLayer): JSX.Element {
        return <MapImageLayerItem
            layer={mapImageLayer}
            toggleExpand={props.toggleExpand}
            treeStructureState={props.treeStructureState}
            uniqueId={props.parentId + mapImageLayer.id}
        />;
    }

    /**
     * - Vykreslení WMS služby do stromové struktury.
     * @param mapImageLayer - Vrtva typu "wms".
     */
    function renderWmsLayer(mapImageLayer: __esri.WMSLayer): JSX.Element {
        return <WmsLayerItem
            layer={mapImageLayer}
            toggleExpand={props.toggleExpand}
            treeStructureState={props.treeStructureState}
            uniqueId={props.parentId + mapImageLayer.id}
        />;
    }

    /**
     * - Vykreslení Feature vrstvy do stromové struktury.
     * @param mapImageLayer - Vrtva typu "feature".
     */
    function renderFeatureLayer(mapImageLayer: __esri.FeatureLayer): JSX.Element {
        return <FeatureLayerItem
            layer={mapImageLayer}
            toggleExpand={props.toggleExpand}
            treeStructureState={props.treeStructureState}
            uniqueId={props.parentId + mapImageLayer.id}
        />;
    }

    /**
     * - Vykreslení podvrstvy do stromové struktury.
     * @param sublayer - Podvrstva.
     */
    function renderSublayer(sublayer: __esri.Sublayer): JSX.Element {
        return <SublayerItem
            layer={sublayer}
            toggleExpand={props.toggleExpand}
            treeStructureState={props.treeStructureState}
            uniqueId={props.parentId + LayerHelper.getGisIdLayersFromLayer(sublayer)}
        />;
    }

    /**
     * - Vykreslení virtuální vrstvy do stromové struktury.
     * - @see {@link IVirtualLayerDefinition}
     * @param virtualLayer - Definice virtuální vrstvy.
     */
    function renderVirtualLayer(virtualLayer: IVirtualLayerDefinition): JSX.Element {
        return <VirtualLayerItem
            layer={virtualLayer}
            toggleExpand={props.toggleExpand}
            treeStructureState={props.treeStructureState}
            uniqueId={props.parentId + virtualLayer.id}
        />;
    }

    function renderLayers(): JSX.Element | Array<JSX.Element> {
        if (!jimuMapView) {
            return <></>;
        }

        /** - Identifikátory potomků ve stromové struktuře. */
        let children: Array<string> = [];

        /** - Pokud není definováno {@link props.parentId}, tak se jedná o první úroveň. */
        if (!props.parentId) {
            children = props.treeStructureState.baseLayers;
        } else {
            children = props.treeStructureState.layerStructure[props.parentId]?.sublayers || [];
        }

        return children.map(uniqueId => {
            /** - GisId podvrstvy / Id mapové služby / Id virtuální vrstvy / Id WMS služby. */
            let layerId = uniqueId.replace(props.parentId, "");

            const virtualLayerindex = virtualLayerList.findIndex(virtualLayer => virtualLayer.id === layerId);
            if (virtualLayerindex !== -1) {
                return renderVirtualLayer(virtualLayerList[virtualLayerindex]);
            }
            let layer = jimuMapView.view.map.findLayerById(layerId);
            if (layer) {
                if (layer.type === LayerTypes.MapImageLayer) {
                    return renderMapImageLayer(layer as __esri.MapImageLayer);
                } else if (layer.type === LayerTypes.WMSLayer) {
                    return renderWmsLayer(layer as __esri.WMSLayer);
                } else if (layer.type === LayerTypes.FeatureLayer) {
                    return renderFeatureLayer(layer as __esri.FeatureLayer);
                } else {
                    console.warn(`Unhandled layer type '${layer.type}'`);
                    return <></>;
                }
            } else {
                let sublayer = LayerHelper.getSublayerByGisId(jimuMapView, layerId);
                if (sublayer) {
                    return renderSublayer(sublayer);
                } else {
                    return <></>;
                }
            }
        });
    }
    
    return <ul className="hsi-tree">
        <Suspense>
            {renderLayers()}
        </Suspense>
    </ul>;
}

interface ILayerItemProps {
    /** - Stav stromové struktury. */
    treeStructureState: ITreeStructureState,
    /** - Přepnutí stavu otevření vrstvy/podvrstvy ve stromové struktuře. */
    toggleExpand: (gisId: string) => void;
    /** - Unikátní identifikátor rodičovské vrstvy (v rámci stromové struktury, ne ve webmapě). */
    parentId: string;
};