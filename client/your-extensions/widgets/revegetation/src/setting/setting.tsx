import { React } from 'jimu-core';
import { CollapsablePanel, Button, TextInput, UrlInput } from 'jimu-ui';
import { type AllWidgetSettingProps } from 'jimu-for-builder';
import { WidgetSettingWrapper } from "widgets/shared-code/components";
import { useMessageFormater } from "widgets/shared-code/hooks";
import { SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import translations from "./translations/default";
import { ColorPicker } from 'jimu-ui/basic/color-picker';
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash';

function Setting({ config, onSettingChange, widgetId }: AllWidgetSettingProps<HSI.RevegetationWidget.IMConfig>) {
    const messageFormater = useMessageFormater(translations);

    return <>
        <SettingSection>
            <SettingRow label={messageFormater("highlight")}>
                <ColorPicker
                    color={config.highlightColor}
                    onChange={color => {
                        onSettingChange({
                            id: widgetId,
                            config: config.set("highlightColor", color)
                        });
                    }}
                />
            </SettingRow>
            <SettingRow label={messageFormater("searchUrlLabel")}></SettingRow>
            <SettingRow>
                <UrlInput
                    schemes={["https"]}
                    onChange={res => {
                        onSettingChange({
                            id: widgetId,
                            config: config.set("searchUrl", res.value)
                        });
                    }}
                    value={config.searchUrl}
                />
            </SettingRow>
            <SettingRow label={messageFormater("pasportizaceUrlLabel")}></SettingRow>
            <SettingRow>
                <UrlInput
                    schemes={["https"]}
                    onChange={res => {
                        onSettingChange({
                            id: widgetId,
                            config: config.set("pasportizaceQueryUrl", res.value)
                        });
                    }}
                    value={config.pasportizaceQueryUrl}
                />
            </SettingRow>
            <SettingRow label={messageFormater("workspaceId")}>
                <TextInput
                    className='w-50'
                    onChange={ev => {
                        onSettingChange({
                            id: widgetId,
                            config: config.set("workspaceId", ev.target.value)
                        });
                    }}
                    value={config.workspaceId}
                />
            </SettingRow>
        </SettingSection>
        <SettingSection>
            <CollapsablePanel label={messageFormater("querySettings")}>
                <SettingRow>
                    <Button
                        size="sm"
                        onClick={() => {
                            onSettingChange({
                                id: widgetId,
                                config: config.set("queries", config.queries.concat({ dataSet: "", domainAttribute: "", alias: "", pasportAttributes: [] }))
                            });
                        }}
                    >
                        {messageFormater("addQuery")}
                    </Button>
                </SettingRow>
                {
                    config.queries.map(({ alias, dataSet, domainAttribute, pasportAttributes }, index) => {
                        return <CollapsablePanel key={index} label={alias}>
                            <SettingRow label={messageFormater("dataset")}/>
                            <SettingRow>
                                <TextInput
                                    value={dataSet}
                                    onChange={ev => {
                                        const queries = config.queries.asMutable({ deep: true });
                                        queries[index].dataSet = ev.target.value;
                                        onSettingChange({
                                            id: widgetId,
                                            config: config.set("queries" , queries)
                                        })
                                    }}
                                />
                            </SettingRow>
                            <SettingRow label={messageFormater("alias")}/>
                            <SettingRow>
                                <TextInput
                                    value={alias}
                                    onChange={ev => {
                                        const queries = config.queries.asMutable({ deep: true });
                                        queries[index].alias = ev.target.value;
                                        onSettingChange({
                                            id: widgetId,
                                            config: config.set("queries" , queries)
                                        })
                                    }}
                                />
                            </SettingRow>
                            <SettingRow label={messageFormater("domainField")}/>
                            <SettingRow>
                                <TextInput
                                    value={domainAttribute}
                                    onChange={ev => {
                                        const queries = config.queries.asMutable({ deep: true });
                                        queries[index].domainAttribute = ev.target.value;
                                        onSettingChange({
                                            id: widgetId,
                                            config: config.set("queries" , queries)
                                        })
                                    }}
                                />
                            </SettingRow>
                            <CollapsablePanel label={messageFormater("pasportAttributes")}>
                                <SettingRow>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            const queries = config.queries.asMutable({ deep: true });
                                            queries[index].pasportAttributes.push("");
                                            onSettingChange({
                                                id: widgetId,
                                                config: config.set("queries", queries)
                                            });
                                        }}
                                    >
                                        {messageFormater("addAttribute")}
                                    </Button>
                                </SettingRow>
                                {
                                    pasportAttributes.map((attribute, i) => {
                                        return <SettingRow key={index}>
                                            <TextInput
                                                value={attribute}
                                                onChange={ev => {
                                                    const queries = config.queries.asMutable({ deep: true });
                                                    queries[index].pasportAttributes[i] = ev.target.value;
                                                    onSettingChange({
                                                        id: widgetId,
                                                        config: config.set("queries", queries)
                                                    });
                                                }}
                                            />
                                            <Button
                                                type='danger'
                                                onClick={() => {
                                                    const queries = config.queries.asMutable({ deep: true });
                                                    queries[index].pasportAttributes.splice(i, 1);
                                                    onSettingChange({
                                                        id: widgetId,
                                                        config: config.set("queries", queries)
                                                    });
                                                }}
                                            >
                                                <TrashOutlined/>
                                            </Button>
                                        </SettingRow>;
                                    })
                                }
                            </CollapsablePanel>
                            <SettingRow>
                                <Button
                                    size="sm"
                                    type='danger'
                                    onClick={() => {
                                        const queries = config.queries.asMutable({ deep: true });
                                        queries.splice(index, 1);
                                        onSettingChange({
                                            id: widgetId,
                                            config: config.set("queries", queries)
                                        })
                                    }}
                                >
                                    {messageFormater("remove")}
                                </Button>
                            </SettingRow>
                        </CollapsablePanel>;
                    })
                }
            </CollapsablePanel>
        </SettingSection>
    </>;
}

export default WidgetSettingWrapper(Setting, { permissionSettings: true });