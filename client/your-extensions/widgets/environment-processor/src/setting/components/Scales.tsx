import { React, utils } from 'jimu-core';
import { CollapsablePanel, Button, TextInput } from 'jimu-ui';
import { useMessageFormater } from "widgets/shared-code/hooks";
import { SettingRow, SettingSection } from 'jimu-ui/advanced/setting-components';
import translations from "../translations/default";
import { TrashOutlined } from 'jimu-icons/outlined/editor/trash';

export default function ({ config, updateConfig }: HSI.EnvironmentProcessorWidget.ISettingSubcomponentProps) {
    const messageFormater = useMessageFormater(translations);
    
    return <SettingSection>
        <CollapsablePanel label={messageFormater("scalesTitle")}>
            <SettingRow>
                <Button
                    size="sm"
                    onClick={() => {
                        updateConfig("scales", config.scales.concat({
                            id: utils.getUUID(),
                            label: ""
                        }));
                    }}
                >
                    {messageFormater("addScale")}
                </Button>
            </SettingRow>

            {
                config.scales.asMutable().map(({ label, id }) => {
                    return <SettingRow key={id}>
                        <TextInput value={label} onChange={ev => {
                            updateConfig("scales", config.scales.map(scale => {
                                if (scale.id === id) {
                                    return {
                                        id,
                                        label: ev.target.value
                                    };
                                }
                                return scale;
                            }));
                        }} />

                        <Button onClick={() => {
                            updateConfig("scales", config.scales.filter(scale => scale.id !== id))
                        }}>
                            <TrashOutlined style={{ margin: 0 }}/>
                        </Button>
                    </SettingRow>;
                })
            }
        </CollapsablePanel>

    </SettingSection>;
}