import { type IntlShape, React } from "jimu-core";
import PopUpTableCell from "../components/PopUpTableCell";

/**
 * Vytvoření tabulky ve formátu standartní PopUp tabulky {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-Popup.html}
 * Zatím použíte pouze v případě, že chceme generovat odkaz.
 */
export default function PopUpTable(props: IPopUpTableProps): JSX.Element {

    /** @todo - KUT: Možná bych vytvořil komponentu pro tento typ tabulky. Zatím nedělat. */
    const tableContent = (
        <table className="esri-widget__table">
            <tbody>
            {props.processedFieldsArray.map((popUpField) => (
                <PopUpTableCell
                    intl={props.intl}
                    graphic={props.graphic}
                    key={popUpField.field.name}
                    popUpField={popUpField}
                    subLayer={props.subLayer}
                />
            ))}
            </tbody>
        </table>
    );

    return tableContent;
}

interface IPopUpTableProps {
    subLayer: __esri.Sublayer;
    graphic: __esri.Graphic;
    intl: IntlShape;
    processedFieldsArray: HSI.PopUpWidget.IPopUpCustomizedField[];
}
