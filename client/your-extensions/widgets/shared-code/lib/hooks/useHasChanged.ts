import { React } from "jimu-core";

/**
 * - Ověřuje zda došlo ke změně {@link item hodnoty} oproti předchozímu renderu.
 * @param item - Hodnota jejíž změnu vyhodnocujeme.
 */
export default function(item: string | number | boolean): boolean {
    /** - Reference {@link item hodnoty} z předchozího renderu. */
    const prevRef = React.useRef<typeof item>();

    React.useEffect(() => {
        prevRef.current = item;
    });

    return item !== prevRef.current;
}