import { React } from "jimu-core";

/** - Ztučnění textu pokud je {@link IRequiredFieldProps.field atribut} povinný. */
export default function(props: IRequiredFieldProps) {
    if (!props.field.nullable || props.forceRequired) {
        return <span style={{ fontWeight: "bold" }}>{props.alias || props.field.alias}</span>
    }
    return <>{props.alias || props.field.alias}</>;
}

interface IRequiredFieldProps {
    field: __esri.Field;
    /** - Chceme aby byl atribut považován za povinný, i přes to že {@link field} má hodnotu "nullable" true? */
    forceRequired?: boolean;
    /** - Název pole, který se bude zobrazovat nehledě na alias {@link field pole}. */
    alias?: string;
}