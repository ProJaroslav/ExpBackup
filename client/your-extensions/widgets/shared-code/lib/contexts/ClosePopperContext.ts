import { React } from "jimu-core";

/**
 * - Předává funkci zavírajicí Popper (kontextová nabídka).
 * @see {@link https://reactjs.org/docs/context.html}.
 */
export const ClosePopperContext = React.createContext<() => void>(() => {});

export default ClosePopperContext;