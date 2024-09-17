import { React } from "jimu-core";
import { Icon } from "jimu-ui";
import { AssetsProviderContext } from "widgets/shared-code/contexts";

/** - Ikona pro přepínání viditelnosti seznamu v stromové struktuře. */
export default function (props: IExpanderProps) {
    /** - Funkce poskytujicí cestu k souboru uloženeho ve složce "assets". */
    const assetsProvider = React.useContext(AssetsProviderContext);

    return <div
        className={`hsi-tree-expander${props.hidden ? " hidden" : ""}`}
        onClick={ev => {
            ev.stopPropagation();
            props.toggleExpand(!props.expanded);
        }}
    >
        <Icon 
            icon={assetsProvider(props.expanded ? "minus.svg" : "plus.svg")}
        />
    </div>;
};

interface IExpanderProps {
    /** - Je seznam otevřený? */
    expanded: boolean;
    /** - Je ikona schovaná? */
    hidden?: boolean;
    /** - Otevření/zavření seznamu. */
    toggleExpand: (expanded: boolean) => void;
}