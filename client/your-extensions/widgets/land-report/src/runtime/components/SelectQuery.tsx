import { React } from "jimu-core";
import { SelectFilter } from "widgets/shared-code/components";
import { Label, Select, NumericInput, TextInput, Option } from "jimu-ui";
import { useMessageFormater } from "widgets/shared-code/hooks";
import translations from "../translations/default";

/** - Výber dotazu pozemků a jeho parametrů. */
export default function({ selectQuery, query, queries, selectParameterValue, queryParametresValues }: HSI.LandReportWidget.ISelectQuery) {
    const messageFormater = useMessageFormater(translations);

    return <div className="select-query-wrapper">
        <Label for="select-query">
            {messageFormater("selectQueryLabel")}
        </Label>
        <SelectFilter
            options={queries.map(({ Name, Description }) => ({
                label: Description,
                value: Name
            }))}            
            selectProps={{
                id: "select-query",
                size: "sm",
                value: query?.Name,
                onChange(ev) {
                    selectQuery(queries.find(({ Name }) => Name === ev.target.value));
                }
            }}
        />
        {
            function() {
                if (!Array.isArray(query?.Parameters)) {
                    return <></>;
                }

                return query.Parameters.map(({ Caption, ChoiceValues, Name, IsRequired, Type }) => {
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
                });
            }()
        }
    </div>;
}