import { React } from "jimu-core"
import { Loading, LoadingType } from "jimu-ui"

/**
 * - Obalení komponenty načtené pomocí {@link React.lazy} komponentou {@link React.Suspense}
 * - @see {@link https://reactjs.org/docs/code-splitting.html#reactlazy}.
 */
const Suspense: React.FunctionComponent<React.PropsWithChildren<{}>> = props => {
    return <React.Suspense fallback={<Loading type={LoadingType.Secondary} />} >
        {props.children}
    </React.Suspense>
}

export default Suspense;