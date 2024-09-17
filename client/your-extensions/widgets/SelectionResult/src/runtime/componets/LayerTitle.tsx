import { React } from "jimu-core"
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { LayerHelper } from "widgets/shared-code/helpers";

/** - Zobrazení názvu podvrstvy. */
export default React.memo(function(props: ILayerItemProps) {
    if (props.featureSet?.features?.[0]) {
        return <ByGisFeature feature={props.featureSet.features[0]} />;
    }

    return <ByGisId gisId={props.gisId} />;
});

/**
 * - Zobrazení názvu podvrstvy.
 * - Podvrstva se vyčte z prvku.
 */
const ByGisId = (props: Pick<ILayerItemProps, "gisId">) => {
    const jimuMapView = React.useContext(JimuMapViewContext);

    const sublayer = LayerHelper.getSublayerByGisId(jimuMapView, props.gisId);

    return <span>{sublayer?.title}</span>;
};

/**
 * - Zobrazení názvu podvrstvy.
 * - Podvrstva se nachází podle její GisId
 */
const ByGisFeature = (props: IByGisFeatureProps) => {
    const sublayer = LayerHelper.getSublayerFromFeature(props.feature);

    return <span>{sublayer?.title}</span>;
};

interface ILayerItemProps {
    /** - Skupina prvků (musí pocházet z jedné podvrstvy) ze kterých se podvrstva získá. */
    featureSet: __esri.FeatureSet;
    /** - GisId podvrstvy. */
    gisId: string;
};

interface IByGisFeatureProps {
    /** - Prvků ze kterého se podvrstva získá. */
    feature: __esri.Graphic;
};