import { React } from "jimu-core";
import { Icon } from "jimu-ui";
import { AssetsProviderContext } from "widgets/shared-code/contexts";

/** - Zobrazení ikony prvku na základě typu jeho geometrie. */
export default React.memo(function(props: IFeatureIconProps) {
    const assetsProvider = React.useContext(AssetsProviderContext);

    let iconName: string;

    switch(props.geometryType) {
        case "extent":
        case "polygon":
            iconName = "polygon.png";
            break;
        case "point":
        case "multipoint":
            iconName = "point.png";
            break;
        case "polyline":
            iconName = "line.png"
            break;
        default:
            console.warn(`Unhandled geometry type: ${props.geometryType}`);
            break;
    }

    return <Icon icon={assetsProvider(iconName)}/>;
});

interface IFeatureIconProps {
    /** - Typ geometrie prvku. */
    geometryType: HSI.IGeometryType
};