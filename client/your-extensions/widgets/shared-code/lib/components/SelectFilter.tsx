import { Immutable, React, ReactDOM } from "jimu-core";
import { Select, Option, TextInput, MultiSelectProps, MultiSelect } from "jimu-ui";
import { useForceUpdate } from "widgets/shared-code/hooks"; 
import { CalciteLoader } from "calcite-components";
import "./SelectFilter.scss";

/** - Čísleník s možností filtrace. */
export default function(props: HSI.SelectFilter.ISelectFilterProps | HSI.SelectFilter.IMultiSelectFilterProps) {
    /** - Hodnota podle které se filtruje. */
    const [filter, setFilter] = React.useState<string>();
    const forceRender = useForceUpdate();
    const menuElementId = React.useMemo(() => Date.now().toString(), []);

    let options: Array<JSX.Element>;
    let items: MultiSelectProps['items'] = Immutable([]);

    if (Array.isArray(props.options)) {
        let optionsJson = [...props.options];

        if (filter) {
            const lowerFilter = filter.toLocaleLowerCase();
            optionsJson = optionsJson.filter(option => {
                if ("key" in option) {
                    return true;
                }
                if (typeof option.label !== "string") {
                    return false;
                }

                if (option.label.toLocaleLowerCase().includes(lowerFilter)) {
                    return true;
                }
                if (lowerFilter.includes(" ") && option.label.includes(" ")) {
                    let splitedFilter = lowerFilter.split(" ");
                    let splitedLabel = option.label.toLocaleLowerCase().split(" ");
                    let usedIndexes: Array<number> = [];
                    for (let filterPart of splitedFilter) {
                        let labelIndex = splitedLabel.findIndex((labelPart, index) => labelPart.includes(filterPart) && !usedIndexes.includes(index));
                        if (labelIndex === -1) {
                            return false;
                        }

                        usedIndexes.push(labelIndex);
                    }

                    return true;
                }
                
                return false;
            });
        }
        
        if (optionsJson.length > 500) {
            /** - Vybrané prvky v číselníku, které mají index vyšší než 500. */
            const optionsToKeep: typeof optionsJson = [];
            if (props.multiple && Array.isArray(props.selectProps.values) && props.selectProps.values.length > 0) {
                for (let index = 500; index < optionsJson.length; index++) {
                    if (props.selectProps.values.includes(optionsJson[index].value)) {
                        optionsToKeep.push(optionsJson[index]);
                    }
                }
            } else if (!props.multiple && !!(props as HSI.SelectFilter.ISelectFilterProps).selectProps.value) {
                let index = optionsJson.findIndex(option => option.value === (props as HSI.SelectFilter.ISelectFilterProps).selectProps.value);
                if (index !== -1) {
                    optionsToKeep.push(optionsJson[index]);
                }
            }
            optionsJson.length = 500; // Omezení délky číselníku na 500 prvků kvůli rychlosti vykreslování DOM. Pro zobrazení dalších záznamů je nutné použít filtr
            optionsJson.push(...optionsToKeep);
        }

        if (props.multiple) {
            items = Immutable(optionsJson
                .filter(option => "value" in option)
                .map((option: HSI.SelectFilter.ISelectFilterOption) => ({
                    value: option.value,
                    label: option.label
                })
            ));
        } else {
            options = optionsJson.map(option => {
                if ("key" in option) {
                    return <Option key={option.key} value={option.value} header={option.header} divider={option.divider}>{option.label}</Option>;
                } 
                return <Option key={option.value} value={option.value} >{option.display || option.label}</Option>;
            });
        }

    }

    /** - Textové pole pro filtraci obsahu. */
    const filterElement = <TextInput
        className="select-filter"
        size={props.filterSize || "default"}
        value={filter}
        autoFocus
        onChange={ev => setFilter(ev.target.value)}
        onMouseDown={ev => {
            ev.stopPropagation();
        }}
    />;

    const prefix = <>
        {props.prefixElements}
        {filterElement}
        {props.loading ? <CalciteLoader label="" /> : null}
    </>;
    

    if (props.multiple) {
        const menuElement = document.getElementById(menuElementId);
        let filterWrapper = document.getElementById(`wrapper-${menuElementId}`);

        if (menuElement && !filterWrapper) {
            filterWrapper = document.createElement("div");
            filterWrapper.id = `wrapper-${menuElementId}`;
            filterWrapper.className = `multi-select-filter-wrapper`;
            menuElement.firstChild.insertBefore(filterWrapper, menuElement.firstChild.firstChild);
        }
        
        const selectProps: MultiSelectProps = {
            displayByValues(values) {
                return values.map(value => props.options.find(option => option.value == value)?.label).join(",");
            },
            ...props.selectProps,
            items,
            menuProps:{
                id: menuElementId
            },
            buttonProps: {
                onClick() {
                    setTimeout(forceRender, 100);
                }
            }
        };
        
        return <>
            {
                filterWrapper ? ReactDOM.createPortal(prefix, filterWrapper) : null
            }
            <MultiSelect {...selectProps} />
        </>;
    } else {
        return <Select {...props.selectProps} toggle={() => setFilter("")} >
            <Option header className="select-filter-option">{prefix}</Option>
            { props.nullable && !!props.selectProps.value ? <Option value={null}>--- Smazat hodnotu ---</Option> : null }
            {options}
        </Select>;
    }
}