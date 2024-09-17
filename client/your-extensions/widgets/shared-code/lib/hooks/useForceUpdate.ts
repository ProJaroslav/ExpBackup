import { React } from "jimu-core";

/** - Hook poskytujicí funkci, která vyvolá rerender komponenty. */
export default function() {
    return React.useReducer(bool => !bool, false)[1];
}