import { React } from "jimu-core";

/**
 * - Ověřuje zda došlo ke změně v poli {@link arr} oproti předchozímu renderu.
 * @param arr - Pole jehož změnu vyhodnocujeme.
 * @param comperer - Funkce ověřující zda jsou dva prvky pole identické.
 */
export default function<T extends any>(arr: Array<T>, comperer?: (currentItem: T, prevItem: T) => boolean): boolean {
    /** - Reference pole z předchozího renderu. */
    const prevArrayRef = React.useRef<Array<T>>([]);

    React.useEffect(() => {
        prevArrayRef.current = arr;
    });

    if (arr === prevArrayRef.current) {
        return false;
    }

    if (!Array.isArray(arr) || !Array.isArray(prevArrayRef.current)) {
        return true;
    }

    if (arr.length !== prevArrayRef.current.length) {
        return true;
    }

    for (let index = 0; index < arr.length - 1; index++) {
        if (comperer ? !comperer(arr[index], prevArrayRef.current[index]) : arr[index] !== prevArrayRef.current[index]) {
            return true;
        }
    }

    return false;
}