import { React, useIntl } from "jimu-core";
import { Card, CardBody, CardFooter, Button, ButtonGroup } from "jimu-ui";
import translations from "../translations/default";
import useFeatureConditionalEditability from "../hooks/useFeatureConditionalEditability";
import useFieldOrder from "../hooks/useFieldOrder";
import useFieldExtender from "../hooks/useFieldExtender";
import LayerConfigurationContext from "../contexts/LayerConfigurationContext";
import {useMessageFormater, useConfig, useFieldAlias, useForceUpdate, useLoadAction} from "widgets/shared-code/hooks";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { Suspense, AttributeInput, RequiredField, Table, ProcessedLinkAttribute } from "widgets/shared-code/components";
import { NotificationHelper, FeatureHelper, LayerHelper } from "widgets/shared-code/helpers";
import { EFieldAlias } from "widgets/shared-code/enums";


const GeomteryEditor = React.lazy(() => import("./GeomteryEditor"));
const DeleteFeaturesButton = React.lazy(() => import("./DeleteFeaturesButton"));
const ApplyAttributeRulesButton = React.lazy(() => import("./ApplyAttributeRulesButton"));

/** - Přehled atributů prvku s umožněním jejich editace. */
export default function(props: IAttributeTableProps) {
    /** - Funkce pro překlady textů. */
    const messageFormater = useMessageFormater(translations);
    // Probíhá editace atributů?
    const [isEditing, toggleEditing] = React.useState<boolean>(false);
    // Probíhá ukládání změn?
    const [isSaving, toggleSaving] = React.useState<boolean>(false);
    /** - Reference GisId prvku. */
    const featureGisId = React.useRef<string>();
    /** - Konfigurace widgetu. */
    const config = useConfig<HSI.SelectionResultWidget.IMConfig>();
    // Kopie prvku pro editaci, jehož geometrie je převedená do vybraného souřadného systému.
    const [graphic, setGraphic] = React.useState<__esri.Graphic>();
    /** - Atributy zobrazujicí se v tabulce. */
    const fieldsState = useFieldOrder(props.feature);
    /** - Probíhá rozšíření {@link fieldsState.fields polí} o vlastnosti potřebné k editaci? */
    const isExtendingFields = useFieldExtender(fieldsState.fields, props.feature, isEditing);
    const intl = useIntl();
    const featureEditabilityState = useFeatureConditionalEditability(props.feature, isEditing);
    // Probíhá zjišťování editovatelnosti geometrie?.
    const [isGeometryLoadingEditability, toggleGeometryEditabilityLoading] = React.useState<boolean>(false);
    const editabilityConfiguration = React.useContext(LayerConfigurationContext);
    const jimuMapView = React.useContext(JimuMapViewContext);
    const forceUpdate = useForceUpdate();
    const getFieldAlias = useFieldAlias(props.feature, config.forbidtPopupFormat ? EFieldAlias.default : EFieldAlias.popup);
    
    /** - Pokud se vyvolal režim editace {@link isEditing}, a prvek není editovatelný, tak se režim editace vypne, a vypíše se notifikace uživateli. */
    React.useEffect(() => {
        if (isEditing && featureEditabilityState.isLoaded && !featureEditabilityState.isEditable) {
            toggleEditing(false);
            if (featureEditabilityState.message) {
                NotificationHelper.addNotification({ message: featureEditabilityState.message, type: "info" })
            }
        }
    }, [featureEditabilityState, isEditing]);

    /** - Při změně {@link props.feature} se naplní {@link featureGisId}, a nastaví se výchozí stav.*/
    React.useEffect(() => {
        try {
            toggleEditing(false);
            toggleSaving(false);
            featureGisId.current = props.tableFeature ? FeatureHelper.getTableFeatureGisId(props.feature) : FeatureHelper.getFeatureGisId(props.feature);;
        } catch(err) {
            console.warn(err);
        }
    }, [props.feature, props.tableFeature]);

    /** - Při změně hodnoty atributu v prvku se provede rerender. */
    React.useEffect(() => {
        if (props.feature) {
            const listener = FeatureHelper.watchAttributeChange(props.feature, fieldsState.fields.map(field => field.field.name), forceUpdate);

            return function() {
                listener.remove();
            }
            
        }
    }, [props.feature, forceUpdate, fieldsState.fields]);

    /** - Kopie {@link props.feature prvku označeného ve stromové struktuře}, ve které se provádí neuložené změny hodnot atributů. */
    const featureCopy = React.useMemo(() => {
        return props.feature.clone();
    }, [props.feature, isEditing]); // Při započetí/ukončení editace, se vynulují změny

    /** - Uložení změněných hodnot atributů do prvku. */
    async function saveChanges() {
        try {
            for (let field of fieldsState.fields) {
                let value = featureCopy.attributes[field.field.name];
                if (field.editable && (!field.field.nullable || field.required) && !value && value !== 0) {
                    NotificationHelper.addNotification({ message: messageFormater("requiredAttributeMessage").replace("{0}", field.field.alias), type: "warning" });
                    return;
                }
            }

            toggleSaving(true);

            await FeatureHelper.updateAttributes(jimuMapView, props.feature, featureCopy.attributes);
            /** Pokud 'false', znamená to že se během ukládání změnila hodnota {@link props.feature}.*/
            if (featureGisId.current === (props.tableFeature ? FeatureHelper.getTableFeatureGisId(props.feature) : FeatureHelper.getFeatureGisId(props.feature))) {
                toggleEditing(false);
                toggleSaving(false);
            }
        } catch(err) {
            console.warn(err);
            toggleSaving(false);
            NotificationHelper.addApplyEditsErrorNotification(messageFormater("saveAttributesFailed"), err);
        }
    }

    const canEditGeometry = !props.tableFeature && !!editabilityConfiguration && "allowGeometryUpdate" in editabilityConfiguration  && editabilityConfiguration.allowGeometryUpdate && config.editGeometryFromAttributeTab;

    
    return <Card className="tab-card">
        <CardBody>
            <Table
                loading={isSaving || (isEditing && !featureEditabilityState.isLoaded) || isGeometryLoadingEditability || isExtendingFields}
                header={[messageFormater("nameAttributeTableHead"), messageFormater("valueAttributeTableHead")]}
                rows={fieldsState.fields
                    .map(field => {
                        let value: string | number | JSX.Element;
                        let alias: string | JSX.Element = getFieldAlias(field.field);
                        if (isEditing && field.editable) {
                            value = <AttributeInput
                                key={field.field.name}
                                feature={featureCopy}
                                field={field.field}
                                preferTextArea={!config.useTextInputs}
                                popupFormat={!config.forbidtPopupFormat}
                            />;
                            alias = <RequiredField
                                key={field.field.name}
                                field={field.field}
                                forceRequired={field.required} alias={alias}
                            />;
                        } else {
                            const fieldValue = FeatureHelper.getFeatureValue(props.feature, field.field, { intl, popupFormat: !config.forbidtPopupFormat, onLoad: forceUpdate });
                            if (!config.forbidActionLinks && FeatureHelper.getFeatureType(props.feature) == "sublayer") {
                                value = <ProcessedLinkAttribute fieldName={field.field.name} fieldValue={fieldValue} subLayer={LayerHelper.getSublayerFromFeature(props.feature)}></ProcessedLinkAttribute>
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
        <Suspense>
            {
                !config.forbidEditing && (editabilityConfiguration.allowUpdate || canEditGeometry || editabilityConfiguration.allowDelete) ? (
                    <CardFooter className="feature-action-footer">
                        {
                            editabilityConfiguration.allowUpdate ? (
                                <ButtonGroup>
                                    <Button
                                        size="sm"
                                        disabled={isSaving || isExtendingFields}
                                        active={isEditing}
                                        onClick={() => toggleEditing(editing => !editing)}
                                    >
                                        {messageFormater("editAttributes")}
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={!isEditing || isSaving || isExtendingFields}
                                        onClick={saveChanges}
                                    >
                                        {messageFormater("saveAttributeChanges")}
                                    </Button>
                                </ButtonGroup>
                            ) : <></>
                        }
                        {
                            canEditGeometry ? (
                                <GeomteryEditor
                                    feature={props.feature}
                                    graphic={graphic}
                                    geometryColor={props.geometryColor}
                                    pointSize={props.pointSize}
                                    isSaving={isSaving}
                                    setGraphic={setGraphic}
                                    toggleSaving={toggleSaving}
                                    isLoadingEditability={isGeometryLoadingEditability}
                                    toggleEditabilityLoading={toggleGeometryEditabilityLoading}
                                />
                            ) : <></>
                        }
                        { editabilityConfiguration.allowDelete ? <DeleteFeaturesButton features={[props.feature]} /> : <></> }
                        { editabilityConfiguration.allowAttributeRules && editabilityConfiguration.attributeRulesAttributes?.length > 0 ? <ApplyAttributeRulesButton features={props.feature} /> : <></>}
                    </CardFooter>
                ) : <></>
            }
        </Suspense>
    </Card>;
}

interface IAttributeTableProps extends Pick<HSI.DbRegistry.IEditabilityDbValue, "geometryColor" | "pointSize"> {
    /** - Prvek označený ve stromové struktuře. */
    feature: __esri.Graphic;
    /** - Jedná se o negrafický prvek? */
    tableFeature?: boolean;
};