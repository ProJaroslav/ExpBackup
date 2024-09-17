import { React, ImmutableObject, Immutable } from "jimu-core";

/**
 * - Předává konfiguraci widgetu poskytnutou jednou z rodičovských komponent.
 * @see {@link https://reactjs.org/docs/context.html}.
 */
export const ConfigContext = React.createContext<ImmutableObject<any>>(Immutable({}));

export default ConfigContext;