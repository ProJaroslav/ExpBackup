import { React, useIntl } from "jimu-core";
import { CardBody, CardFooter } from "jimu-ui";
import {Table, AttributeInput, RequiredField, ProcessedLinkAttribute} from "widgets/shared-code/components";
import translations from "../../translations/default";
import {useMessageFormater, useConfig, useFieldAlias, useForceUpdate} from "widgets/shared-code/hooks";
import {FeatureHelper, LayerHelper} from "widgets/shared-code/helpers";
import { EFieldAlias } from "widgets/shared-code/enums";
import LayerConfigurationContext from "../../contexts/LayerConfigurationContext";
import useFieldOrder from "../../hooks/useFieldOrder";
import useFieldExtender from "../../hooks/useFieldExtender";
import { IMassAttributeTableProps } from "./MassAttributeTable";
import { CalciteNotice } from "@esri/calcite-components-react";

const MassAttributeTableEditing = React.lazy(() => import("./MassAttributeTableEditing"));
const ApplyAttributeRulesButton = React.lazy(() => import("../ApplyAttributeRulesButton"));
const DeleteFeaturesButton = React.lazy(() => import("../DeleteFeaturesButton"));

/** - Hromadné zobrazení společných hodnot atributů prvků a jejich editace. */
export default function(props: IMassAttributeTableLoadedProps) {
    /** - Funkce pro překlady textů. */
    const messageFormater = useMessageFormater(translations);
    /** - Konfigurace widgetu. */
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();
    const intl = useIntl();
    const editabilityConfiguration = React.useContext(LayerConfigurationContext);
    // Probíhá editace atributů?
    const [isEditing, toggleEditing] = React.useState<boolean>(false);
    // Probíhá ukládání změn?
    const [isSaving, toggleSaving] = React.useState<boolean>(false);
    const fieldsState = useFieldOrder(props.features[0]);
    const isExtendingFields = useFieldExtender(fieldsState.fields, props.features[0], isEditing);
    const getFieldAlias = useFieldAlias(props.features[0], config.forbidtPopupFormat ? EFieldAlias.default : EFieldAlias.popup);
    const forceUpdate = useForceUpdate();

    /** - Při změně {@link props.featureCopy} se vypne editace. */
    React.useEffect(() => {
        toggleEditing(false);
        toggleSaving(false);
    }, [props.featureCopy]);

    /** - Vykreslení nástroje pro hromadnou editaci atributů. */
    function renderMassUpdate() {
        if (editabilityConfiguration.allowMassUpdate) {
            if (Array.isArray(editabilityConfiguration.updateCondition) && editabilityConfiguration.updateCondition.length > 0) {
                return <CalciteNotice
                    scale="s"
                    icon="information"
                    color="blue"
                >
                    <div slot="message">{messageFormater("massEditNotAllowedWhenUpdateCondition")}</div>
                </CalciteNotice>;
            }

            return <>
                <MassAttributeTableEditing
                    {...props}
                    isEditing={isEditing}
                    isSaving={isSaving}
                    toggleEditing={toggleEditing}
                    toggleSaving={toggleSaving}
                    fields={fieldsState.fields}
                />
                {
                    editabilityConfiguration.allowAttributeRules && editabilityConfiguration.attributeRulesAttributes?.length > 0 ? (
                        <ApplyAttributeRulesButton
                            features={props.features}
                        />
                    ) : <></>
                }
            </>;
        }

        return <></>;
    }

    return <>
        <CardBody>
            <Table
                loading={isSaving || isExtendingFields}
                header={[messageFormater("nameAttributeTableHead"), messageFormater("valueAttributeTableHead")]}
                rows={fieldsState.fields
                    .map(field => {
                        let value: string | number | JSX.Element;
                        let alias: string | JSX.Element = getFieldAlias(field.field);

                        if (isEditing && field.editable) {
                            value = <AttributeInput key={field.field.name} feature={props.featureCopy} field={field.field} preferTextArea={!config.useTextInputs} />;
                            alias = <RequiredField key={field.field.name} field={field.field} alias={alias} />
                        } else {
                            const fieldValue = FeatureHelper.getFeatureValue(props.featureCopy, field.field, { intl, popupFormat: !config.forbidtPopupFormat, onLoad: forceUpdate });
                            if (!config.forbidActionLinks && FeatureHelper.getFeatureType(props.featureCopy) == "sublayer") {
                                value = <ProcessedLinkAttribute fieldName={field.field.name} fieldValue={fieldValue} subLayer={LayerHelper.getSublayerFromFeature(props.featureCopy)}></ProcessedLinkAttribute>
                            } else {
                                value = fieldValue
                            }
                        }

                        return [
                            alias,
                            value
                        ];
                    })
                }
            />
        </CardBody>
        {
            !config.forbidEditing && (editabilityConfiguration.allowMassUpdate || editabilityConfiguration.allowMassDelete) ? (
                <CardFooter className="feature-action-footer">
                    {renderMassUpdate()}
                    {editabilityConfiguration.allowMassDelete ? <DeleteFeaturesButton features={props.features} /> : <></>}
                </CardFooter>
            ) : <></>
        }
    </>;
}

export interface IMassAttributeTableLoadedProps extends IMassAttributeTableProps {
    /** - Pomocný prvek obsahujicí společné atributy {@link features prvků ve výběru}. */
    featureCopy: __esri.Graphic;
}