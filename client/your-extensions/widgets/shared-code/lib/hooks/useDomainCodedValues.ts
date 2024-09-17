import { React } from "jimu-core";
import { JimuMapViewContext } from "widgets/shared-code/contexts";
import { ContingentValuesHandler, DependencyLayersHandler, SpatialFilterHandler, CodedValuesHandlerBase } from "widgets/shared-code/helpers";
import { ELoadStatus } from "widgets/shared-code/enums";

const defaultState: IState = {
    loadStatus: ELoadStatus.Pending,
    codedValues: []
}

/**
 * - Poskytuje doménové hodnoty, pro {@link field atribut} v {@link feature prvku}, zredukované podle hodnot ostatních atributů.
 * @param feature - Prvek pro jehož {@link field atribut} zjišťujeme doménové hodnoty.
 * @param field - Atribut pro který zjišťujeme doménové hodnoty.
 */
export default function(feature: __esri.Graphic, field: __esri.Field): IState {
    const [state, setState] = React.useState<IState>(defaultState);
    const jimuMapView = React.useContext(JimuMapViewContext);

    React.useEffect(() => {
        const abortController = new AbortController();

        /** - Objekty, které filtrují {@link state doménové hodnoty} na základě hodnot atributů {@link feature prvku}. */
        const codedValuesHandlers: Array<CodedValuesHandlerBase> = [
            new DependencyLayersHandler(jimuMapView, feature, field, abortController.signal),
            new ContingentValuesHandler(jimuMapView, feature, field, abortController.signal),
            new SpatialFilterHandler(jimuMapView, feature, field, abortController.signal)
        ];

        /** - Poslední hodnoty poskytnuté {@link codedValuesHandlers filtračními objekty}. */
        const lastCodedValuesStates: Array<HSI.CodedValuesHandler.ICodedValuesState> = [];

        /** - Aktualizace {@link state} spojením {@link lastCodedValuesStates výsledků} z {@link codedValuesHandlers filtračních objektů}. */
        function updateState() {
            if (!abortController.signal.aborted) {
                if (lastCodedValuesStates.every(lastCodedValuesState => !lastCodedValuesState || lastCodedValuesState.loadStatus === "no-filter" || lastCodedValuesState.loadStatus === ELoadStatus.Error)) {
                    setState({ loadStatus: ELoadStatus.Loaded, codedValues: codedValuesHandlers[0].codedValues });
                } else {
                    const newState: typeof state = { codedValues: null, loadStatus: ELoadStatus.Loaded, prefixElements: [] };
    
                    lastCodedValuesStates.forEach(codedValuesState => {
                        switch(codedValuesState.loadStatus) {
                            case ELoadStatus.Pending:
                                newState.loadStatus = ELoadStatus.Pending;
                                break;
    
                            case ELoadStatus.Error:
                                if (newState.loadStatus !== ELoadStatus.Pending) {
                                    newState.loadStatus = ELoadStatus.Error;
                                }
                                break;
    
                            case ELoadStatus.Loaded:
                                if (!Array.isArray(newState.codedValues)) {
                                    newState.codedValues = codedValuesState.codedValues;
                                } else {
                                    newState.codedValues = newState.codedValues.filter(codedValuesState.codedValues.includes)
                                }
                                break;
    
                            default:
                                break;
                        }

                        if (Array.isArray(newState.prefixElements)) {
                            if (Array.isArray(codedValuesState.prefixElements)) {
                                newState.prefixElements.push(...codedValuesState.prefixElements);
                            } else if (!!codedValuesState.prefixElements) {
                                newState.prefixElements.push(codedValuesState.prefixElements);
                            }
                        }

                    });
    
                    if (!Array.isArray(newState.codedValues)) {
                        newState.codedValues = [];
                    }
    
                    setState(newState);
                }
            }
        }

        codedValuesHandlers.forEach((CodedValuesHandler, index) => {
            CodedValuesHandler.execute(codedValuesState => {
                if (codedValuesState.loadStatus === ELoadStatus.Error) {
                    console.warn(codedValuesState.error);
                }
                lastCodedValuesStates[index] = codedValuesState;
                updateState();
            });
        });

        return function() {
            abortController.abort();
            setState(defaultState);
            codedValuesHandlers.forEach(CodedValuesHandler => CodedValuesHandler.destroy());
        }
    }, [feature, jimuMapView, field]);

    return state;
}

interface IState extends Pick<HSI.SelectFilter.ISelectFilterProps, "prefixElements"> {
    /** - Stav filtrace doménových hodnot. */
    loadStatus: ELoadStatus;
    /** - Vyfiltrované doménové hodnoty. */
    codedValues: Array<__esri.CodedValue>;
}