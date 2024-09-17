import { type LayoutItemConstructorProps, React, WidgetManager, WidgetType } from 'jimu-core';
import { CollapsablePanel, Button, TextInput, MultiSelect } from 'jimu-ui';
import { useMessageFormater } from "widgets/shared-code/hooks";
import { SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import translations from "../translations/default";
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash'
const { useEffect, useState } = React;

export default function ({ config, updateConfig, widgetName }: HSI.EnvironmentProcessorWidget.ISettingSubcomponentProps) {
    const messageFormater = useMessageFormater(translations);
    const [widgets, setWidgets] = useState<LayoutItemConstructorProps[]>([]);

    useEffect(() => {
        WidgetManager
            .getInstance()
            .getWidgetListInfo()
            .then(setWidgets);
    }, [setWidgets]);

    return <SettingSection>
        <CollapsablePanel label={messageFormater("environmentsTitle")}>
            <SettingRow>
                <Button
                    size="sm"
                    onClick={() => {
                        updateConfig("environments", config.environments.concat({
                            scales: [],
                            label: "",
                            hiddenWidgets: []
                        }));
                    }}
                >
                    {messageFormater("addEnvironment")}
                </Button>
            </SettingRow>

            {
                config.environments.asMutable().map(({ label, scales, hiddenWidgets }, index) => {
                    return <React.Fragment key={index}>
                        <SettingRow>
                            <TextInput value={label} onChange={ev => {
                                const environments = config.environments.asMutable({ deep: true });
                                environments[index].label = ev.target.value;
                                updateConfig("environments", environments);
                            }} />

                            <Button onClick={() => {
                                const environments = config.environments.asMutable({ deep: true });
                                environments.splice(index, 1);
                                updateConfig("environments", environments);
                            }}>
                                <TrashOutlined style={{ margin: 0 }}/>
                            </Button>
                        </SettingRow>
                        <CollapsablePanel label={messageFormater("scalesLabel")}>
                            <SettingRow>
                                <MultiSelect
                                    className="w-100"
                                    values={scales.map(({ id }) => id)}
                                    onClickItem={(ev, item: string, items: Array<string>) => {
                                        const environments = config.environments.asMutable({ deep: true });
                                        const newScales = scales.filter(scale => items.includes(scale.id)).asMutable({ deep: true });
                                        const newIds = items.filter(id => !newScales.some(sc => sc.id === id));
                                        newScales.push(...newIds.map(id => ({ id, itemId: "", hiddenWidgets: [] })));
                                        environments[index].scales = newScales;
                                        updateConfig("environments", environments);
                                    }}
                                    items={config.scales
                                        .map(({ id, label }) => ({
                                            label,
                                            value: id
                                        }))}
                                />
                            </SettingRow>

                            {
                                scales.map(({ id, itemId }) => {
                                    const scale = config.scales.find(scale => scale.id === id);
                                    return <SettingRow key={id} label={scale?.label}>
                                        <TextInput
                                            className='w-50'
                                            key={id}
                                            value={itemId}
                                            onChange={ev => {
                                                const environments = config.environments.asMutable({ deep: true });
                                                environments[index].scales.find(scale => scale.id === id).itemId = ev.target.value;
                                                updateConfig("environments", environments);
                                            }}
                                        />
                                    </SettingRow>;
                                })
                            }
                            
                            <SettingRow label={messageFormater("hiddenWidgets")}></SettingRow>
                            <SettingRow bottomLine>
                                <MultiSelect
                                    className="w-100"
                                    values={hiddenWidgets}
                                    onClickItem={(ev, item: string, items: Array<string>) => {
                                        const environments = config.environments.asMutable({ deep: true });
                                        environments[index].hiddenWidgets = items;
                                        updateConfig("environments", environments);
                                    }}
                                    items={widgets
                                        .filter(({ manifest, name }) => manifest.widgetType === WidgetType.Normal && name !== widgetName)
                                        .map(({ label, name }) => ({ label, value: name }))
                                    }
                                />
                            </SettingRow>
                            <br/>
                        </CollapsablePanel>
                    </React.Fragment>;
                })
            }
        </CollapsablePanel>

    </SettingSection>;
}