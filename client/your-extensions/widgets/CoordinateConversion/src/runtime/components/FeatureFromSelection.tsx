import { React } from "jimu-core";
import { Select, Option } from "jimu-ui";
import { useDisplayFeature, useHsiSelectionDictionary } from "widgets/shared-code/hooks";

/** - Výběr prvku z výběru. */
export default React.memo(React.forwardRef<IFeatureFromSelection, IFeatureFromSelectionProps>(function (props, ref) {
    /** - Slovník prvků ve výběru. */
    const selection = useHsiSelectionDictionary();
    /** - GisId vybraného prvku. */
    const [selectedFeatureGisId, selectFeature] = React.useState<string>();
    const displayFeature = useDisplayFeature({ formatKey: "withLayerTitle" });

    /** - Zajišzění, že vybraný prvek {@link selectedFeatureGisId} je ve výběru. */
    React.useEffect(() => {
        if (selectedFeatureGisId && !(selectedFeatureGisId in selection)) {
            selectFeature(null);
            props.onSelect(null);
        }
    });

    /** - Naplnění reference {@link ref} funckemi. */
    React.useImperativeHandle(ref, () => ({
        getSelectedFeature() {
            return selection[selectedFeatureGisId];
        }
    }));

    return <Select
        value={selectedFeatureGisId}
        size="sm"
        onChange={ev => {
            selectFeature(ev.target.value);
            props.onSelect(selection[ev.target.value]);
        }}
    >
        {
            Object.keys(selection).map(gisId => {
                return <Option
                    key={gisId}
                    value={gisId}
                >
                    {displayFeature(selection[gisId])}
                </Option>
            })
        }
    </Select>;
}));

interface IFeatureFromSelectionProps {
    /**
     * - Funkce se volá při výběru prvku.
     * - Funkce by měla být 'memoized' (např. pomocí {@link React.useCallback}), aby nedocházelo ke zbytečným rerenderům.
     * - [Read more...](https://reactjs.org/docs/hooks-reference.html#usecallback)
     */
    onSelect: (graphic: __esri.Graphic) => void;
}

export interface IFeatureFromSelection {
    /** - Poskytnutí vybraného prvku. */
    getSelectedFeature: () => __esri.Graphic;
}