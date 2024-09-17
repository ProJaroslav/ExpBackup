import { React } from "jimu-core";
import { Label, Select, Option, TextInput, NumericInput } from "jimu-ui";

/** - Výber parametrů dotazu. */
export default function({ query, selectParameterValue, queryParametresValues }: HSI.LandTableWidget.IQueryParams) {
    if (!query) {
        return <></>;
    }

    return <div className="query-params">
        {
            query.Parameters.map(({ Caption, ChoiceValues, Name, IsRequired, Type }) => {
                let id = `${query.Name}_${Name}`;
                return <React.Fragment key={id}>
                    <Label check className={IsRequired ? "required" : ""} for={id} ><span>{Caption}:</span></Label>
                    {
                        function() {
                            const value = queryParametresValues[Name];
                            switch(Type) {
                                case "Choice":
                                    return <Select
                                        id={id}
                                        value={value}
                                        size="sm"
                                        onChange={ev => {
                                            selectParameterValue(Name, ev.target.value);
                                        }}
                                    >
                                        {
                                            ChoiceValues.map(({ Description, Value }) => {
                                                return <Option key={Value} value={Value}>{Description}</Option>;
                                            })
                                        }
                                    </Select>;
                                case "Numeric":
                                    return <NumericInput
                                        id={id}
                                        value={value}
                                        size="sm"
                                        onChange={newValue => {
                                            selectParameterValue(Name, newValue);
                                        }}
                                    />;
                                default:
                                    throw new Error(`Unhandled type parameter ${Type}`)
                                case "Text":
                                    return <TextInput
                                        id={id}
                                        value={value}
                                        size="sm"
                                        onChange={ev => {
                                            selectParameterValue(Name, ev.target.value);
                                        }}
                                    />;
                            }
                        }()
                    }
                </React.Fragment>;
            })
        }
    </div>;
}