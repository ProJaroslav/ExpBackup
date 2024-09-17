import { React, useIntl } from "jimu-core";
import RenderErrorLoading from "../RenderErrorLoading";
import { AttributeInput, RequiredField, Table } from "widgets/shared-code/components";
import { FeatureHelper } from "widgets/shared-code/helpers";

/** - Zobrazení stavu vytváření reportu a tabulky s parametry pro vytvoření reportu. */
export default function(props: HSI.ReportComponent.ICreateReportFeatureBodyProps) {
    const intl = useIntl();

    if (!!props.state) {
        return <RenderErrorLoading state={props.state} translations={props.translations} />;
    }

    return <Table
        rows={props.fields.map(field => {
            return [
                <RequiredField field={field.field} />,
                field.editable ? <AttributeInput field={field.field} feature={props.feature} preferTextArea={!props.useTextInputs} /> : FeatureHelper.getFeatureValue(props.feature, field.field, { intl })
            ]
        })}
    />;
}