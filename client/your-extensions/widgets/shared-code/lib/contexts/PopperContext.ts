import { React } from "jimu-core";

/**
 * - Předává funkci vyvolávajicí Popper (kontextová nabídka).
 * @see {@link https://reactjs.org/docs/context.html}.
 */
export const PopperContext = React.createContext<(params: HSI.IPopperParams) => void>(() => {
    console.warn("Popper is not implemented!");
});

export default PopperContext;