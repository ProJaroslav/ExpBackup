import { React } from "jimu-core";
import { Icon } from "jimu-ui";
import { AssetsProviderContext } from "widgets/shared-code/contexts";

/** - Zobrazení načítání potomků v stromové struktuře. */
export default function() {
    const assetsProvider = React.useContext(AssetsProviderContext);

    return <Icon
        className="children-loader"
        icon={assetsProvider("loading.svg")}
    />;   
}