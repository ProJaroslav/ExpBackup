import { React } from "jimu-core";
import { NumericInput, TextInput, TextArea } from "jimu-ui";
import { DateHelper, FeatureHelper } from "widgets/shared-code/helpers";
import { SelectFilter, DateInput } from "widgets/shared-code/components";
import { useDomainCodedValues, useForceUpdate } from "widgets/shared-code/hooks";
import { ELoadStatus } from "widgets/shared-code/enums";

/** - Editace atributu prvku. */
export default React.memo(function (props: IAttributeInputProps) {
    const forceUpdate = useForceUpdate();
    const ref = React.useRef<HTMLInputElement>();

    /** - Při změně {@link props.feature} se aktualizuje {@link attribute}. */
    React.useEffect(() => {
        const listener = FeatureHelper.watchAttributeChange(props.feature, props.field.name, () => {
            if (props.field.type === "string" && props.field.domain?.type !== "coded-value") {
                ref.current.value = props.feature.getAttribute(props.field.name);
            } else {
                forceUpdate();
            }
        });

        return function() {
            listener.remove();
        }
    }, [props.feature, props.field, forceUpdate]);

    /** - Změna hodnoty atributu prvku. */
    function setAttribute(value: number | string) {
        props.feature.setAttribute(props.field.name, value);
    }

    if (props.field.domain?.type === "coded-value") {
        return <CodedValueDomainSelect
            feature={props.feature}
            field={props.field}
        />;
    }

    /** - Současná hodnota atributu. */
    const attribute = getAttribute(props.feature, props.field);

    switch(props.field.type) {
        case "date":
            const withTime = props.popupFormat && FeatureHelper.getPopupFieldInfo(props.feature, props.field, forceUpdate)?.format?.dateFormat?.includes("time");
            return <DateInput
                withTime={withTime}
                onChange={ev => {setAttribute(DateHelper.toLocaleTime(ev.target.value));}}
                value={DateHelper.inputFormat(attribute as number)}
                size="sm"
            />;
        case "oid":
        case "double":
        case "small-integer":
        case "integer":
        case "long":
        case "single":
            return <NumericInput
                size="sm"
                value={attribute}
                // onChange={setAttribute}
                showHandlers={false}  // Tlačítka jsou schovaná, protože nefungují v kombinaci s možností zapisovat desetinná místa s čárkou (funkce níže).
                onChangeCapture={e => {
                    // Možnost zapisovat desetinná místa s čárkou.
                    try {
                        let newValue: number;
                        let stringValue = e.target['value'];
    
                        if (typeof stringValue === "string") {
                            stringValue = stringValue.replace(",", ".");
                            newValue = parseFloat(stringValue);
                        } else if (typeof stringValue === "number") {
                            newValue = stringValue;
                        }
    
                        setAttribute(newValue);
                    } catch(err) {
                        console.warn(err);
                    }
                }}
            />;
        case "string":
            if (props.preferTextArea) {
                return <TextArea
                    ref={ref}
                    defaultValue={attribute}
                    onChange={ev => setAttribute(ev.target.value)}
                />;
            }

            return <TextInput
                size="sm"
                ref={ref}
                defaultValue={attribute}
                onChange={ev => setAttribute(ev.target.value)}
            />;
        default:
            console.warn(`Unhandled field type "${props.field.type}"`);
            return <TextInput
                ref={ref}
                size="sm"
                defaultValue={attribute}
                onChange={ev => setAttribute(ev.target.value)}
            />;
    }
});

/** - Výběr doménové hodnoty. */
function CodedValueDomainSelect(props: ICodedValueDomainSelectProps) {
    const codedValuesState = useDomainCodedValues(props.feature, props.field);
    /** - Doménové hodnoty seřazené podle abecedy. */
    const options: HSI.SelectFilter.ISelectFilterProps['options'] = React.useMemo(() => {
        try {
            return codedValuesState.codedValues
                .map(codedValue => ({
                    label: codedValue.name,
                    value: codedValue.code
                }))
                .sort((a, b) => {
                    return a.label.localeCompare(b.label);
                });
        } catch(err) {
            console.warn(err);
            return [];
        }
    }, [codedValuesState.codedValues]);

    return <SelectFilter
        nullable={codedValuesState.loadStatus !== ELoadStatus.Pending}
        loading={codedValuesState.loadStatus === ELoadStatus.Pending}
        selectProps={{
            size: "sm",
            value: props.feature.getAttribute(props.field.name),
            onChange(ev) {
                props.feature.setAttribute(props.field.name, ev.target.value);
            }
        }}
        filterSize="sm"
        options={options}
        prefixElements={codedValuesState.prefixElements}
    />;
}

function getAttribute(feature: __esri.Graphic, field: __esri.Field) {
    let attribute = feature.getAttribute(field.name);
    if (attribute === null || attribute === undefined) {
        attribute = "";
    }

    return attribute;
}

interface ICodedValueDomainSelectProps extends Pick<IAttributeInputProps, "feature" | "field"> {}

interface IAttributeInputProps {
    /** - Prvek který editujeme. */
    feature: __esri.Graphic;
    /** - Atribut {@link feature prvku}, který editujeme. */
    field: __esri.Field;
    /** - Pokud true, tak se pole typu "string" budou zobrazovat jako TextArea (Roztáhnutelné pole). */
    preferTextArea?: boolean;
    /**
     * - Má se výběr data přizpůsobit formátu pop-upu?.
     * - Pokud je pop-up naformátován tak, že se zobrazuje datum i s časem, tak půjde editovat čas.
     */
    popupFormat?: boolean;
}