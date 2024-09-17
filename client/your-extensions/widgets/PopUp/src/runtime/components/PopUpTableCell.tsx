import { type IntlShape, React } from "jimu-core";
import { useExecuteRightsState } from "widgets/shared-code/hooks";
import { ELoadStatus } from "widgets/shared-code/enums";
import { FeatureHelper } from "widgets/shared-code/helpers";

/**
 * Vytvoření buňky ve formátu standartní PopUp tabulky {@link https://developers.arcgis.com/javascript/latest/api-reference/esri-widgets-Popup.html}
 * Dojde k ověření, zda má {@link field} akci. Případně vrátí odkaz, jinak získanou hodnotu.
 */
export default function PopUpTableCell(props: PopUpTableCellProps): JSX.Element {
    const { popUpField, graphic, intl } = props;
    const action = popUpField.action;
    const userRolesState = useExecuteRightsState(action?.name);
    
    const fieldValue = FeatureHelper.getFeatureValue(graphic, popUpField.field, { intl, popupFormat: false });
    const fieldValueString = typeof fieldValue === "number" ? fieldValue.toString() : fieldValue;
    
    const content = (!action.executeRight || (action.executeRight && userRolesState.loadStatus === ELoadStatus.Loaded && userRolesState.hasPermisson))
        ? (
            <a
                href={action.url.replace("{0}", fieldValueString)}
                title={fieldValueString}
                type="link"
            >
                {fieldValueString}
            </a>
        )
        : <span>{fieldValueString}</span>;

    return (
        <tr>
            <th className="esri-feature-fields__field-header">
                {popUpField.field.name}
            </th>
            <td className="esri-feature-fields__field-data">
                {content}
            </td>
        </tr>
    );
}

interface PopUpTableCellProps {
    popUpField: HSI.PopUpWidget.IPopUpCustomizedField;
    subLayer: __esri.Sublayer;
    graphic: __esri.Graphic;
    intl: IntlShape;
}
