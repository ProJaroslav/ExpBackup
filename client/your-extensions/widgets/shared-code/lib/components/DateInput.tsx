import { React } from "jimu-core";
import { TextInputProps, TextInput } from "jimu-ui";

/**
 * - Jednoduchá komponenta pro zadání datumu.
 * - Komponenta byla vytvořena proto, že při převodu na datum, a zpět na text (proces editace prvku), začalo "blbnout" ruční zadávání datumu. Tento proces tomu zabrání - nevím proč, ale je tomu tak.
 */
export default function (props: IDateInputProps) {
    const [value, setValue] = React.useState<typeof props.value>();

    /** - Při změně hodnoty v props, se akttualizuje state. */
    React.useEffect(() => {
        setValue(props.value);
    }, [props.value]);

    function onChange(e: React.ChangeEvent<HTMLInputElement>) {
        setValue(e.target.value);
        if (typeof props.onChange === "function") {
            props.onChange(e);
        }
    }

    return <TextInput
        {...props}
        type={props.withTime ? "datetime-local" : "date"}
        value={value}
        onChange={onChange}
    />;
}

interface IDateInputProps extends Omit<TextInputProps, "type"> {
    /** - Má se umožnit edtitace času? */
    withTime?: boolean;
}